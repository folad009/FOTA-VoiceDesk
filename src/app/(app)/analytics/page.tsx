import type { Metadata } from "next"

import { AnalyticsCharts } from "@/components/analytics/analytics-charts"
import { AnalyticsComparisonTable } from "@/components/analytics/analytics-comparison"
import { AnalyticsFilters } from "@/components/analytics/analytics-filters"
import { AnalyticsKpis } from "@/components/analytics/analytics-kpis"
import { DashboardErrorState } from "@/components/dashboard/dashboard-error"
import { PageHeader } from "@/components/page-header"
import { getAnalyticsPageData } from "@/server/analytics/get-analytics"

export const metadata: Metadata = {
  title: "Campaign Analytics",
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string
    to?: string
    campaign?: string
    type?: string
    status?: string
  }>
}) {
  try {
    const params = await searchParams
    const data = await getAnalyticsPageData(params)

    return (
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Campaign analytics"
          description="How effective are our voice campaigns? Every figure below is counted from started call attempts in Africa/Lagos."
        />
        <AnalyticsFilters filters={data.filters} campaigns={data.campaigns} />
        <AnalyticsKpis kpis={data.report.kpis} />
        <AnalyticsCharts report={data.report} />
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-medium">Campaign comparison</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Recipients are unique people called in this range. Retries are attempts numbered 2 or higher.
            </p>
          </div>
          <AnalyticsComparisonTable rows={data.report.comparison} />
        </section>
      </div>
    )
  } catch (error) {
    console.error("Analytics page failed", error)
    return (
      <DashboardErrorState message="Unable to load campaign analytics. Check that the database is available." />
    )
  }
}
