import { prisma } from "@/server/db/prisma"
import { enqueueCallingTick } from "@/server/calling/engine"
import { requireActorId } from "@/server/auth/actor"
import type { CallStatus, CampaignStatus } from "@/domain/status"
import { isRetryableRecipientStatus } from "@/server/campaigns/command-center"

const RETRYABLE_STATUSES: CallStatus[] = ["FAILED", "NO_ANSWER", "BUSY"]

async function requireCampaign(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, name: true, status: true },
  })
  if (!campaign) {
    throw new Error("Campaign not found")
  }
  return campaign
}

export async function pauseCampaign(campaignId: string): Promise<void> {
  const campaign = await requireCampaign(campaignId)
  if (campaign.status !== "RUNNING" && campaign.status !== "QUEUED") {
    throw new Error("Only queued or running campaigns can be paused")
  }
  const actorId = await requireActorId()
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "PAUSED" },
  })
  await prisma.auditLog.create({
    data: {
      actorUserId: actorId,
      action: "campaign.paused",
      entityType: "campaign",
      entityId: campaignId,
      metadata: { name: campaign.name },
    },
  })
}

export async function resumeCampaign(campaignId: string): Promise<void> {
  const campaign = await requireCampaign(campaignId)
  if (campaign.status !== "PAUSED") {
    throw new Error("Only paused campaigns can resume")
  }
  const actorId = await requireActorId()
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "RUNNING" },
  })
  await prisma.auditLog.create({
    data: {
      actorUserId: actorId,
      action: "campaign.resumed",
      entityType: "campaign",
      entityId: campaignId,
      metadata: { name: campaign.name },
    },
  })
  enqueueCallingTick()
}

export async function cancelCampaign(campaignId: string): Promise<void> {
  const campaign = await requireCampaign(campaignId)
  const cancellable: CampaignStatus[] = ["RUNNING", "QUEUED", "PAUSED", "SCHEDULED"]
  if (!cancellable.includes(campaign.status)) {
    throw new Error("This campaign cannot be cancelled")
  }
  const actorId = await requireActorId()
  const openStatuses: CallStatus[] = [
    "PENDING",
    "QUEUED",
    "CALLING",
    "RINGING",
    "ANSWERED",
    "RETRYING",
  ]
  await prisma.campaignRecipient.updateMany({
    where: { campaignId, status: { in: openStatuses } },
    data: { status: "CANCELLED" },
  })
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "CANCELLED" },
  })
  await prisma.auditLog.create({
    data: {
      actorUserId: actorId,
      action: "campaign.cancelled",
      entityType: "campaign",
      entityId: campaignId,
      metadata: { name: campaign.name },
    },
  })
}

export async function retryFailedRecipients(campaignId: string): Promise<number> {
  const campaign = await requireCampaign(campaignId)
  if (campaign.status === "DRAFT" || campaign.status === "CANCELLED") {
    throw new Error("Unanswered and failed calls cannot be retried on this campaign")
  }
  const actorId = await requireActorId()
  const result = await prisma.campaignRecipient.updateMany({
    where: { campaignId, status: { in: RETRYABLE_STATUSES } },
    data: {
      status: "PENDING",
      nextAttemptAt: new Date(),
      attemptCount: 0,
    },
  })
  if (result.count === 0) {
    throw new Error("No unanswered, busy, or failed calls to retry")
  }
  if (campaign.status === "COMPLETED" || campaign.status === "FAILED") {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "QUEUED" },
    })
  }
  await prisma.auditLog.create({
    data: {
      actorUserId: actorId,
      action: "campaign.retry_started",
      entityType: "campaign",
      entityId: campaignId,
      metadata: { name: campaign.name, count: result.count },
    },
  })
  enqueueCallingTick()
  return result.count
}

export async function retryRecipient(campaignId: string, recipientId: string): Promise<void> {
  const campaign = await requireCampaign(campaignId)
  const recipient = await prisma.campaignRecipient.findUnique({
    where: { id: recipientId },
    select: { id: true, campaignId: true, status: true },
  })
  if (!recipient || recipient.campaignId !== campaignId) {
    throw new Error("Recipient not found")
  }
  if (!isRetryableRecipientStatus(recipient.status)) {
    throw new Error("Only unanswered, busy, or failed calls can be retried")
  }
  if (campaign.status === "DRAFT" || campaign.status === "CANCELLED") {
    throw new Error("Unanswered and failed calls cannot be retried on this campaign")
  }
  const actorId = await requireActorId()
  await prisma.campaignRecipient.update({
    where: { id: recipientId },
    data: {
      status: "PENDING",
      nextAttemptAt: new Date(),
      attemptCount: 0,
    },
  })
  await prisma.auditLog.create({
    data: {
      actorUserId: actorId,
      action: "campaign.recipient_retry",
      entityType: "campaign_recipient",
      entityId: recipientId,
      metadata: { campaignId },
    },
  })
  enqueueCallingTick()
}

export function buildAudienceCsv(
  rows: Array<{
    name: string
    phone: string
    status: string
    attempts: number
    duration: string
    lastAttempt: string
  }>,
): string {
  const header = "Recipient,Phone,Status,Attempts,Duration,Last Attempt"
  const body = rows.map((row) =>
    [
      csvCell(row.name),
      csvCell(row.phone),
      csvCell(row.status),
      String(row.attempts),
      csvCell(row.duration),
      csvCell(row.lastAttempt),
    ].join(","),
  )
  return [header, ...body].join("\n")
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`
  }
  return value
}
