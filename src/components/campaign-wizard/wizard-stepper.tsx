import { CheckIcon } from "lucide-react"

import { wizardSteps, type WizardStepId } from "@/server/campaigns/wizard-draft"
import { cn } from "cn"

export function WizardStepper({
  current,
  onSelect,
}: {
  current: WizardStepId
  onSelect: (step: WizardStepId) => void
}) {
  const currentIndex = wizardSteps.findIndex((step) => step.id === current)

  return (
    <nav
      aria-label="Campaign setup"
      className="sticky top-0 z-20 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8"
    >
      <ol className="mx-auto flex max-w-[1400px] items-start gap-1 overflow-x-auto">
        {wizardSteps.map((step, index) => {
          const complete = index < currentIndex
          const active = step.id === current
          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center">
                <button
                type="button"
                aria-current={active ? "step" : undefined}
                onClick={() => onSelect(step.id)}
                className="flex min-w-0 items-center gap-2 rounded-md px-1 py-1 text-left"
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium tabular-nums",
                    active && "border-primary bg-primary text-primary-foreground",
                    complete && "border-success/30 bg-success/10 text-success",
                    !active && !complete && "border-border text-muted-foreground",
                  )}
                >
                  {complete ? <CheckIcon className="size-3.5" /> : step.number}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block truncate text-[11px] font-medium sm:text-xs",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                </span>
              </button>
              {index < wizardSteps.length - 1 ? (
                <span
                  className={cn(
                    "mx-1 hidden h-px flex-1 sm:block",
                    index < currentIndex ? "bg-success/40" : "bg-border",
                  )}
                />
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
