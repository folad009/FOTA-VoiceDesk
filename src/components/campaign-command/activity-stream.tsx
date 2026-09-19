import { RadioIcon } from "lucide-react"

import type { CommandCenterActivity } from "@/server/campaigns/get-command-center"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SectionEmpty } from "@/components/section-empty"

export function ActivityStream({ items }: { items: CommandCenterActivity[] }) {
  return (
    <section className="flex min-h-[320px] flex-col rounded-md border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Live activity
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Updates as webhook events arrive</p>
        </div>
      </header>
      {items.length === 0 ? (
        <div className="flex flex-1 items-center p-4">
          <SectionEmpty
            compact
            icon={RadioIcon}
            title="No call events yet"
            description="Answered, failed, and retry events will stream here once dialing starts."
          />
        </div>
      ) : (
        <ScrollArea className="max-h-[420px]">
          <ol className="flex flex-col">
            {items.map((item) => (
              <li
                key={item.id}
                className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 border-b border-border px-4 py-3 last:border-b-0"
              >
                <time className="pt-0.5 text-xs tabular-nums text-muted-foreground">
                  {item.clock}
                </time>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{item.phone}</p>
                  {item.detail ? (
                    <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </ScrollArea>
      )}
    </section>
  )
}
