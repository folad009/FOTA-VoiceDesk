import { CheckIcon, CircleIcon } from "lucide-react"

import type { ReadinessCheck } from "@/server/campaigns/wizard-draft"
import { reviewCopy, type WizardDraft } from "@/server/campaigns/wizard-draft"
import type { WizardClonedVoice } from "@/server/campaigns/get-wizard-options"
import { cn } from "cn"

export function StepReview({
  draft,
  recipientCount,
  checks,
  clonedVoices = [],
}: {
  draft: WizardDraft
  recipientCount: number
  checks: ReadinessCheck[]
  clonedVoices?: WizardClonedVoice[]
}) {
  const copy = reviewCopy(draft, recipientCount, clonedVoices)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <ReviewBlock label="Campaign" value={copy.campaign} />
        <ReviewBlock label="Audience" value={copy.audience} />
        <ReviewBlock label="Voice message" value={copy.voice} hint={copy.voiceMeta} />
        <ReviewBlock
          label="Calling rules"
          value={copy.rules}
          hint={`${copy.retry} · ${copy.hours}`}
        />
        <ReviewBlock
          label="Schedule"
          value={copy.scheduleDate}
          hint={[copy.scheduleTime, copy.timezone].filter(Boolean).join(" · ")}
          className="sm:col-span-2"
        />
      </div>

      <section className="rounded-md border border-border bg-card p-5">
        <h3 className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Readiness check
        </h3>
        <ul className="mt-4 flex flex-col gap-3">
          {checks.map((check) => (
            <li key={check.id} className="flex items-center gap-3 text-sm">
              {check.ok ? (
                <CheckIcon className="size-4 text-success" />
              ) : (
                <CircleIcon className="size-4 text-muted-foreground" />
              )}
              <span className={cn(check.ok ? "text-foreground" : "text-muted-foreground")}>
                {check.label}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function ReviewBlock({
  label,
  value,
  hint,
  className,
}: {
  label: string
  value: string
  hint?: string
  className?: string
}) {
  return (
    <div className={cn("rounded-md border border-border bg-card p-4", className)}>
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-2 text-base font-medium text-foreground">{value || "—"}</p>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
