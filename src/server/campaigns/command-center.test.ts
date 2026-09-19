import { describe, expect, it } from "vitest"

import type { CallStatus } from "@/domain/status"
import {
  campaignActionAvailability,
  computeCampaignAnalytics,
  computeCampaignProgress,
  describeCallActivity,
  formatCallClock,
  formatProgressPercent,
  isRetryableRecipientStatus,
  matchesRecipientFilter,
  retryableRecipientCount,
  type AudienceFilter,
} from "./command-center"

const gkcStatuses: CallStatus[] = [
  ...Array.from({ length: 312 }, () => "COMPLETED" as const),
  ...Array.from({ length: 51 }, () => "NO_ANSWER" as const),
  ...Array.from({ length: 17 }, () => "BUSY" as const),
  ...Array.from({ length: 11 }, () => "FAILED" as const),
  ...Array.from({ length: 109 }, () => "PENDING" as const),
]

describe("computeCampaignProgress", () => {
  it("reports processed share to one decimal for a live campaign", () => {
    const progress = computeCampaignProgress(gkcStatuses)

    expect(progress.total).toBe(500)
    expect(progress.processed).toBe(391)
    expect(progress.answered).toBe(312)
    expect(progress.noAnswer).toBe(51)
    expect(progress.busy).toBe(17)
    expect(progress.failed).toBe(11)
    expect(progress.pending).toBe(109)
    expect(progress.calling).toBe(0)
    expect(progress.progressPercent).toBe(78.2)
    expect(formatProgressPercent(progress.progressPercent)).toBe("78.2%")
  })

  it("treats in-flight calls as pending, not processed", () => {
    const progress = computeCampaignProgress(["CALLING", "RINGING", "QUEUED", "COMPLETED"])
    expect(progress.processed).toBe(1)
    expect(progress.pending).toBe(3)
    expect(progress.calling).toBe(2)
  })
})

describe("matchesRecipientFilter", () => {
  it("maps mission-control filters onto call statuses", () => {
    const cases: Array<[AudienceFilter, CallStatus, boolean]> = [
      ["all", "PENDING", true],
      ["pending", "PENDING", true],
      ["pending", "QUEUED", true],
      ["pending", "RETRYING", true],
      ["pending", "FAILED", false],
      ["calling", "CALLING", true],
      ["calling", "RINGING", true],
      ["calling", "PENDING", false],
      ["answered", "ANSWERED", true],
      ["answered", "COMPLETED", true],
      ["answered", "NO_ANSWER", false],
      ["no_answer", "NO_ANSWER", true],
      ["busy", "BUSY", true],
      ["failed", "FAILED", true],
      ["failed", "CANCELLED", false],
      ["failed", "BUSY", false],
    ]

    for (const [filter, status, expected] of cases) {
      expect(matchesRecipientFilter(status, filter)).toBe(expected)
    }
  })
})

describe("describeCallActivity", () => {
  it("renders answered, completed, retry, and failed events", () => {
    const at = new Date("2026-09-16T21:41:08.000Z")

    expect(
      describeCallActivity({
        status: "ANSWERED",
        occurredAt: at,
        phoneE164: "+2348030002341",
        durationSeconds: null,
      }),
    ).toMatchObject({
      title: "Call answered",
      phone: "+234 803 *** 2341",
      detail: null,
    })

    expect(
      describeCallActivity({
        status: "COMPLETED",
        occurredAt: at,
        phoneE164: "+2348030009123",
        durationSeconds: 47,
      }),
    ).toMatchObject({
      title: "Call completed",
      phone: "+234 803 *** 9123",
      detail: "Duration: 00:47",
    })

    expect(
      describeCallActivity({
        status: "RETRYING",
        occurredAt: at,
        phoneE164: "+2348090001182",
        durationSeconds: null,
      }),
    ).toMatchObject({
      title: "Retry scheduled",
      phone: "+234 809 *** 1182",
    })

    expect(
      describeCallActivity({
        status: "FAILED",
        occurredAt: at,
        phoneE164: "+2347060004421",
        durationSeconds: null,
      }),
    ).toMatchObject({
      title: "Call failed",
      phone: "+234 706 *** 4421",
    })
  })
})

describe("formatCallClock", () => {
  it("formats seconds as mm:ss", () => {
    expect(formatCallClock(47)).toBe("00:47")
    expect(formatCallClock(84)).toBe("01:24")
  })
})

describe("computeCampaignAnalytics", () => {
  it("computes answer rate, failure rate, and average talk time", () => {
    const analytics = computeCampaignAnalytics({
      statuses: gkcStatuses,
      talkDurations: [47, 50, 40],
      attemptCounts: [1, 1, 2],
    })

    expect(analytics.answerRate).toBe(62.4)
    expect(analytics.failureRate).toBe(2.2)
    expect(analytics.averageTalkSeconds).toBe(46)
    expect(analytics.averageAttempts).toBe(1.3)
  })
})

describe("isRetryableRecipientStatus", () => {
  it("retries failed, unanswered, and busy recipients, not cancelled ones", () => {
    expect(isRetryableRecipientStatus("FAILED")).toBe(true)
    expect(isRetryableRecipientStatus("NO_ANSWER")).toBe(true)
    expect(isRetryableRecipientStatus("BUSY")).toBe(true)
    expect(isRetryableRecipientStatus("CANCELLED")).toBe(false)
    expect(isRetryableRecipientStatus("COMPLETED")).toBe(false)
    expect(retryableRecipientCount(["FAILED", "NO_ANSWER", "BUSY", "CANCELLED", "COMPLETED"])).toBe(3)
  })
})

describe("campaignActionAvailability", () => {
  it("enables pause, cancel, retry, and export for a running campaign with failures", () => {
    expect(
      campaignActionAvailability({
        status: "RUNNING",
        failedCount: 11,
        retryableCount: 11,
        recipientCount: 500,
      }),
    ).toEqual({
      canPause: true,
      canResume: false,
      canCancel: true,
      canRetryFailed: true,
      canExport: true,
    })
  })

  it("enables retry when unanswered or busy calls remain", () => {
    expect(
      campaignActionAvailability({
        status: "COMPLETED",
        failedCount: 0,
        retryableCount: 4,
        recipientCount: 20,
      }).canRetryFailed,
    ).toBe(true)
  })

  it("disables launch-style actions on a draft with no audience", () => {
    expect(
      campaignActionAvailability({
        status: "DRAFT",
        failedCount: 0,
        retryableCount: 0,
        recipientCount: 0,
      }),
    ).toEqual({
      canPause: false,
      canResume: false,
      canCancel: false,
      canRetryFailed: false,
      canExport: false,
    })
  })
})
