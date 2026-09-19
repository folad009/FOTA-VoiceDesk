import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ActivityStream } from "@/components/campaign-command/activity-stream"
import { AnalyticsPanel } from "@/components/campaign-command/analytics-panel"
import { AudienceTable } from "@/components/campaign-command/audience-table"
import { CommandActions } from "@/components/campaign-command/command-actions"
import { LiveRefresher } from "@/components/campaign-command/live-refresher"
import { ProgressPanel } from "@/components/campaign-command/progress-panel"
import { DashboardErrorState } from "@/components/dashboard/dashboard-error"
import { CampaignStatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { cn } from "cn"
import { getCommandCenterData } from "@/server/campaigns/get-command-center"
import { prisma } from "@/server/db/prisma"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: { name: true },
    })
    return { title: campaign?.name ?? "Campaign" }
  } catch {
    return { title: "Campaign" }
  }
}

export default async function CampaignCommandPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ status?: string; q?: string; page?: string }>
}) {
  const { id } = await params
  const query = await searchParams

  let data
  try {
    data = await getCommandCenterData(id, {
      filter: query.status,
      query: query.q,
      page: query.page,
    })
  } catch (error) {
    console.error("Command center failed", error)
    return (
      <DashboardErrorState message="Unable to load this campaign. Check that the database is available." />
    )
  }

  if (!data) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-8">
      <LiveRefresher enabled={data.campaign.isLive} />

      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Campaign command
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span
              className={cn(
                "relative flex size-2",
                data.campaign.status === "RUNNING" ? "text-primary" : "text-muted-foreground",
              )}
              aria-hidden="true"
            >
              {data.campaign.status === "RUNNING" ? (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
              ) : null}
              <span
                className={cn(
                  "relative inline-flex size-2 rounded-full",
                  data.campaign.status === "RUNNING" ? "bg-primary" : "bg-muted-foreground/40",
                )}
              />
            </span>
            <h1 className="text-xl font-medium tracking-tight text-foreground">
              {data.campaign.name}
            </h1>
            <CampaignStatusBadge status={data.campaign.status} />
          </div>
          {data.campaign.description ? (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {data.campaign.description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <CommandActions
            campaignId={data.campaign.id}
            actions={data.actions}
            retryableCount={data.progress.failed + data.progress.noAnswer + data.progress.busy}
          />
          <Button asChild variant="ghost" size="sm">
            <Link href="/campaigns">All campaigns</Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
        <ProgressPanel progress={data.progress} />
        <ActivityStream items={data.activity} />
      </div>

      <AudienceTable
        campaignId={data.campaign.id}
        filter={data.audience.filter}
        query={data.audience.query}
        page={data.audience.page}
        pageCount={data.audience.pageCount}
        total={data.audience.total}
        rows={data.audience.rows}
      />

      <AnalyticsPanel analytics={data.analytics} />
    </div>
  )
}
