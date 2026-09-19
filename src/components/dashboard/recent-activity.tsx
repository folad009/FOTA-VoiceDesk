import type { ActivityItem } from "@/server/dashboard/get-dashboard-data"

export function RecentActivityList({ items }: { items: ActivityItem[] }) {
  return (
    <ol className="overflow-hidden rounded-md border border-border bg-card">
      {items.map((item, index) => (
        <li
          key={item.id}
          className={
            index === 0
              ? "flex items-start justify-between gap-4 px-4 py-3"
              : "flex items-start justify-between gap-4 border-t border-border px-4 py-3"
          }
        >
          <p className="text-sm text-foreground">{item.copy}</p>
          <p className="shrink-0 text-xs text-muted-foreground">{item.relativeTime}</p>
        </li>
      ))}
    </ol>
  )
}
