import Link from "next/link"
import { DownloadIcon } from "lucide-react"

import { campaignStatuses } from "@/domain/status"
import { campaignTypeLabels, campaignTypes } from "@/server/campaigns/wizard-draft"
import type { AnalyticsCampaignOption, AnalyticsFilters } from "@/server/analytics/get-analytics"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const statusLabels: Record<(typeof campaignStatuses)[number], string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  QUEUED: "Queued",
  RUNNING: "Running",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  FAILED: "Failed",
}

export function AnalyticsFilters({
  filters,
  campaigns,
}: {
  filters: AnalyticsFilters
  campaigns: AnalyticsCampaignOption[]
}) {
  const query = new URLSearchParams()
  query.set("from", filters.from)
  query.set("to", filters.to)
  if (filters.campaignId) {
    query.set("campaign", filters.campaignId)
  }
  if (filters.campaignType) {
    query.set("type", filters.campaignType)
  }
  if (filters.campaignStatus) {
    query.set("status", filters.campaignStatus)
  }
  const exportBase = `/analytics/export?${query.toString()}`

  return (
    <form method="get" className="flex flex-col gap-4 rounded-md border border-border bg-card p-4">
      <FieldGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Field>
          <FieldLabel htmlFor="from">From</FieldLabel>
          <Input id="from" name="from" type="date" defaultValue={filters.from} />
        </Field>
        <Field>
          <FieldLabel htmlFor="to">To</FieldLabel>
          <Input id="to" name="to" type="date" defaultValue={filters.to} />
        </Field>
        <Field>
          <FieldLabel htmlFor="campaign">Campaign</FieldLabel>
          <select
            id="campaign"
            name="campaign"
            defaultValue={filters.campaignId}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">All campaigns</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="type">Campaign type</FieldLabel>
          <select
            id="type"
            name="type"
            defaultValue={filters.campaignType}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">All types</option>
            {campaignTypes.map((type) => (
              <option key={type} value={type}>
                {campaignTypeLabels[type]}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="status">Status</FieldLabel>
          <select
            id="status"
            name="status"
            defaultValue={filters.campaignStatus}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">All statuses</option>
            {campaignStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </Field>
      </FieldGroup>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit">Apply filters</Button>
        <Button variant="outline" asChild>
          <Link href={`${exportBase}&kind=table`}>
            <DownloadIcon data-icon="inline-start" />
            Export table
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`${exportBase}&kind=calls`}>
            <DownloadIcon data-icon="inline-start" />
            Export call records
          </Link>
        </Button>
      </div>
    </form>
  )
}
