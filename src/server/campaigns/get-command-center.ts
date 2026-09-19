import { formatInTimeZone } from "date-fns-tz"

import type { CallStatus, CampaignStatus } from "@/domain/status"
import { maskPhone } from "@/lib/phone"
import { OPERATIONS_TIMEZONE } from "@/server/dashboard/greeting"
import { prisma } from "@/server/db/prisma"
import {
  campaignActionAvailability,
  computeCampaignAnalytics,
  computeCampaignProgress,
  describeCallActivity,
  formatCallClock,
  parseAudienceFilter,
  parsePage,
  statusesForFilter,
  isRetryableRecipientStatus,
  retryableRecipientCount,
  type AudienceFilter,
  type CampaignActions,
  type CampaignAnalytics,
  type CampaignProgress,
} from "@/server/campaigns/command-center"

export const AUDIENCE_PAGE_SIZE = 20
export const ACTIVITY_LIMIT = 40

export type CommandCenterRecipient = {
  id: string
  name: string
  phone: string
  status: CallStatus
  attempts: number
  duration: string
  lastAttempt: string
  canRetry: boolean
}

export type CommandCenterActivity = {
  id: string
  title: string
  phone: string
  detail: string | null
  clock: string
}

export type CommandCenterData = {
  campaign: {
    id: string
    name: string
    description: string | null
    status: CampaignStatus
    timezone: string
    startedAt: Date | null
    isLive: boolean
  }
  progress: CampaignProgress
  analytics: CampaignAnalytics
  actions: CampaignActions
  activity: CommandCenterActivity[]
  audience: {
    filter: AudienceFilter
    query: string
    page: number
    pageSize: number
    total: number
    pageCount: number
    rows: CommandCenterRecipient[]
  }
}

export async function getCommandCenterData(
  campaignId: string,
  options: {
    filter?: string
    query?: string
    page?: string
  },
): Promise<CommandCenterData | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      timezone: true,
      startedAt: true,
    },
  })

  if (!campaign) {
    return null
  }

  const filter = parseAudienceFilter(options.filter)
  const query = (options.query ?? "").trim()
  const page = parsePage(options.page)

  const grouped = await prisma.campaignRecipient.groupBy({
    by: ["status"],
    where: { campaignId },
    _count: { status: true },
  })

  const statuses = grouped.flatMap((row) =>
    Array.from({ length: row._count.status }, () => row.status),
  )
  const progress = computeCampaignProgress(statuses)
  const failedCount = progress.failed
  const retryableCount = retryableRecipientCount(statuses)

  const [attemptStats, talkStats] = await Promise.all([
    prisma.campaignRecipient.aggregate({
      where: { campaignId },
      _avg: { attemptCount: true },
    }),
    prisma.callAttempt.aggregate({
      where: {
        campaignRecipient: { campaignId },
        status: "COMPLETED",
        durationSeconds: { not: null },
      },
      _avg: { durationSeconds: true },
    }),
  ])

  const analytics = computeCampaignAnalytics({
    statuses,
    talkDurations:
      talkStats._avg.durationSeconds === null
        ? []
        : [talkStats._avg.durationSeconds],
    attemptCounts:
      attemptStats._avg.attemptCount === null
        ? []
        : [attemptStats._avg.attemptCount],
  })

  const filterStatuses = statusesForFilter(filter)
  const searchDigits = query.replace(/[^\d+]/g, "")
  const audienceWhere = {
    campaignId,
    ...(filterStatuses ? { status: { in: filterStatuses } } : {}),
    ...(query
      ? {
          contact: {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              ...(searchDigits.length > 0
                ? [{ phoneE164: { contains: searchDigits } }]
                : []),
            ],
          },
        }
      : {}),
  }

  const totalRows = await prisma.campaignRecipient.count({ where: audienceWhere })
  const pageCount = Math.max(1, Math.ceil(totalRows / AUDIENCE_PAGE_SIZE))
  const safePage = Math.min(page, pageCount)

  const recipientRows = await prisma.campaignRecipient.findMany({
    where: audienceWhere,
    orderBy: [{ lastAttemptAt: "desc" }, { id: "asc" }],
    skip: (safePage - 1) * AUDIENCE_PAGE_SIZE,
    take: AUDIENCE_PAGE_SIZE,
    include: {
      contact: { select: { name: true, phoneE164: true } },
      attempts: {
        orderBy: { attemptNumber: "desc" },
        take: 1,
        select: { durationSeconds: true },
      },
    },
  })

  const attemptRows = await prisma.callAttempt.findMany({
    where: {
      campaignRecipient: { campaignId },
    },
    orderBy: [{ completedAt: "desc" }, { startedAt: "desc" }],
    take: ACTIVITY_LIMIT,
    include: {
      campaignRecipient: {
        include: {
          contact: { select: { phoneE164: true } },
        },
      },
    },
  })

  const activity = attemptRows.flatMap((attempt) => {
    const occurredAt = attempt.completedAt ?? attempt.startedAt
    if (!occurredAt) {
      return []
    }
    return [
      {
        id: attempt.id,
        ...describeCallActivity({
          status: attempt.status,
          occurredAt,
          phoneE164: attempt.campaignRecipient.contact.phoneE164,
          durationSeconds: attempt.durationSeconds,
        }),
      },
    ]
  })

  return {
    campaign: {
      ...campaign,
      isLive:
        campaign.status === "RUNNING" ||
        campaign.status === "QUEUED" ||
        campaign.status === "PAUSED",
    },
    progress,
    analytics,
    actions: campaignActionAvailability({
      status: campaign.status,
      failedCount,
      retryableCount,
      recipientCount: progress.total,
    }),
    activity,
    audience: {
      filter,
      query,
      page: safePage,
      pageSize: AUDIENCE_PAGE_SIZE,
      total: totalRows,
      pageCount,
      rows: recipientRows.map((row) => ({
        id: row.id,
        name: row.contact.name,
        phone: maskPhone(row.contact.phoneE164),
        status: row.status,
        attempts: row.attemptCount,
        duration:
          row.attempts[0]?.durationSeconds != null
            ? formatCallClock(row.attempts[0].durationSeconds)
            : "—",
        lastAttempt: row.lastAttemptAt
          ? formatInTimeZone(
              row.lastAttemptAt,
              campaign.timezone || OPERATIONS_TIMEZONE,
              "d MMM h:mm a",
            )
          : "—",
        canRetry: isRetryableRecipientStatus(row.status),
      })),
    },
  }
}

export { parseAudienceFilter }
