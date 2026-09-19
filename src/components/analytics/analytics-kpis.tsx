import { formatCallClock } from "@/server/campaigns/command-center"
import {
  formatAnalyticsMinutes,
  formatAnalyticsRate,
  type AnalyticsKpis,
} from "@/server/analytics/compute"

export function AnalyticsKpis({ kpis }: { kpis: AnalyticsKpis }) {
  const items = [
    { label: "Total Calls", value: kpis.totalCalls.toLocaleString() },
    { label: "Answer Rate", value: formatAnalyticsRate(kpis.answerRate) },
    { label: "Completion Rate", value: formatAnalyticsRate(kpis.completionRate) },
    { label: "Failure Rate", value: formatAnalyticsRate(kpis.failureRate) },
    {
      label: "Average Duration",
      value:
        kpis.averageDurationSeconds === null
          ? "—"
          : formatCallClock(kpis.averageDurationSeconds),
    },
    { label: "Total Minutes", value: formatAnalyticsMinutes(kpis.totalMinutes) },
  ]

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex flex-col gap-1 border-r border-b border-border px-4 py-3 last:border-r-0"
            >
              <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {item.label}
              </div>
              <div className="text-xl font-medium tabular-nums tracking-tight text-foreground">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Total calls are started attempts. Answer rate is completed calls among reached
        attempts (completed, no answer, busy). Completion and failure rates use finished
        attempts. Average duration and minutes use completed talk time only.
      </p>
    </div>
  )
}
