import { formatDistanceToNow } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"

import type { CallStatus, CampaignStatus } from "@/domain/status"
import { requireActor } from "@/server/auth/actor"
import { describeActivity } from "./activity-copy"
import {
  computeLiveCampaign,
  type LiveCampaignCard,
} from "./compute-live-campaign"
import {
  computeOperationsSummary,
  formatAnswerRate,
  formatMinutesUsed,
  lagosDayBounds,
} from "./compute-operations-summary"
import { greetingFor, OPERATIONS_TIMEZONE } from "./greeting"
import { prisma } from "@/server/db/prisma"

const LIVE_STATUSES: CampaignStatus[] = ["QUEUED", "RUNNING", "PAUSED"]
const TERMINAL_STATUSES: CallStatus[] = [
  "COMPLETED",
  "NO_ANSWER",
  "BUSY",
  "FAILED",
  "CANCELLED",
]

export type RecentCampaignRow = {
  id: string
  name: string
  audience: string
  createdLabel: string
  recipients: number
  answerRate: string
  status: CampaignStatus
}

export type ActivityItem = {
  id: string
  copy: string
  relativeTime: string
}

export type DashboardData = {
  greeting: string
  subtitle: string
  kpis: {
    callsToday: string
    successfulCalls: string
    answerRate: string
    activeCampaigns: string
    minutesUsed: string
  }
  liveCampaigns: LiveCampaignCard[]
  recentCampaigns: RecentCampaignRow[]
  activity: ActivityItem[]
}

export type DashboardLoadResult =
  | { ok: true; data: DashboardData }
  | { ok: false; message: string }

export async function loadDashboard(): Promise<DashboardLoadResult> {
  try {
    const data = await getDashboardData()
    return { ok: true, data }
  } catch (error) {
    console.error("Dashboard load failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    })
    return {
      ok: false,
      message:
        "Unable to load operations data. Check that the database is available.",
    }
  }
}

export async function getDashboardData(now = new Date()): Promise<DashboardData> {
  const { start, end } = lagosDayBounds(now)
  const actor = await requireActor()
  const [liveCampaigns, recentCampaigns, attempts, auditLogs] =
    await Promise.all([
      prisma.campaign.findMany({
        where: { status: { in: LIVE_STATUSES } },
        include: {
          recipients: { select: { status: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.campaign.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          group: { select: { name: true } },
          recipients: { select: { status: true } },
        },
      }),
      prisma.callAttempt.findMany({
        where: {
          startedAt: {
            gte: start,
            lt: end,
          },
        },
        select: {
          status: true,
          startedAt: true,
          durationSeconds: true,
        },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          action: true,
          metadata: true,
          createdAt: true,
        },
      }),
    ])

  const summary = computeOperationsSummary({
    campaignStatuses: liveCampaigns.map((campaign) => campaign.status),
    attempts,
    now,
  })

  return {
    greeting: greetingFor({
      now,
      timeZone: OPERATIONS_TIMEZONE,
      name: actor.name,
    }),
    subtitle: "Here's what's happening across your voice campaigns.",
    kpis: {
      callsToday: String(summary.callsToday),
      successfulCalls: String(summary.successfulCalls),
      answerRate: formatAnswerRate(summary.answerRate),
      activeCampaigns: String(summary.activeCampaigns),
      minutesUsed: formatMinutesUsed(summary.minutesUsed),
    },
    liveCampaigns: liveCampaigns.map((campaign) =>
      computeLiveCampaign({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        startedAt: campaign.startedAt ?? campaign.createdAt,
        recipientStatuses: campaign.recipients.map((recipient) => recipient.status),
        now,
      }),
    ),
    recentCampaigns: recentCampaigns.map((campaign) => {
      const statuses = campaign.recipients.map((recipient) => recipient.status)
      return {
        id: campaign.id,
        name: campaign.name,
        audience: campaign.group?.name ?? "—",
        createdLabel: formatInTimeZone(
          campaign.createdAt,
          OPERATIONS_TIMEZONE,
          "d MMM yyyy",
        ),
        recipients: campaign.recipients.length,
        answerRate: formatAnswerRate(answerRateFromStatuses(statuses)),
        status: campaign.status,
      }
    }),
    activity: auditLogs.map((entry) => ({
      id: entry.id,
      copy: describeActivity({
        action: entry.action,
        metadata: entry.metadata,
      }),
      relativeTime: formatDistanceToNow(entry.createdAt, { addSuffix: true }),
    })),
  }
}

function answerRateFromStatuses(statuses: CallStatus[]): number | null {
  const terminal = statuses.filter((status) => TERMINAL_STATUSES.includes(status))
  const completed = terminal.filter((status) => status === "COMPLETED")
  if (terminal.length === 0) {
    return null
  }
  return completed.length / terminal.length
}
