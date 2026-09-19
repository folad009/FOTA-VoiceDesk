import Link from "next/link"

import type { LiveCampaignCard } from "@/server/dashboard/compute-live-campaign"
import { CampaignStatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

export function LiveCampaignCardView({ campaign }: { campaign: LiveCampaignCard }) {
  return (
    <article className="flex flex-col gap-4 rounded-md border border-border bg-card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {campaign.isLive ? (
              <span className="relative flex size-2" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
            ) : (
              <span className="size-2 rounded-full bg-muted-foreground/40" aria-hidden="true" />
            )}
            <h3 className="truncate text-base font-medium text-foreground">
              {campaign.name}
            </h3>
          </div>
          <div className="mt-2">
            <CampaignStatusBadge status={campaign.status} />
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/campaigns/${campaign.id}`}>View Campaign</Link>
        </Button>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <p className="tabular-nums text-foreground">
            {campaign.processed.toLocaleString()} / {campaign.total.toLocaleString()} processed
          </p>
          <p className="text-xs text-muted-foreground">
            Est. completion {campaign.estimatedCompletion}
          </p>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={campaign.progressPercent}
          aria-label={`${campaign.progressPercent}% processed`}
        >
          <div
            className={cn(
              "h-full rounded-full bg-primary transition-[width]",
              campaign.progressPercent === 0 && "w-0",
            )}
            style={{ width: `${campaign.progressPercent}%` }}
          />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Outcome label="answered" value={campaign.answered} />
        <Outcome label="no answer" value={campaign.noAnswer} />
        <Outcome label="busy" value={campaign.busy} />
        <Outcome label="failed" value={campaign.failed} />
      </dl>
    </article>
  )
}

function Outcome({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 tabular-nums text-foreground">{value.toLocaleString()}</dd>
    </div>
  )
}
