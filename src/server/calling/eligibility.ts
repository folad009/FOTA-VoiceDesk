import { addDays } from "date-fns"
import { fromZonedTime, toZonedTime } from "date-fns-tz"

import type { CallStatus, CampaignStatus } from "@/domain/status"

const CLAIMABLE: CallStatus[] = ["PENDING", "RETRYING"]
const IN_FLIGHT: CallStatus[] = ["QUEUED", "CALLING", "RINGING", "ANSWERED"]
const LIVE_CAMPAIGNS: CampaignStatus[] = ["QUEUED", "RUNNING"]

export function canClaimRecipient(input: {
  recipientStatus: CallStatus
  campaignStatus: CampaignStatus
  nextAttemptAt: Date | null
  now: Date
}): boolean {
  if (!LIVE_CAMPAIGNS.includes(input.campaignStatus)) {
    return false
  }
  if (IN_FLIGHT.includes(input.recipientStatus)) {
    return false
  }
  if (!CLAIMABLE.includes(input.recipientStatus)) {
    return false
  }
  if (input.nextAttemptAt && input.nextAttemptAt.getTime() > input.now.getTime()) {
    return false
  }
  return true
}

export function isWithinCallingHours(input: {
  now: Date
  timezone: string
  startMinutes: number
  endMinutes: number
}): boolean {
  const zoned = toZonedTime(input.now, input.timezone)
  const minutes = zoned.getHours() * 60 + zoned.getMinutes()
  return minutes >= input.startMinutes && minutes < input.endMinutes
}

export function nextCallingWindowStart(input: {
  now: Date
  timezone: string
  startMinutes: number
}): Date {
  const zoned = toZonedTime(input.now, input.timezone)
  const hours = Math.floor(input.startMinutes / 60)
  const minutes = input.startMinutes % 60
  let start = new Date(
    zoned.getFullYear(),
    zoned.getMonth(),
    zoned.getDate(),
    hours,
    minutes,
    0,
    0,
  )
  if (start.getTime() <= zoned.getTime()) {
    start = addDays(start, 1)
  }
  return fromZonedTime(start, input.timezone)
}

export function nextDialDelayOk(input: {
  lastStartedAt: Date | null
  minDelayBetweenCallsMs: number
  now: Date
}): boolean {
  if (!input.lastStartedAt || input.minDelayBetweenCallsMs <= 0) {
    return true
  }
  return input.now.getTime() - input.lastStartedAt.getTime() >= input.minDelayBetweenCallsMs
}

export function isInFlightStatus(status: CallStatus): boolean {
  return IN_FLIGHT.includes(status)
}

const OPEN_QUEUE: CallStatus[] = [
  "PENDING",
  "QUEUED",
  "CALLING",
  "RINGING",
  "ANSWERED",
  "RETRYING",
]

export function hasOpenCallingWork(statuses: CallStatus[]): boolean {
  return statuses.some((status) => OPEN_QUEUE.includes(status))
}

export function campaignStatusWhenQueueEmpty(statuses: CallStatus[]): "COMPLETED" | "FAILED" {
  if (statuses.length > 0 && statuses.every((status) => status === "FAILED")) {
    return "FAILED"
  }
  return "COMPLETED"
}
