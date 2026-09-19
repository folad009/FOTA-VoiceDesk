import { addDays, format, startOfDay } from "date-fns"
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz"

import { formatCallClock } from "@/server/campaigns/command-center"
import { OPERATIONS_TIMEZONE } from "@/server/dashboard/greeting"
import type { CallStatus, CampaignStatus } from "@/domain/status"
import type { CampaignType } from "@/server/campaigns/wizard-draft"

const TERMINAL: CallStatus[] = [
  "COMPLETED",
  "NO_ANSWER",
  "BUSY",
  "FAILED",
  "CANCELLED",
]
const REACHED: CallStatus[] = ["COMPLETED", "NO_ANSWER", "BUSY"]
const IN_PROGRESS: CallStatus[] = ["QUEUED", "CALLING", "RINGING", "ANSWERED", "RETRYING"]

const OUTCOME_ORDER = [
  "COMPLETED",
  "NO_ANSWER",
  "BUSY",
  "FAILED",
  "CANCELLED",
  "IN_PROGRESS",
] as const

const OUTCOME_LABEL: Record<(typeof OUTCOME_ORDER)[number], string> = {
  COMPLETED: "Completed",
  NO_ANSWER: "No answer",
  BUSY: "Busy",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  IN_PROGRESS: "In progress",
}

export const DURATION_BUCKETS = [
  { key: "0-15", min: 0, max: 15, label: "0–15s" },
  { key: "15-30", min: 15, max: 30, label: "15–30s" },
  { key: "30-60", min: 30, max: 60, label: "30–60s" },
  { key: "60-120", min: 60, max: 120, label: "1–2m" },
  { key: "120-240", min: 120, max: 240, label: "2–4m" },
  { key: "240+", min: 240, max: Infinity, label: "4m+" },
] as const

export type DurationBucketKey = (typeof DURATION_BUCKETS)[number]["key"]

export type AnalyticsAttempt = {
  campaignId: string
  campaignName: string
  campaignType: CampaignType
  campaignStatus: CampaignStatus
  recipientId: string
  attemptNumber: number
  status: CallStatus
  startedAt: Date | null
  durationSeconds: number | null
}

export type AnalyticsRange = {
  from: Date
  to: Date
  fromKey: string
  toKey: string
}

export type OutcomePoint = {
  key: (typeof OUTCOME_ORDER)[number]
  label: string
  value: number
}

export type TimePoint = {
  date: string
  label: string
  calls: number
  answered: number
  reached: number
}

export type RatePoint = {
  date: string
  label: string
  answerRate: number
}

export type CampaignPerformancePoint = {
  campaignId: string
  campaign: string
  calls: number
  answered: number
  answerRate: number | null
}

export type RetryPoint = {
  attempt: number
  label: string
  calls: number
  answered: number
  reached: number
  answerRate: number | null
}

export type DurationPoint = {
  key: DurationBucketKey
  label: string
  value: number
}

export type ComparisonRow = {
  campaignId: string
  campaign: string
  recipients: number
  calls: number
  answered: number
  answerRate: number | null
  averageDurationSeconds: number | null
  retries: number
  failed: number
}

export type AnalyticsKpis = {
  totalCalls: number
  answeredCalls: number
  reachedCalls: number
  terminalCalls: number
  answerRate: number | null
  completionRate: number | null
  failureRate: number | null
  averageDurationSeconds: number | null
  totalMinutes: number
}

export type AnalyticsReport = {
  kpis: AnalyticsKpis
  outcomeDistribution: OutcomePoint[]
  callsOverTime: TimePoint[]
  answerRateOverTime: RatePoint[]
  campaignPerformance: CampaignPerformancePoint[]
  retryPerformance: RetryPoint[]
  durationDistribution: DurationPoint[]
  comparison: ComparisonRow[]
}

export function parseAnalyticsRange(input: {
  from?: string
  to?: string
  now: Date
}): AnalyticsRange {
  const fallback = defaultRange(input.now)
  const fromKey = validDay(input.from) ?? fallback.fromKey
  const toKey = validDay(input.to) ?? fallback.toKey
  const startKey = fromKey <= toKey ? fromKey : toKey
  const endKey = fromKey <= toKey ? toKey : fromKey
  return {
    from: fromZonedTime(`${startKey}T00:00:00`, OPERATIONS_TIMEZONE),
    to: fromZonedTime(
      `${format(addDays(parseDay(endKey), 1), "yyyy-MM-dd")}T00:00:00`,
      OPERATIONS_TIMEZONE,
    ),
    fromKey: startKey,
    toKey: endKey,
  }
}

export function computeCampaignAnalyticsReport(input: {
  attempts: AnalyticsAttempt[]
  range: { from: Date; to: Date }
}): AnalyticsReport {
  const calls = input.attempts.filter(
    (attempt) =>
      attempt.startedAt !== null &&
      attempt.startedAt >= input.range.from &&
      attempt.startedAt < input.range.to,
  )
  const answeredCalls = calls.filter((attempt) => attempt.status === "COMPLETED").length
  const reachedCalls = calls.filter((attempt) => REACHED.includes(attempt.status)).length
  const terminalCalls = calls.filter((attempt) => TERMINAL.includes(attempt.status)).length
  const failedCalls = calls.filter((attempt) => attempt.status === "FAILED").length
  const durations = calls
    .filter((attempt) => attempt.status === "COMPLETED" && attempt.durationSeconds != null)
    .map((attempt) => attempt.durationSeconds as number)
  const durationSum = durations.reduce((sum, value) => sum + value, 0)

  return {
    kpis: {
      totalCalls: calls.length,
      answeredCalls,
      reachedCalls,
      terminalCalls,
      answerRate: rate(answeredCalls, reachedCalls),
      completionRate: rate(answeredCalls, terminalCalls),
      failureRate: rate(failedCalls, terminalCalls),
      averageDurationSeconds:
        durations.length === 0 ? null : Math.round(durationSum / durations.length),
      totalMinutes: durationSum / 60,
    },
    outcomeDistribution: outcomeDistribution(calls),
    callsOverTime: callsOverTime(calls, input.range),
    answerRateOverTime: answerRateOverTime(calls, input.range),
    campaignPerformance: campaignPerformance(calls),
    retryPerformance: retryPerformance(calls),
    durationDistribution: durationDistribution(durations),
    comparison: comparisonTable(calls),
  }
}

export function durationBucketLabel(key: DurationBucketKey): string {
  return DURATION_BUCKETS.find((bucket) => bucket.key === key)?.label ?? key
}

export function formatAnalyticsRate(value: number | null): string {
  if (value === null) {
    return "—"
  }
  return `${(Math.round(value * 1000) / 10).toFixed(1)}%`
}

export function formatAnalyticsMinutes(minutes: number): string {
  if (minutes === 0) {
    return "0"
  }
  return minutes < 10 ? minutes.toFixed(1) : String(Math.round(minutes))
}

export function buildAnalyticsComparisonCsv(rows: ComparisonRow[]): string {
  const header =
    "Campaign,Recipients,Calls,Answered,Answer Rate,Avg Duration,Retries,Failed"
  const body = rows.map((row) =>
    [
      csvCell(row.campaign),
      String(row.recipients),
      String(row.calls),
      String(row.answered),
      formatAnalyticsRate(row.answerRate),
      row.averageDurationSeconds === null ? "—" : formatCallClock(row.averageDurationSeconds),
      String(row.retries),
      String(row.failed),
    ].join(","),
  )
  return [header, ...body].join("\n")
}

export function buildAnalyticsCallsCsv(attempts: AnalyticsAttempt[]): string {
  const header = "Campaign,Started (Africa/Lagos),Attempt,Status,Duration seconds"
  const rows = attempts
    .filter((attempt) => attempt.startedAt !== null)
    .sort((a, b) => (a.startedAt as Date).getTime() - (b.startedAt as Date).getTime())
    .map((attempt) =>
      [
        csvCell(attempt.campaignName),
        csvCell(
          formatInTimeZone(
            attempt.startedAt as Date,
            OPERATIONS_TIMEZONE,
            "d MMM yyyy HH:mm",
          ),
        ),
        String(attempt.attemptNumber),
        attempt.status,
        attempt.durationSeconds == null ? "" : String(attempt.durationSeconds),
      ].join(","),
    )
  return [header, ...rows].join("\n")
}

function outcomeDistribution(calls: AnalyticsAttempt[]): OutcomePoint[] {
  const counts: Record<(typeof OUTCOME_ORDER)[number], number> = {
    COMPLETED: 0,
    NO_ANSWER: 0,
    BUSY: 0,
    FAILED: 0,
    CANCELLED: 0,
    IN_PROGRESS: 0,
  }
  for (const attempt of calls) {
    if (IN_PROGRESS.includes(attempt.status) || attempt.status === "PENDING") {
      counts.IN_PROGRESS += 1
      continue
    }
    if (attempt.status in counts) {
      counts[attempt.status as keyof typeof counts] += 1
    }
  }
  return OUTCOME_ORDER.filter((key) => counts[key] > 0).map((key) => ({
    key,
    label: OUTCOME_LABEL[key],
    value: counts[key],
  }))
}

function callsOverTime(
  calls: AnalyticsAttempt[],
  range: { from: Date; to: Date },
): TimePoint[] {
  const days = lagosDays(range.from, range.to)
  const grouped = new Map<string, AnalyticsAttempt[]>()
  for (const day of days) {
    grouped.set(day, [])
  }
  for (const attempt of calls) {
    const key = formatInTimeZone(attempt.startedAt as Date, OPERATIONS_TIMEZONE, "yyyy-MM-dd")
    const bucket = grouped.get(key)
    if (bucket) {
      bucket.push(attempt)
    }
  }
  return days.map((date) => {
    const items = grouped.get(date) ?? []
    return {
      date,
      label: formatInTimeZone(
        fromZonedTime(`${date}T00:00:00`, OPERATIONS_TIMEZONE),
        OPERATIONS_TIMEZONE,
        "d MMM",
      ),
      calls: items.length,
      answered: items.filter((item) => item.status === "COMPLETED").length,
      reached: items.filter((item) => REACHED.includes(item.status)).length,
    }
  })
}

function answerRateOverTime(
  calls: AnalyticsAttempt[],
  range: { from: Date; to: Date },
): RatePoint[] {
  return callsOverTime(calls, range)
    .filter((point) => point.reached > 0)
    .map((point) => ({
      date: point.date,
      label: point.label,
      answerRate: point.answered / point.reached,
    }))
}

function campaignPerformance(calls: AnalyticsAttempt[]): CampaignPerformancePoint[] {
  return comparisonTable(calls).map((row) => ({
    campaignId: row.campaignId,
    campaign: row.campaign,
    calls: row.calls,
    answered: row.answered,
    answerRate: row.answerRate,
  }))
}

function retryPerformance(calls: AnalyticsAttempt[]): RetryPoint[] {
  const grouped = new Map<number, AnalyticsAttempt[]>()
  for (const attempt of calls) {
    const current = grouped.get(attempt.attemptNumber) ?? []
    current.push(attempt)
    grouped.set(attempt.attemptNumber, current)
  }
  return [...grouped.keys()]
    .sort((a, b) => a - b)
    .map((attemptNumber) => {
      const items = grouped.get(attemptNumber) ?? []
      const answered = items.filter((item) => item.status === "COMPLETED").length
      const reached = items.filter((item) => REACHED.includes(item.status)).length
      return {
        attempt: attemptNumber,
        label: `Attempt ${attemptNumber}`,
        calls: items.length,
        answered,
        reached,
        answerRate: rate(answered, reached),
      }
    })
}

function durationDistribution(durations: number[]): DurationPoint[] {
  return DURATION_BUCKETS.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    value: durations.filter((value) => value >= bucket.min && value < bucket.max).length,
  }))
}

function comparisonTable(calls: AnalyticsAttempt[]): ComparisonRow[] {
  const grouped = new Map<string, AnalyticsAttempt[]>()
  for (const attempt of calls) {
    const current = grouped.get(attempt.campaignId) ?? []
    current.push(attempt)
    grouped.set(attempt.campaignId, current)
  }

  const rows = [...grouped.entries()].map(([campaignId, items]) => {
    const answered = items.filter((item) => item.status === "COMPLETED").length
    const reached = items.filter((item) => REACHED.includes(item.status)).length
    const durations = items
      .filter((item) => item.status === "COMPLETED" && item.durationSeconds != null)
      .map((item) => item.durationSeconds as number)
    const durationSum = durations.reduce((sum, value) => sum + value, 0)
    return {
      campaignId,
      campaign: items[0]?.campaignName ?? campaignId,
      recipients: new Set(items.map((item) => item.recipientId)).size,
      calls: items.length,
      answered,
      answerRate: rate(answered, reached),
      averageDurationSeconds:
        durations.length === 0 ? null : Math.round(durationSum / durations.length),
      retries: items.filter((item) => item.attemptNumber > 1).length,
      failed: items.filter((item) => item.status === "FAILED").length,
    }
  })

  return rows.sort((a, b) => b.calls - a.calls || a.campaign.localeCompare(b.campaign))
}

function rate(numerator: number, denominator: number): number | null {
  if (denominator === 0) {
    return null
  }
  return numerator / denominator
}

function lagosDays(from: Date, to: Date): string[] {
  const days: string[] = []
  let cursor = startOfDay(toZonedTime(from, OPERATIONS_TIMEZONE))
  const end = startOfDay(toZonedTime(to, OPERATIONS_TIMEZONE))
  while (cursor < end) {
    days.push(format(cursor, "yyyy-MM-dd"))
    cursor = addDays(cursor, 1)
  }
  return days
}

function defaultRange(now: Date): AnalyticsRange {
  const today = startOfDay(toZonedTime(now, OPERATIONS_TIMEZONE))
  const fromZoned = addDays(today, -29)
  const fromKey = format(fromZoned, "yyyy-MM-dd")
  const toKey = format(today, "yyyy-MM-dd")
  return {
    from: fromZonedTime(`${fromKey}T00:00:00`, OPERATIONS_TIMEZONE),
    to: fromZonedTime(`${format(addDays(today, 1), "yyyy-MM-dd")}T00:00:00`, OPERATIONS_TIMEZONE),
    fromKey,
    toKey,
  }
}

function validDay(value: string | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null
  }
  const parsed = parseDay(value)
  if (Number.isNaN(parsed.getTime()) || format(parsed, "yyyy-MM-dd") !== value) {
    return null
  }
  return value
}

function parseDay(value: string): Date {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1)
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`
  }
  return value
}
