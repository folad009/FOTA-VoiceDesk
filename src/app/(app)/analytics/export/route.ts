import { NextResponse } from "next/server"

import {
  buildAnalyticsCallsCsv,
  buildAnalyticsComparisonCsv,
  computeCampaignAnalyticsReport,
} from "@/server/analytics/compute"
import { loadAnalyticsAttempts } from "@/server/analytics/get-analytics"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const kind = url.searchParams.get("kind") === "calls" ? "calls" : "table"
  const loaded = await loadAnalyticsAttempts({
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    campaign: url.searchParams.get("campaign") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  })

  if (kind === "calls") {
    return csvFile(
      buildAnalyticsCallsCsv(loaded.attempts),
      `voicedesk-calls-${loaded.filters.from}-to-${loaded.filters.to}.csv`,
    )
  }

  const report = computeCampaignAnalyticsReport({
    attempts: loaded.attempts,
    range: loaded.range,
  })
  return csvFile(
    buildAnalyticsComparisonCsv(report.comparison),
    `voicedesk-campaigns-${loaded.filters.from}-to-${loaded.filters.to}.csv`,
  )
}

function csvFile(csv: string, filename: string) {
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
