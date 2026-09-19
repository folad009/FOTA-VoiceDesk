import type { CallStatus, CampaignStatus } from "@/domain/status"
import { campaignStatuses } from "@/domain/status"
import {
  campaignTypeLabels,
  campaignTypes,
  type CampaignType,
} from "@/server/campaigns/wizard-draft"
import { prisma } from "@/server/db/prisma"
import {
  computeCampaignAnalyticsReport,
  parseAnalyticsRange,
  type AnalyticsAttempt,
  type AnalyticsRange,
  type AnalyticsReport,
} from "@/server/analytics/compute"

export type AnalyticsCampaignOption = {
  id: string
  name: string
}

export type AnalyticsFilters = {
  from: string
  to: string
  campaignId: string
  campaignType: string
  campaignStatus: string
}

export type AnalyticsPageData = {
  filters: AnalyticsFilters
  range: AnalyticsRange
  campaigns: AnalyticsCampaignOption[]
  report: AnalyticsReport
  hasCalls: boolean
}

export function parseAnalyticsFilters(
  searchParams: {
    from?: string
    to?: string
    campaign?: string
    type?: string
    status?: string
  },
  now = new Date(),
): AnalyticsFilters & { range: AnalyticsRange } {
  const range = parseAnalyticsRange({
    from: searchParams.from,
    to: searchParams.to,
    now,
  })
  const campaignType = campaignTypes.includes(searchParams.type as CampaignType)
    ? (searchParams.type as string)
    : ""
  const campaignStatus = campaignStatuses.includes(searchParams.status as CampaignStatus)
    ? (searchParams.status as string)
    : ""

  return {
    from: range.fromKey,
    to: range.toKey,
    campaignId: searchParams.campaign?.trim() ?? "",
    campaignType,
    campaignStatus,
    range,
  }
}

export async function getAnalyticsPageData(
  searchParams: {
    from?: string
    to?: string
    campaign?: string
    type?: string
    status?: string
  },
  now = new Date(),
): Promise<AnalyticsPageData> {
  const loaded = await loadAnalyticsAttempts(searchParams, now)
  const report = computeCampaignAnalyticsReport({
    attempts: loaded.attempts,
    range: loaded.range,
  })

  return {
    filters: loaded.filters,
    range: loaded.range,
    campaigns: loaded.campaigns,
    report,
    hasCalls: report.kpis.totalCalls > 0,
  }
}

export async function loadAnalyticsAttempts(
  searchParams: {
    from?: string
    to?: string
    campaign?: string
    type?: string
    status?: string
  },
  now = new Date(),
): Promise<{
  filters: AnalyticsFilters
  range: AnalyticsRange
  campaigns: AnalyticsCampaignOption[]
  attempts: AnalyticsAttempt[]
}> {
  const parsed = parseAnalyticsFilters(searchParams, now)
  const [campaigns, attempts] = await Promise.all([
    prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, name: true },
    }),
    prisma.callAttempt.findMany({
      where: {
        startedAt: { gte: parsed.range.from, lt: parsed.range.to },
        campaignRecipient: {
          campaign: {
            ...(parsed.campaignId ? { id: parsed.campaignId } : {}),
            ...(parsed.campaignType
              ? { type: parsed.campaignType as CampaignType }
              : {}),
            ...(parsed.campaignStatus
              ? { status: parsed.campaignStatus as CampaignStatus }
              : {}),
          },
        },
      },
      select: {
        attemptNumber: true,
        status: true,
        startedAt: true,
        durationSeconds: true,
        campaignRecipient: {
          select: {
            id: true,
            campaign: {
              select: { id: true, name: true, type: true, status: true },
            },
          },
        },
      },
      orderBy: { startedAt: "asc" },
    }),
  ])

  return {
    filters: {
      from: parsed.from,
      to: parsed.to,
      campaignId: parsed.campaignId,
      campaignType: parsed.campaignType,
      campaignStatus: parsed.campaignStatus,
    },
    range: parsed.range,
    campaigns,
    attempts: attempts.map((attempt) => ({
      campaignId: attempt.campaignRecipient.campaign.id,
      campaignName: attempt.campaignRecipient.campaign.name,
      campaignType: attempt.campaignRecipient.campaign.type,
      campaignStatus: attempt.campaignRecipient.campaign.status,
      recipientId: attempt.campaignRecipient.id,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status as CallStatus,
      startedAt: attempt.startedAt,
      durationSeconds: attempt.durationSeconds,
    })),
  }
}

export { campaignTypeLabels, campaignTypes }
