import {
  formatCallClock,
  formatProgressPercent,
  type CampaignAnalytics,
} from "@/server/campaigns/command-center"

export function AnalyticsPanel({ analytics }: { analytics: CampaignAnalytics }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Campaign analytics
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Outcome rates from this campaign’s recipients and completed talk time.
        </p>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          label="Answer rate"
          value={analytics.answerRate === null ? "—" : formatProgressPercent(analytics.answerRate)}
        />
        <Tile
          label="Failure rate"
          value={analytics.failureRate === null ? "—" : formatProgressPercent(analytics.failureRate)}
        />
        <Tile
          label="Average talk time"
          value={
            analytics.averageTalkSeconds === null
              ? "—"
              : formatCallClock(analytics.averageTalkSeconds)
          }
        />
        <Tile
          label="Attempts / recipient"
          value={
            analytics.averageAttempts === null ? "—" : analytics.averageAttempts.toFixed(1)
          }
        />
      </dl>
    </section>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card px-4 py-3">
      <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-2 text-2xl font-medium tabular-nums tracking-tight text-foreground">
        {value}
      </dd>
    </div>
  )
}
