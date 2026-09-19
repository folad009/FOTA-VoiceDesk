import "server-only"

import { Prisma } from "@prisma/client"

import {
  canClaimRecipient,
  campaignStatusWhenQueueEmpty,
  isWithinCallingHours,
  nextCallingWindowStart,
  nextDialDelayOk,
} from "@/server/calling/eligibility"
import { getTwilioFromNumber } from "@/lib/twilio/client"
import { createOutboundCall } from "@/lib/twilio/voice"
import { getTwilioWebhookBaseUrl, handleCallStatus } from "@/lib/twilio/webhooks"
import { prisma } from "@/server/db/prisma"
import { clonedSpeechPlan } from "@/server/voice/clone"
import { generateClonedSpeech } from "@/server/voice/generate"
import { spokenScriptForContact } from "@/server/voice/script"

const DEFAULT_BATCH = 5
const STUCK_QUEUED_MS = 15_000
const STALE_IN_FLIGHT_MS = 15 * 60_000

export type ProcessDueCallsResult = {
  promoted: number
  recovered: number
  claimed: number
  dialed: number
  skipped: number
  errors: string[]
}

type ClaimedRecipient = {
  recipientId: string
  attemptId: string
  campaignId: string
  phoneE164: string
  voicemailBehavior: "NONE" | "LEAVE_MESSAGE" | "HANGUP_ON_MACHINE"
  minDelayBetweenCallsMs: number
}

export async function processDueCalls(options?: {
  now?: Date
  limit?: number
}): Promise<ProcessDueCallsResult> {
  const now = options?.now ?? new Date()
  const limit = options?.limit ?? DEFAULT_BATCH
  const result: ProcessDueCallsResult = {
    promoted: 0,
    recovered: 0,
    claimed: 0,
    dialed: 0,
    skipped: 0,
    errors: [],
  }

  result.promoted = await promoteScheduledCampaigns(now)
  result.recovered = await recoverStuckClaims(now)

  const maxLookups = Math.max(limit * 8, 8)
  for (let lookup = 0; lookup < maxLookups && result.claimed < limit; lookup += 1) {
    const claimed = await claimNextRecipient(now)
    if (!claimed) {
      break
    }
    if (claimed === "deferred") {
      result.skipped += 1
      continue
    }
    result.claimed += 1
    try {
      await placeCall(claimed)
      result.dialed += 1
      if (claimed.minDelayBetweenCallsMs > 0 && result.claimed < limit) {
        await wait(claimed.minDelayBetweenCallsMs)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Call placement failed"
      result.errors.push(message)
      await failClaim(claimed, message, now)
    }
  }

  return result
}

export function enqueueCallingTick(): void {
  void processDueCalls().catch((error) => {
    console.error("[calling.engine] tick failed", error)
  })
}

async function promoteScheduledCampaigns(now: Date): Promise<number> {
  const due = await prisma.campaign.findMany({
    where: {
      status: "SCHEDULED",
      schedules: { some: { scheduledFor: { lte: now } } },
    },
    select: { id: true },
  })
  if (due.length === 0) {
    return 0
  }
  await prisma.campaign.updateMany({
    where: { id: { in: due.map((row) => row.id) } },
    data: { status: "QUEUED", startedAt: now },
  })
  return due.length
}

async function recoverStuckClaims(now: Date): Promise<number> {
  let recovered = 0
  const queuedStuck = await prisma.callAttempt.findMany({
    where: {
      twilioCallSid: null,
      status: { in: ["PENDING", "QUEUED"] },
      startedAt: { lte: new Date(now.getTime() - STUCK_QUEUED_MS) },
      campaignRecipient: {
        status: "QUEUED",
        campaign: { status: { in: ["QUEUED", "RUNNING"] } },
      },
    },
    include: {
      campaignRecipient: {
        include: {
          contact: { select: { phoneE164: true } },
          campaign: {
            select: {
              id: true,
              voicemailBehavior: true,
              minDelayBetweenCallsMs: true,
              maxAttempts: true,
              retryDelayMinutes: true,
            },
          },
        },
      },
    },
    take: DEFAULT_BATCH,
  })

  for (const attempt of queuedStuck) {
    const claimed: ClaimedRecipient = {
      recipientId: attempt.campaignRecipientId,
      attemptId: attempt.id,
      campaignId: attempt.campaignRecipient.campaign.id,
      phoneE164: attempt.campaignRecipient.contact.phoneE164,
      voicemailBehavior: attempt.campaignRecipient.campaign.voicemailBehavior,
      minDelayBetweenCallsMs: attempt.campaignRecipient.campaign.minDelayBetweenCallsMs,
    }
    try {
      await placeCall(claimed)
      recovered += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : "Stuck call recovery failed"
      await failClaim(claimed, message, now)
    }
  }

  const stale = await prisma.callAttempt.findMany({
    where: {
      status: { in: ["QUEUED", "CALLING", "RINGING"] },
      startedAt: { lte: new Date(now.getTime() - STALE_IN_FLIGHT_MS) },
      campaignRecipient: {
        status: { in: ["QUEUED", "CALLING", "RINGING"] },
      },
    },
    include: {
      campaignRecipient: {
        include: {
          campaign: {
            select: { maxAttempts: true, retryDelayMinutes: true },
          },
        },
      },
    },
    take: DEFAULT_BATCH,
  })

  for (const attempt of stale) {
    await failAttemptAndMaybeRetry({
      attemptId: attempt.id,
      recipientId: attempt.campaignRecipientId,
      campaignId: attempt.campaignRecipient.campaignId,
      attemptCount: attempt.campaignRecipient.attemptCount,
      maxAttempts: attempt.campaignRecipient.campaign.maxAttempts,
      retryDelayMinutes: attempt.campaignRecipient.campaign.retryDelayMinutes,
      reason: "Call timed out waiting for Twilio status",
      now,
    })
    recovered += 1
  }

  return recovered
}

async function claimNextRecipient(now: Date): Promise<ClaimedRecipient | "deferred" | null> {
  try {
    return await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT cr.id
        FROM "CampaignRecipient" cr
        INNER JOIN "Campaign" c ON c.id = cr."campaignId"
        WHERE c.status IN ('QUEUED', 'RUNNING')
          AND cr.status IN ('PENDING', 'RETRYING')
          AND (cr."nextAttemptAt" IS NULL OR cr."nextAttemptAt" <= ${now})
        ORDER BY cr."nextAttemptAt" ASC NULLS FIRST, cr.id ASC
        LIMIT 1
        FOR UPDATE OF cr SKIP LOCKED
      `)

      const recipientId = rows[0]?.id
      if (!recipientId) {
        return null
      }

      const recipient = await tx.campaignRecipient.findUnique({
        where: { id: recipientId },
        include: {
          contact: { select: { phoneE164: true, isActive: true } },
          campaign: true,
        },
      })
      if (!recipient) {
        return null
      }

      if (
        !canClaimRecipient({
          recipientStatus: recipient.status,
          campaignStatus: recipient.campaign.status,
          nextAttemptAt: recipient.nextAttemptAt,
          now,
        })
      ) {
        return "deferred"
      }

      if (
        !isWithinCallingHours({
          now,
          timezone: recipient.campaign.timezone,
          startMinutes: recipient.campaign.callingHoursStartMinutes,
          endMinutes: recipient.campaign.callingHoursEndMinutes,
        })
      ) {
        await deferDueRecipients(tx, {
          campaignId: recipient.campaignId,
          now,
          nextAttemptAt: nextCallingWindowStart({
            now,
            timezone: recipient.campaign.timezone,
            startMinutes: recipient.campaign.callingHoursStartMinutes,
          }),
        })
        return "deferred"
      }

      const lastAttempt = await tx.callAttempt.findFirst({
        where: {
          campaignRecipient: { campaignId: recipient.campaignId },
          startedAt: { not: null },
        },
        orderBy: { startedAt: "desc" },
        select: { startedAt: true },
      })
      if (
        !nextDialDelayOk({
          lastStartedAt: lastAttempt?.startedAt ?? null,
          minDelayBetweenCallsMs: recipient.campaign.minDelayBetweenCallsMs,
          now,
        })
      ) {
        const startedAt = lastAttempt?.startedAt ?? now
        await deferDueRecipients(tx, {
          campaignId: recipient.campaignId,
          now,
          nextAttemptAt: new Date(
            startedAt.getTime() + recipient.campaign.minDelayBetweenCallsMs,
          ),
        })
        return "deferred"
      }

      if (!recipient.contact.isActive) {
        await tx.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: "FAILED" },
        })
        return "deferred"
      }

      const updated = await tx.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "QUEUED",
          attemptCount: { increment: 1 },
          lastAttemptAt: now,
          nextAttemptAt: null,
        },
        select: { attemptCount: true },
      })

      const attempt = await tx.callAttempt.create({
        data: {
          campaignRecipientId: recipient.id,
          attemptNumber: updated.attemptCount,
          status: "QUEUED",
          startedAt: now,
        },
        select: { id: true },
      })

      if (recipient.campaign.status === "QUEUED") {
        await tx.campaign.update({
          where: { id: recipient.campaignId },
          data: { status: "RUNNING", startedAt: recipient.campaign.startedAt ?? now },
        })
      }

      return {
        recipientId: recipient.id,
        attemptId: attempt.id,
        campaignId: recipient.campaignId,
        phoneE164: recipient.contact.phoneE164,
        voicemailBehavior: recipient.campaign.voicemailBehavior,
        minDelayBetweenCallsMs: recipient.campaign.minDelayBetweenCallsMs,
      }
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return null
    }
    throw error
  }
}

async function placeCall(claimed: ClaimedRecipient): Promise<void> {
  await attachClonedAudio(claimed.attemptId)
  const baseUrl = getTwilioWebhookBaseUrl()
  const result = await createOutboundCall({
    to: claimed.phoneE164,
    from: getTwilioFromNumber(),
    url: `${baseUrl}/api/twilio/voice?attempt=${claimed.attemptId}`,
    statusCallback: `${baseUrl}/api/twilio/status?attempt=${claimed.attemptId}`,
    statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    idempotencyKey: claimed.attemptId,
    machineDetection: claimed.voicemailBehavior !== "NONE",
  })

  await prisma.$transaction(async (tx) => {
    const recipient = await tx.campaignRecipient.findUnique({
      where: { id: claimed.recipientId },
      select: { status: true },
    })
    await tx.callAttempt.update({
      where: { id: claimed.attemptId },
      data: {
        twilioCallSid: result.sid,
        status: recipient?.status === "CANCELLED" ? "CANCELLED" : "CALLING",
      },
    })
    if (recipient?.status === "QUEUED") {
      await tx.campaignRecipient.update({
        where: { id: claimed.recipientId },
        data: { status: "CALLING" },
      })
    }
  })

  if (result.mocked && process.env.TWILIO_MOCK_PROGRESS !== "false") {
    await simulateMockCallProgress(result.sid)
  }
}

async function attachClonedAudio(attemptId: string): Promise<void> {
  const attempt = await prisma.callAttempt.findUnique({
    where: { id: attemptId },
    include: {
      campaignRecipient: {
        include: {
          contact: { select: { name: true } },
          campaign: {
            include: {
              voiceMessage: {
                include: { voiceProfile: true },
              },
            },
          },
        },
      },
    },
  })
  const message = attempt?.campaignRecipient.campaign.voiceMessage
  if (!attempt || !message) {
    return
  }
  const plan = clonedSpeechPlan({
    kind: message.kind,
    voiceProfileId: message.voiceProfileId,
    includeRecipientName: message.includeRecipientName,
  })
  if (plan === "none") {
    return
  }
  if (plan === "shared" && message.mediaUrl) {
    return
  }
  const profile = message.voiceProfile
  if (!profile) {
    throw new Error("Cloned voice is missing")
  }
  const text = spokenScriptForContact(
    message.ttsText ?? "",
    attempt.campaignRecipient.contact.name,
    message.includeRecipientName,
  )
  const generated = await generateClonedSpeech({
    elevenLabsVoiceId: profile.elevenLabsVoiceId,
    text,
  })
  await prisma.callAttempt.update({
    where: { id: attemptId },
    data: { generatedMediaUrl: generated.mediaUrl },
  })
}

async function simulateMockCallProgress(callSid: string): Promise<void> {
  const outcome = (process.env.TWILIO_MOCK_OUTCOME ?? "completed").toLowerCase()
  await handleCallStatus({
    CallSid: callSid,
    CallStatus: "initiated",
    SequenceNumber: "1",
  })
  await handleCallStatus({
    CallSid: callSid,
    CallStatus: "ringing",
    SequenceNumber: "2",
  })

  if (outcome === "no-answer") {
    await handleCallStatus({
      CallSid: callSid,
      CallStatus: "no-answer",
      SequenceNumber: "3",
    })
    return
  }
  if (outcome === "busy") {
    await handleCallStatus({
      CallSid: callSid,
      CallStatus: "busy",
      SequenceNumber: "3",
    })
    return
  }
  if (outcome === "failed") {
    await handleCallStatus({
      CallSid: callSid,
      CallStatus: "failed",
      SequenceNumber: "3",
      ErrorMessage: "Mock provider failed the call",
    })
    return
  }

  await handleCallStatus({
    CallSid: callSid,
    CallStatus: "in-progress",
    SequenceNumber: "3",
  })
  await handleCallStatus({
    CallSid: callSid,
    CallStatus: "completed",
    CallDuration: "12",
    SequenceNumber: "4",
  })
}

async function failClaim(
  claimed: ClaimedRecipient,
  reason: string,
  now: Date,
): Promise<void> {
  const recipient = await prisma.campaignRecipient.findUnique({
    where: { id: claimed.recipientId },
    include: {
      campaign: { select: { maxAttempts: true, retryDelayMinutes: true } },
    },
  })
  if (!recipient) {
    return
  }
  await failAttemptAndMaybeRetry({
    attemptId: claimed.attemptId,
    recipientId: claimed.recipientId,
    campaignId: claimed.campaignId,
    attemptCount: recipient.attemptCount,
    maxAttempts: recipient.campaign.maxAttempts,
    retryDelayMinutes: recipient.campaign.retryDelayMinutes,
    reason,
    now,
  })
}

async function failAttemptAndMaybeRetry(input: {
  attemptId: string
  recipientId: string
  campaignId: string
  attemptCount: number
  maxAttempts: number
  retryDelayMinutes: number
  reason: string
  now: Date
}): Promise<void> {
  const shouldRetry = input.attemptCount < input.maxAttempts
  await prisma.$transaction([
    prisma.callAttempt.update({
      where: { id: input.attemptId },
      data: {
        status: "FAILED",
        failureReason: input.reason,
        completedAt: input.now,
      },
    }),
    prisma.campaignRecipient.update({
      where: { id: input.recipientId },
      data: {
        status: shouldRetry ? "RETRYING" : "FAILED",
        nextAttemptAt: shouldRetry
          ? new Date(input.now.getTime() + input.retryDelayMinutes * 60_000)
          : null,
      },
    }),
  ])

  if (!shouldRetry) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: input.campaignId },
      select: { status: true },
    })
    if (campaign?.status !== "QUEUED" && campaign?.status !== "RUNNING") {
      return
    }
    const openCount = await prisma.campaignRecipient.count({
      where: {
        campaignId: input.campaignId,
        status: {
          in: ["PENDING", "QUEUED", "CALLING", "RINGING", "ANSWERED", "RETRYING"],
        },
      },
    })
    if (openCount === 0) {
      const [total, failed] = await Promise.all([
        prisma.campaignRecipient.count({ where: { campaignId: input.campaignId } }),
        prisma.campaignRecipient.count({
          where: { campaignId: input.campaignId, status: "FAILED" },
        }),
      ])
      await prisma.campaign.update({
        where: { id: input.campaignId },
        data: {
          status: campaignStatusWhenQueueEmpty(
            failed === total && total > 0 ? ["FAILED"] : ["COMPLETED"],
          ),
        },
      })
    }
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function deferDueRecipients(
  tx: Prisma.TransactionClient,
  input: { campaignId: string; now: Date; nextAttemptAt: Date },
): Promise<void> {
  await tx.campaignRecipient.updateMany({
    where: {
      campaignId: input.campaignId,
      status: { in: ["PENDING", "RETRYING"] },
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: input.now } }],
    },
    data: { nextAttemptAt: input.nextAttemptAt },
  })
}
