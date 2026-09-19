import { describe, expect, it } from "vitest"

import {
  computeOperationsSummary,
  formatAnswerRate,
  formatMinutesUsed,
} from "./compute-operations-summary"

const noonLagos = new Date("2026-09-15T11:00:00.000Z")

describe("computeOperationsSummary", () => {
  it("returns zeros and null rates when empty", () => {
    expect(
      computeOperationsSummary({
        campaignStatuses: [],
        attempts: [],
        now: noonLagos,
      }),
    ).toEqual({
      activeCampaigns: 0,
      callsToday: 0,
      successfulCalls: 0,
      answerRate: null,
      minutesUsed: 0,
    })
  })

  it("counts queued, running, and paused campaigns as active", () => {
    const result = computeOperationsSummary({
      campaignStatuses: ["RUNNING", "DRAFT", "PAUSED", "QUEUED", "COMPLETED"],
      attempts: [],
      now: noonLagos,
    })
    expect(result.activeCampaigns).toBe(3)
  })

  it("computes today's calls, successful calls, answer rate, and minutes", () => {
    const result = computeOperationsSummary({
      campaignStatuses: [],
      attempts: [
        {
          status: "COMPLETED",
          startedAt: new Date("2026-09-15T08:00:00.000Z"),
          durationSeconds: 120,
        },
        {
          status: "COMPLETED",
          startedAt: new Date("2026-09-15T08:10:00.000Z"),
          durationSeconds: 60,
        },
        {
          status: "NO_ANSWER",
          startedAt: new Date("2026-09-15T08:05:00.000Z"),
          durationSeconds: null,
        },
        {
          status: "BUSY",
          startedAt: new Date("2026-09-15T08:20:00.000Z"),
          durationSeconds: null,
        },
        {
          status: "FAILED",
          startedAt: new Date("2026-09-14T08:00:00.000Z"),
          durationSeconds: null,
        },
      ],
      now: noonLagos,
    })
    expect(result.callsToday).toBe(4)
    expect(result.successfulCalls).toBe(2)
    expect(result.answerRate).toBeCloseTo(0.5)
    expect(result.minutesUsed).toBe(3)
  })
})

describe("KPI display helpers", () => {
  it("renders a dash when answer rate cannot be computed", () => {
    expect(formatAnswerRate(null)).toBe("—")
  })

  it("renders answer rate as a whole percent", () => {
    expect(formatAnswerRate(0.624)).toBe("62%")
  })

  it("renders minutes used as a whole number", () => {
    expect(formatMinutesUsed(0)).toBe("0")
    expect(formatMinutesUsed(12.4)).toBe("12")
  })
})
