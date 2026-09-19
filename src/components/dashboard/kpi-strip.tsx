export function KpiStrip({
  items,
}: {
  items: Array<{ label: string; value: string }>
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex flex-col gap-1 border-r border-b border-border px-4 py-3 max-sm:last:col-span-2 last:border-r-0"
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
  )
}
