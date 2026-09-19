import { describe, expect, it } from "vitest"

import {
  computeLiveCampaign,
  estimateCompletion,
} from "./compute-live-campaign"

const now = new Date("2026-09-15T10:50:00.000Z")

describe("computeLiveCampaign", () => {
  it("aggregates GKC-style recipient outcomes and progress", () => {
    const statuses = [
      ...Array.from({ length: 312 }, () => "COMPLETED" as const),
      ...Array.from({ length: 51 }, () => "NO_ANSWER" as const),
      ...Array.from({ length: 17 }, () => "BUSY" as const),
      ...Array.from({ length: 11 }, () => "FAILED" as const),
      ...Array.from({ length: 109 }, () => "PENDING" as const),
    ]

    const card = computeLiveCampaign({
      id: "camp_gkc",
      name: "GKC 2026 — Conference Reminder",
      status: "RUNNING",
      startedAt: new Date("2026-09-15T10:00:00.000Z"),
      recipientStatuses: statuses,
      now,
    })

    expect(card.name).toBe("GKC 2026 — Conference Reminder")
    expect(card.status).toBe("RUNNING")
    expect(card.total).toBe(500)
    expect(card.processed).toBe(391)
    expect(card.answered).toBe(312)
    expect(card.noAnswer).toBe(51)
    expect(card.busy).toBe(17)
    expect(card.failed).toBe(11)
    expect(card.progressPercent).toBe(78)
    expect(card.estimatedCompletion).toBe("About 14 min")
    expect(card.isLive).toBe(true)
  })

  it("treats paused campaigns as not live", () => {
    const card = computeLiveCampaign({
      id: "camp_paused",
      name: "Paused campaign",
      status: "PAUSED",
      startedAt: now,
      recipientStatuses: ["PENDING"],
      now,
    })
    expect(card.isLive).toBe(false)
    expect(card.estimatedCompletion).toBe("Paused")
  })
})

describe("estimateCompletion", () => {
  it("waits to start when queued with no progress", () => {
    expect(
      estimateCompletion({
        status: "QUEUED",
        processed: 0,
        total: 100,
        startedAt: now,
        now,
      }),
    ).toBe("Waiting to start")
  })

  it("calculates while running with no processed recipients", () => {
    expect(
      estimateCompletion({
        status: "RUNNING",
        processed: 0,
        total: 100,
        startedAt: now,
        now,
      }),
    ).toBe("Calculating")
  })
})
