import type { Metadata } from "next"
import { GlobeIcon } from "lucide-react"

import {
  APP_LOCALE,
  APP_PHONE_CALLING_CODE,
  APP_PHONE_COUNTRY,
  APP_TIMEZONE,
} from "@/config/locale"
import { formatLagosDateTime } from "@/lib/datetime"
import { PageHeader } from "@/components/page-header"

export const metadata: Metadata = {
  title: "Settings",
}

export default function SettingsPage() {
  const example = formatLagosDateTime(new Date("2026-09-16T17:00:00.000Z"))

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Settings"
        description="Workspace defaults for this operations console."
      />
      <section className="rounded-md border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-9 items-center justify-center rounded-md bg-muted text-foreground">
            <GlobeIcon className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-medium">Workspace locale</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Dates, calling hours, and phone numbers follow Nigerian conventions.
            </p>
          </div>
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <LocaleItem label="Timezone" value={`${APP_TIMEZONE} (WAT)`} />
          <LocaleItem label="Phone country" value={`Nigeria (${APP_PHONE_CALLING_CODE})`} />
          <LocaleItem label="Language" value={`English (${APP_LOCALE})`} />
          <LocaleItem label="Date example" value={example} />
        </dl>
        <p className="mt-5 text-xs text-muted-foreground">
          Phone country {APP_PHONE_COUNTRY} is applied to contact import and campaign
          recipients.
        </p>
      </section>
    </div>
  )
}

function LocaleItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm tabular-nums text-foreground">{value}</dd>
    </div>
  )
}
