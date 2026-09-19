import { addDays, startOfDay } from "date-fns"
import { fromZonedTime, toZonedTime } from "date-fns-tz"

import type { CallStatus, CampaignStatus } from "@/domain/status"
import { OPERATIONS_TIMEZONE } from "./greeting"

const ACTIVE_CAMPAIGN_STATUSES: CampaignStatus[] = ["QUEUED", "RUNNING", "PAUSED"]
const TERMINAL_CALL_STATUSES: CallStatus[] = [
  "COMPLETED",
  "NO_ANSWER",
  "BUSY",
  "FAILED",
  "CANCELLED",
]

export type AttemptInput = {
  status: CallStatus
  startedAt: Date | null
  durationSeconds: number | null
}

export type OperationsSummary = {
  activeCampaigns: number
  callsToday: number
  successfulCalls: number
  answerRate: number | null
  minutesUsed: number
}

export function lagosDayBounds(now: Date): { start: Date; end: Date } {
  const zoned = toZonedTime(now, OPERATIONS_TIMEZONE)
  const startZoned = startOfDay(zoned)
  const start = fromZonedTime(startZoned, OPERATIONS_TIMEZONE)
  const end = fromZonedTime(addDays(startZoned, 1), OPERATIONS_TIMEZONE)
  return { start, end }
}

export function computeOperationsSummary(input: {
  campaignStatuses: CampaignStatus[]
  attempts: AttemptInput[]
  now: Date
}): OperationsSummary {
  const { start, end } = lagosDayBounds(input.now)
  const todayAttempts = input.attempts.filter(
    (attempt) =>
      attempt.startedAt !== null &&
      attempt.startedAt >= start &&
      attempt.startedAt < end,
  )
  const successfulToday = todayAttempts.filter(
    (attempt) => attempt.status === "COMPLETED",
  )
  const terminalToday = todayAttempts.filter((attempt) =>
    TERMINAL_CALL_STATUSES.includes(attempt.status),
  )
  const durationSeconds = successfulToday.reduce(
    (sum, attempt) => sum + (attempt.durationSeconds ?? 0),
    0,
  )

  return {
    activeCampaigns: input.campaignStatuses.filter((status) =>
      ACTIVE_CAMPAIGN_STATUSES.includes(status),
    ).length,
    callsToday: todayAttempts.length,
    successfulCalls: successfulToday.length,
    answerRate:
      terminalToday.length === 0
        ? null
        : successfulToday.length / terminalToday.length,
    minutesUsed: durationSeconds / 60,
  }
}

export function formatAnswerRate(rate: number | null): string {
  if (rate === null) {
    return "—"
  }
  return `${Math.round(rate * 100)}%`
}

export function formatMinutesUsed(minutes: number): string {
  return String(Math.round(minutes))
}
