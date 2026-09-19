import type { Metadata } from "next"
import { ActivityIcon } from "lucide-react"

import { getActivityLog } from "@/server/activity/get-activity-log"
import { DashboardErrorState } from "@/components/dashboard/dashboard-error"
import { PageHeader } from "@/components/page-header"
import { SectionEmpty } from "@/components/section-empty"

export const metadata: Metadata = {
  title: "Activity Log",
}

export default async function ActivityPage() {
  try {
    const rows = await getActivityLog()
    return (
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Activity log"
          description="Operator actions for campaigns, imports, and voice messages."
        />
        {rows.length === 0 ? (
          <SectionEmpty
            icon={ActivityIcon}
            title="No activity recorded"
            description="Campaign launches, retries, and contact imports will appear here."
          />
        ) : (
          <ol className="divide-y divide-border rounded-md border border-border bg-card">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{row.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {row.detail} · {row.actor}
                  </p>
                </div>
                <p className="shrink-0 text-xs text-muted-foreground">{row.relativeTime}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    )
  } catch (error) {
    console.error("Activity log failed", error)
    return (
      <DashboardErrorState message="Unable to load the activity log. Check that the database is available." />
    )
  }
}
