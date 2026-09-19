import { describe, expect, it } from "vitest"

import {
  buildAnalyticsCallsCsv,
  buildAnalyticsComparisonCsv,
  computeCampaignAnalyticsReport,
  durationBucketLabel,
  parseAnalyticsRange,
} from "./compute"

const range = {
  from: new Date("2026-09-10T00:00:00.000+01:00"),
  to: new Date("2026-09-12T00:00:00.000+01:00"),
}

function attempt(
  patch: Partial<{
    campaignId: string
    campaignName: string
    campaignType: "SERVICE_ANNOUNCEMENT" | "PASTORAL_MESSAGE"
    campaignStatus: "COMPLETED" | "RUNNING"
    recipientId: string
    attemptNumber: number
    status:
      | "PENDING"
      | "CALLING"
      | "COMPLETED"
      | "NO_ANSWER"
      | "BUSY"
      | "FAILED"
      | "CANCELLED"
    startedAt: Date | null
    durationSeconds: number | null
  }>,
) {
  return {
    campaignId: "camp_a",
    campaignName: "GKC Reminder",
    campaignType: "SERVICE_ANNOUNCEMENT" as const,
    campaignStatus: "COMPLETED" as const,
    recipientId: "rec_1",
    attemptNumber: 1,
    status: "COMPLETED" as const,
    startedAt: new Date("2026-09-10T10:00:00.000+01:00"),
    durationSeconds: 47,
    ...patch,
  }
}

const fixture = [
  attempt({ recipientId: "rec_1", status: "COMPLETED", durationSeconds: 47 }),
  attempt({
    recipientId: "rec_2",
    status: "NO_ANSWER",
    durationSeconds: null,
    startedAt: new Date("2026-09-10T11:00:00.000+01:00"),
  }),
  attempt({
    recipientId: "rec_2",
    attemptNumber: 2,
    status: "COMPLETED",
    durationSeconds: 40,
    startedAt: new Date("2026-09-11T09:00:00.000+01:00"),
  }),
  attempt({
    recipientId: "rec_3",
    status: "FAILED",
    durationSeconds: null,
    startedAt: new Date("2026-09-10T12:00:00.000+01:00"),
  }),
  attempt({
    recipientId: "rec_4",
    status: "BUSY",
    durationSeconds: null,
    startedAt: new Date("2026-09-11T10:00:00.000+01:00"),
  }),
  attempt({
    campaignId: "camp_b",
    campaignName: "Pastoral check",
    campaignType: "PASTORAL_MESSAGE",
    campaignStatus: "RUNNING",
    recipientId: "rec_5",
    status: "COMPLETED",
    durationSeconds: 90,
    startedAt: new Date("2026-09-11T11:00:00.000+01:00"),
  }),
  attempt({
    campaignId: "camp_b",
    campaignName: "Pastoral check",
    campaignType: "PASTORAL_MESSAGE",
    campaignStatus: "RUNNING",
    recipientId: "rec_6",
    status: "CANCELLED",
    durationSeconds: null,
    startedAt: new Date("2026-09-11T12:00:00.000+01:00"),
  }),
  attempt({
    campaignId: "camp_b",
    campaignName: "Pastoral check",
    campaignType: "PASTORAL_MESSAGE",
    campaignStatus: "RUNNING",
    recipientId: "rec_7",
    status: "CALLING",
    durationSeconds: null,
    startedAt: new Date("2026-09-11T13:00:00.000+01:00"),
  }),
  attempt({
    recipientId: "rec_8",
    status: "PENDING",
    startedAt: null,
    durationSeconds: null,
  }),
]

describe("computeCampaignAnalyticsReport", () => {
  const report = computeCampaignAnalyticsReport({ attempts: fixture, range })

  it("counts only started call attempts", () => {
    expect(report.kpis.totalCalls).toBe(8)
  })

  it("computes answer, completion, and failure rates from call outcomes", () => {
    // Answered = COMPLETED among reached (COMPLETED + NO_ANSWER + BUSY)
    expect(report.kpis.answeredCalls).toBe(3)
    expect(report.kpis.reachedCalls).toBe(5)
    expect(report.kpis.answerRate).toBe(0.6)
    // Completion = COMPLETED among terminal attempts
    expect(report.kpis.terminalCalls).toBe(7)
    expect(report.kpis.completionRate).toBeCloseTo(3 / 7, 10)
    expect(report.kpis.failureRate).toBeCloseTo(1 / 7, 10)
  })

  it("averages talk time from completed durations only", () => {
    expect(report.kpis.averageDurationSeconds).toBe(59)
    expect(report.kpis.totalMinutes).toBeCloseTo(177 / 60, 10)
  })

  it("distributes terminal and in-progress outcomes without invented buckets", () => {
    expect(report.outcomeDistribution).toEqual([
      { key: "COMPLETED", label: "Completed", value: 3 },
      { key: "NO_ANSWER", label: "No answer", value: 1 },
      { key: "BUSY", label: "Busy", value: 1 },
      { key: "FAILED", label: "Failed", value: 1 },
      { key: "CANCELLED", label: "Cancelled", value: 1 },
      { key: "IN_PROGRESS", label: "In progress", value: 1 },
    ])
  })

  it("buckets started calls by Lagos calendar day across the range", () => {
    expect(report.callsOverTime).toEqual([
      { date: "2026-09-10", label: "10 Sep", calls: 3, answered: 1, reached: 2 },
      { date: "2026-09-11", label: "11 Sep", calls: 5, answered: 2, reached: 3 },
    ])
  })

  it("computes daily answer rate only from reached calls", () => {
    expect(report.answerRateOverTime).toEqual([
      { date: "2026-09-10", label: "10 Sep", answerRate: 0.5 },
      { date: "2026-09-11", label: "11 Sep", answerRate: 2 / 3 },
    ])
  })

  it("summarizes campaign performance from the same attempts", () => {
    expect(report.campaignPerformance).toEqual([
      {
        campaignId: "camp_a",
        campaign: "GKC Reminder",
        calls: 5,
        answered: 2,
        answerRate: 0.5,
      },
      {
        campaignId: "camp_b",
        campaign: "Pastoral check",
        calls: 3,
        answered: 1,
        answerRate: 1,
      },
    ])
  })

  it("splits retry performance by attempt number", () => {
    expect(report.retryPerformance).toEqual([
      { attempt: 1, label: "Attempt 1", calls: 7, answered: 2, reached: 4, answerRate: 0.5 },
      { attempt: 2, label: "Attempt 2", calls: 1, answered: 1, reached: 1, answerRate: 1 },
    ])
  })

  it("histograms completed talk time", () => {
    expect(report.durationDistribution.map((row) => ({ key: row.key, value: row.value }))).toEqual(
      [
        { key: "0-15", value: 0 },
        { key: "15-30", value: 0 },
        { key: "30-60", value: 2 },
        { key: "60-120", value: 1 },
        { key: "120-240", value: 0 },
        { key: "240+", value: 0 },
      ],
    )
    expect(durationBucketLabel("30-60")).toBe("30–60s")
  })

  it("builds a campaign comparison table from call records", () => {
    expect(report.comparison).toEqual([
      {
        campaignId: "camp_a",
        campaign: "GKC Reminder",
        recipients: 4,
        calls: 5,
        answered: 2,
        answerRate: 0.5,
        averageDurationSeconds: 44,
        retries: 1,
        failed: 1,
      },
      {
        campaignId: "camp_b",
        campaign: "Pastoral check",
        recipients: 3,
        calls: 3,
        answered: 1,
        answerRate: 1,
        averageDurationSeconds: 90,
        retries: 0,
        failed: 0,
      },
    ])
  })

  it("returns empty rates when there are no started calls", () => {
    const empty = computeCampaignAnalyticsReport({ attempts: [], range })
    expect(empty.kpis).toMatchObject({
      totalCalls: 0,
      answerRate: null,
      completionRate: null,
      failureRate: null,
      averageDurationSeconds: null,
      totalMinutes: 0,
    })
    expect(empty.callsOverTime).toEqual([
      { date: "2026-09-10", label: "10 Sep", calls: 0, answered: 0, reached: 0 },
      { date: "2026-09-11", label: "11 Sep", calls: 0, answered: 0, reached: 0 },
    ])
    expect(empty.comparison).toEqual([])
  })
})

describe("parseAnalyticsRange", () => {
  it("defaults to the last 30 Lagos days ending tomorrow morning", () => {
    const parsed = parseAnalyticsRange({
      now: new Date("2026-09-16T12:00:00.000+01:00"),
    })
    expect(parsed.fromKey).toBe("2026-08-18")
    expect(parsed.toKey).toBe("2026-09-16")
    expect(parsed.from.toISOString()).toBe("2026-08-17T23:00:00.000Z")
    expect(parsed.to.toISOString()).toBe("2026-09-16T23:00:00.000Z")
  })

  it("parses inclusive Lagos calendar dates", () => {
    const parsed = parseAnalyticsRange({
      from: "2026-09-10",
      to: "2026-09-11",
      now: new Date("2026-09-16T12:00:00.000+01:00"),
    })
    expect(parsed.fromKey).toBe("2026-09-10")
    expect(parsed.toKey).toBe("2026-09-11")
    expect(parsed.to.toISOString()).toBe("2026-09-11T23:00:00.000Z")
  })
})

describe("analytics CSV", () => {
  it("exports the comparison table", () => {
    const report = computeCampaignAnalyticsReport({ attempts: fixture, range })
    const csv = buildAnalyticsComparisonCsv(report.comparison)
    expect(csv.split("\n")[0]).toBe(
      "Campaign,Recipients,Calls,Answered,Answer Rate,Avg Duration,Retries,Failed",
    )
    expect(csv).toContain("GKC Reminder,4,5,2,50.0%,00:44,1,1")
    expect(csv).toContain("Pastoral check,3,3,1,100.0%,01:30,0,0")
  })

  it("exports started call records without contact identity", () => {
    const csv = buildAnalyticsCallsCsv(fixture)
    expect(csv.split("\n")[0]).toBe(
      "Campaign,Started (Africa/Lagos),Attempt,Status,Duration seconds",
    )
    expect(csv).toContain("GKC Reminder,10 Sep 2026 10:00,1,COMPLETED,47")
    expect(csv).not.toContain("rec_")
    expect(csv.split("\n").length).toBe(9)
  })
})
