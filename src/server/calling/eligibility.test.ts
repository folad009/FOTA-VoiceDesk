import { describe, expect, it } from "vitest"

import type { CallStatus } from "@/domain/status"
import {
  campaignStatusWhenQueueEmpty,
  canClaimRecipient,
  hasOpenCallingWork,
  isWithinCallingHours,
  nextCallingWindowStart,
  nextDialDelayOk,
} from "@/server/calling/eligibility"

describe("canClaimRecipient", () => {
  it("allows pending and retrying recipients that are due", () => {
    const now = new Date("2026-09-16T18:00:00.000Z")
    expect(
      canClaimRecipient({
        recipientStatus: "PENDING",
        campaignStatus: "RUNNING",
        nextAttemptAt: null,
        now,
      }),
    ).toBe(true)
    expect(
      canClaimRecipient({
        recipientStatus: "RETRYING",
        campaignStatus: "QUEUED",
        nextAttemptAt: new Date("2026-09-16T17:59:00.000Z"),
        now,
      }),
    ).toBe(true)
  })

  it("never claims a recipient already in flight", () => {
    const now = new Date("2026-09-16T18:00:00.000Z")
    const inflight: CallStatus[] = ["QUEUED", "CALLING", "RINGING", "ANSWERED"]
    for (const recipientStatus of inflight) {
      expect(
        canClaimRecipient({
          recipientStatus,
          campaignStatus: "RUNNING",
          nextAttemptAt: null,
          now,
        }),
      ).toBe(false)
    }
  })

  it("does not claim paused campaigns or future retries", () => {
    const now = new Date("2026-09-16T18:00:00.000Z")
    expect(
      canClaimRecipient({
        recipientStatus: "PENDING",
        campaignStatus: "PAUSED",
        nextAttemptAt: null,
        now,
      }),
    ).toBe(false)
    expect(
      canClaimRecipient({
        recipientStatus: "RETRYING",
        campaignStatus: "RUNNING",
        nextAttemptAt: new Date("2026-09-16T18:30:00.000Z"),
        now,
      }),
    ).toBe(false)
  })
})

describe("isWithinCallingHours", () => {
  it("allows 6pm in Africa/Lagos for 8am–7pm hours", () => {
    // 18:00 Lagos = 17:00 UTC in September (WAT, UTC+1)
    expect(
      isWithinCallingHours({
        now: new Date("2026-09-16T17:00:00.000Z"),
        timezone: "Africa/Lagos",
        startMinutes: 480,
        endMinutes: 1140,
      }),
    ).toBe(true)
  })

  it("blocks 8pm in Africa/Lagos", () => {
    expect(
      isWithinCallingHours({
        now: new Date("2026-09-16T19:00:00.000Z"),
        timezone: "Africa/Lagos",
        startMinutes: 480,
        endMinutes: 1140,
      }),
    ).toBe(false)
  })
})

describe("nextCallingWindowStart", () => {
  it("returns today's window when still before hours in Lagos", () => {
    expect(
      nextCallingWindowStart({
        now: new Date("2026-09-16T06:00:00.000Z"),
        timezone: "Africa/Lagos",
        startMinutes: 480,
      }),
    ).toEqual(new Date("2026-09-16T07:00:00.000Z"))
  })

  it("rolls to the next Lagos morning after hours end", () => {
    expect(
      nextCallingWindowStart({
        now: new Date("2026-09-16T19:00:00.000Z"),
        timezone: "Africa/Lagos",
        startMinutes: 480,
      }),
    ).toEqual(new Date("2026-09-17T07:00:00.000Z"))
  })
})

describe("campaign completion", () => {
  it("keeps a campaign open while retries remain", () => {
    expect(hasOpenCallingWork(["COMPLETED", "RETRYING"])).toBe(true)
    expect(hasOpenCallingWork(["COMPLETED", "FAILED"])).toBe(false)
  })

  it("fails the campaign only when every recipient failed", () => {
    expect(campaignStatusWhenQueueEmpty(["FAILED", "FAILED"])).toBe("FAILED")
    expect(campaignStatusWhenQueueEmpty(["FAILED", "COMPLETED"])).toBe("COMPLETED")
  })
})

describe("nextDialDelayOk", () => {
  it("enforces campaign pacing", () => {
    const now = new Date("2026-09-16T18:00:02.000Z")
    expect(
      nextDialDelayOk({
        lastStartedAt: new Date("2026-09-16T18:00:00.000Z"),
        minDelayBetweenCallsMs: 2000,
        now,
      }),
    ).toBe(true)
    expect(
      nextDialDelayOk({
        lastStartedAt: new Date("2026-09-16T18:00:01.000Z"),
        minDelayBetweenCallsMs: 2000,
        now,
      }),
    ).toBe(false)
  })
})
