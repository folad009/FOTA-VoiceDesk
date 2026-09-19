import type { CallStatus, CampaignStatus } from "@/domain/status"
import { maskPhone } from "@/lib/phone"
import { OPERATIONS_TIMEZONE } from "@/server/dashboard/greeting"
import { formatInTimeZone } from "date-fns-tz"

export const audienceFilters = [
  "all",
  "pending",
  "calling",
  "answered",
  "no_answer",
  "busy",
  "failed",
] as const

export type AudienceFilter = (typeof audienceFilters)[number]

export const audienceFilterLabels: Record<AudienceFilter, string> = {
  all: "All",
  pending: "Pending",
  calling: "Calling",
  answered: "Answered",
  no_answer: "No Answer",
  busy: "Busy",
  failed: "Failed",
}

const PENDING_STATUSES: CallStatus[] = [
  "PENDING",
  "QUEUED",
  "CALLING",
  "RINGING",
  "RETRYING",
]

const CALLING_STATUSES: CallStatus[] = ["CALLING", "RINGING"]
const ANSWERED_STATUSES: CallStatus[] = ["ANSWERED", "COMPLETED"]
const FAILED_STATUSES: CallStatus[] = ["FAILED"]
const RETRYABLE_RECIPIENT_STATUSES: CallStatus[] = ["FAILED", "NO_ANSWER", "BUSY"]

export type CampaignProgress = {
  total: number
  processed: number
  answered: number
  noAnswer: number
  busy: number
  failed: number
  pending: number
  calling: number
  progressPercent: number
}

export type CallActivityInput = {
  status: CallStatus
  occurredAt: Date
  phoneE164: string
  durationSeconds: number | null
}

export type CallActivityItem = {
  title: string
  phone: string
  detail: string | null
  clock: string
}

export type CampaignAnalytics = {
  answerRate: number | null
  failureRate: number | null
  averageTalkSeconds: number | null
  averageAttempts: number | null
}

export type CampaignActions = {
  canPause: boolean
  canResume: boolean
  canCancel: boolean
  canRetryFailed: boolean
  canExport: boolean
}

export function computeCampaignProgress(statuses: CallStatus[]): CampaignProgress {
  const total = statuses.length
  const answered = countStatuses(statuses, ANSWERED_STATUSES)
  const noAnswer = countStatuses(statuses, ["NO_ANSWER"])
  const busy = countStatuses(statuses, ["BUSY"])
  const failed = countStatuses(statuses, ["FAILED"])
  const calling = countStatuses(statuses, CALLING_STATUSES)
  const pending = countStatuses(statuses, PENDING_STATUSES)
  const processed = total - pending

  return {
    total,
    processed,
    answered,
    noAnswer,
    busy,
    failed,
    pending,
    calling,
    progressPercent: total === 0 ? 0 : round1((processed / total) * 100),
  }
}

export function formatProgressPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function matchesRecipientFilter(status: CallStatus, filter: AudienceFilter): boolean {
  switch (filter) {
    case "all":
      return true
    case "pending":
      return status === "PENDING" || status === "QUEUED" || status === "RETRYING"
    case "calling":
      return CALLING_STATUSES.includes(status)
    case "answered":
      return ANSWERED_STATUSES.includes(status)
    case "no_answer":
      return status === "NO_ANSWER"
    case "busy":
      return status === "BUSY"
    case "failed":
      return FAILED_STATUSES.includes(status)
  }
}

export function statusesForFilter(filter: AudienceFilter): CallStatus[] | null {
  if (filter === "all") {
    return null
  }
  return ( [
    "PENDING",
    "QUEUED",
    "CALLING",
    "RINGING",
    "ANSWERED",
    "COMPLETED",
    "NO_ANSWER",
    "BUSY",
    "FAILED",
    "CANCELLED",
    "RETRYING",
  ] as const).filter((status) => matchesRecipientFilter(status, filter))
}

export function describeCallActivity(input: CallActivityInput): CallActivityItem {
  return {
    title: activityTitle(input.status),
    phone: maskPhone(input.phoneE164),
    detail:
      input.status === "COMPLETED" && input.durationSeconds !== null
        ? `Duration: ${formatCallClock(input.durationSeconds)}`
        : null,
    clock: formatInTimeZone(input.occurredAt, OPERATIONS_TIMEZONE, "h:mm:ss a"),
  }
}

export function formatCallClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export function computeCampaignAnalytics(input: {
  statuses: CallStatus[]
  talkDurations: number[]
  attemptCounts: number[]
}): CampaignAnalytics {
  const { total, answered, failed } = computeCampaignProgress(input.statuses)
  return {
    answerRate: total === 0 ? null : round1((answered / total) * 100),
    failureRate: total === 0 ? null : round1((failed / total) * 100),
    averageTalkSeconds:
      input.talkDurations.length === 0
        ? null
        : Math.round(
            input.talkDurations.reduce((sum, value) => sum + value, 0) /
              input.talkDurations.length,
          ),
    averageAttempts:
      input.attemptCounts.length === 0
        ? null
        : round1(
            input.attemptCounts.reduce((sum, value) => sum + value, 0) /
              input.attemptCounts.length,
          ),
  }
}

export function isRetryableRecipientStatus(status: CallStatus): boolean {
  return RETRYABLE_RECIPIENT_STATUSES.includes(status)
}

export function retryableRecipientCount(statuses: CallStatus[]): number {
  return statuses.filter((status) => isRetryableRecipientStatus(status)).length
}

export function campaignActionAvailability(input: {
  status: CampaignStatus
  failedCount: number
  retryableCount?: number
  recipientCount: number
}): CampaignActions {
  const live = input.status === "RUNNING" || input.status === "QUEUED"
  const cancellable =
    input.status === "RUNNING" ||
    input.status === "QUEUED" ||
    input.status === "PAUSED" ||
    input.status === "SCHEDULED"
  const retryable = input.retryableCount ?? input.failedCount

  return {
    canPause: live,
    canResume: input.status === "PAUSED",
    canCancel: cancellable,
    canRetryFailed:
      retryable > 0 && input.status !== "DRAFT" && input.status !== "CANCELLED",
    canExport: input.recipientCount > 0,
  }
}

export function parseAudienceFilter(value: string | undefined): AudienceFilter {
  if (value && audienceFilters.includes(value as AudienceFilter)) {
    return value as AudienceFilter
  }
  return "all"
}

export function parsePage(value: string | undefined): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1
  }
  return parsed
}

function activityTitle(status: CallStatus): string {
  switch (status) {
    case "ANSWERED":
      return "Call answered"
    case "COMPLETED":
      return "Call completed"
    case "RETRYING":
      return "Retry scheduled"
    case "FAILED":
      return "Call failed"
    case "NO_ANSWER":
      return "No answer"
    case "BUSY":
      return "Line busy"
    case "CALLING":
      return "Call started"
    case "RINGING":
      return "Ringing"
    case "QUEUED":
      return "Queued for dial"
    case "CANCELLED":
      return "Call cancelled"
    case "PENDING":
      return "Waiting to dial"
  }
}

function countStatuses(statuses: CallStatus[], match: CallStatus[]): number {
  return statuses.filter((status) => match.includes(status)).length
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}
