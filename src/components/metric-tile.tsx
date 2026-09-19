export function MetricTile({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="text-xs font-medium tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-2xl font-medium tabular-nums tracking-tight text-foreground">
        {value}
      </div>
    </div>
  )
}
