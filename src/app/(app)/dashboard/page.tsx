import type { Metadata } from "next"
import { ActivityIcon, MegaphoneIcon } from "lucide-react"

import { DashboardErrorState } from "@/components/dashboard/dashboard-error"
import { KpiStrip } from "@/components/dashboard/kpi-strip"
import { LiveCampaignCardView } from "@/components/dashboard/live-campaign-card"
import { RecentActivityList } from "@/components/dashboard/recent-activity"
import { RecentCampaignsTable } from "@/components/dashboard/recent-campaigns"
import { SectionEmpty } from "@/components/section-empty"
import { loadDashboard } from "@/server/dashboard/get-dashboard-data"

export const metadata: Metadata = {
  title: "Operations",
}

export default async function DashboardPage() {
  const result = await loadDashboard()

  if (!result.ok) {
    return (
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-xl font-medium tracking-tight text-foreground">
            Operations
          </h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening across your voice campaigns.
          </p>
        </header>
        <DashboardErrorState message={result.message} />
      </div>
    )
  }

  const { data } = result

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-medium tracking-tight text-foreground">
          {data.greeting}
        </h1>
        <p className="text-sm text-muted-foreground">{data.subtitle}</p>
      </header>

      <KpiStrip
        items={[
          { label: "Calls Today", value: data.kpis.callsToday },
          { label: "Successful Calls", value: data.kpis.successfulCalls },
          { label: "Answer Rate", value: data.kpis.answerRate },
          { label: "Active Campaigns", value: data.kpis.activeCampaigns },
          { label: "Minutes Used", value: data.kpis.minutesUsed },
        ]}
      />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-foreground">Live Campaigns</h2>
          {data.liveCampaigns.some((campaign) => campaign.isLive) ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/70" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
              Live activity
            </p>
          ) : null}
        </div>
        {data.liveCampaigns.length === 0 ? (
          <SectionEmpty
            icon={MegaphoneIcon}
            title="No campaigns running"
            description="Live progress appears here when a campaign is queued, running, or paused. Import contacts, then create a campaign, to start calling."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {data.liveCampaigns.map((campaign) => (
              <LiveCampaignCardView key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.8fr)]">
        <section className="flex min-w-0 flex-col gap-3">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Recent Campaigns
          </h2>
          {data.recentCampaigns.length === 0 ? (
            <SectionEmpty
              icon={MegaphoneIcon}
              title="No campaigns yet"
              description="Campaigns you create will list here with audience, answer rate, and status."
              compact
            />
          ) : (
            <div className="overflow-x-auto">
              <RecentCampaignsTable rows={data.recentCampaigns} />
            </div>
          )}
        </section>

        <section className="flex min-w-0 flex-col gap-3">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Recent Activity
          </h2>
          {data.activity.length === 0 ? (
            <SectionEmpty
              icon={ActivityIcon}
              title="No activity yet"
              description="Campaign starts, completed calls, answers, and retry cycles will appear here from the audit log."
              compact
            />
          ) : (
            <RecentActivityList items={data.activity} />
          )}
        </section>
      </div>
    </div>
  )
}
