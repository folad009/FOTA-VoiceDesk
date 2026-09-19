import { cn } from "cn"

import {
  formatProgressPercent,
  type CampaignProgress,
} from "@/server/campaigns/command-center"

export function ProgressPanel({ progress }: { progress: CampaignProgress }) {
  const processedShare = progress.total === 0 ? 0 : (progress.processed / progress.total) * 100

  return (
    <section className="rounded-md border border-border bg-card p-5 md:p-6">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        Campaign progress
      </p>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-4xl font-medium tracking-tight tabular-nums text-foreground">
            {formatProgressPercent(progress.progressPercent)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {progress.processed.toLocaleString()} processed
          </p>
        </div>
        <p className="text-sm tabular-nums text-muted-foreground">
          {progress.total.toLocaleString()} recipients
        </p>
      </div>

      <div
        className="mt-5 h-3 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.progressPercent}
        aria-label={`${formatProgressPercent(progress.progressPercent)} processed`}
      >
        <div
          className={cn("flex h-full", processedShare === 0 && "w-0")}
          style={{ width: `${processedShare}%` }}
        >
          <Segment className="bg-primary" value={progress.answered} total={progress.processed} />
          <Segment className="bg-primary/50" value={progress.noAnswer} total={progress.processed} />
          <Segment className="bg-warning" value={progress.busy} total={progress.processed} />
          <Segment className="bg-destructive" value={progress.failed} total={progress.processed} />
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Answered" value={progress.answered} />
        <Stat label="No answer" value={progress.noAnswer} />
        <Stat label="Busy" value={progress.busy} />
        <Stat label="Failed" value={progress.failed} />
        <Stat label="Pending" value={progress.pending} />
      </dl>
    </section>
  )
}

function Segment({
  className,
  value,
  total,
}: {
  className: string
  value: number
  total: number
}) {
  if (value === 0 || total === 0) {
    return null
  }
  return <span className={cn("h-full", className)} style={{ width: `${(value / total) * 100}%` }} />
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted/40 px-3 py-2">
      <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-1 text-xl font-medium tabular-nums tracking-tight text-foreground">
        {value.toLocaleString()}
      </dd>
    </div>
  )
}
