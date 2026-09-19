import Link from "next/link"
import { SearchIcon, UsersIcon } from "lucide-react"

import {
  audienceFilterLabels,
  audienceFilters,
  type AudienceFilter,
} from "@/server/campaigns/command-center"
import type { CommandCenterRecipient } from "@/server/campaigns/get-command-center"
import { retryRecipientAction } from "@/app/(app)/campaigns/[id]/actions"
import { SectionEmpty } from "@/components/section-empty"
import {
  DataTableFrame,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/data-table"
import { CallStatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "cn"

export function AudienceTable({
  campaignId,
  filter,
  query,
  page,
  pageCount,
  total,
  rows,
}: {
  campaignId: string
  filter: AudienceFilter
  query: string
  page: number
  pageCount: number
  total: number
  rows: CommandCenterRecipient[]
}) {
  function hrefFor(next: { filter?: AudienceFilter; page?: number; query?: string }) {
    const params = new URLSearchParams()
    const nextFilter = next.filter ?? filter
    const nextQuery = next.query ?? query
    const nextPage = next.page ?? 1
    if (nextFilter !== "all") {
      params.set("status", nextFilter)
    }
    if (nextQuery) {
      params.set("q", nextQuery)
    }
    if (nextPage > 1) {
      params.set("page", String(nextPage))
    }
    const encoded = params.toString()
    return encoded ? `/campaigns/${campaignId}?${encoded}` : `/campaigns/${campaignId}`
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Audience
          </p>
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">
            {total.toLocaleString()} matching recipients
          </p>
        </div>
        <form className="flex w-full max-w-sm items-center gap-2" action={`/campaigns/${campaignId}`} method="get">
          {filter !== "all" ? <input type="hidden" name="status" value={filter} /> : null}
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Search name or number"
              className="pl-8"
              aria-label="Search recipients"
            />
          </div>
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
      </div>

      <div className="flex flex-wrap gap-1">
        {audienceFilters.map((item) => {
          const active = item === filter
          return (
            <Link
              key={item}
              href={hrefFor({ filter: item, page: 1 })}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {audienceFilterLabels[item]}
            </Link>
          )
        })}
      </div>

      {rows.length === 0 ? (
        <SectionEmpty
          compact
          icon={UsersIcon}
          title="No recipients in this view"
          description="Adjust filters or search, or add contacts when launching the campaign."
        />
      ) : (
        <DataTableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Last attempt</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{row.phone}</TableCell>
                  <TableCell>
                    <CallStatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="tabular-nums">{row.attempts}</TableCell>
                  <TableCell className="tabular-nums">{row.duration}</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {row.lastAttempt}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.canRetry ? (
                      <form action={retryRecipientAction}>
                        <input type="hidden" name="campaignId" value={campaignId} />
                        <input type="hidden" name="recipientId" value={row.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          Retry
                        </Button>
                      </form>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {pageCount > 1 ? (
            <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
              <p className="text-muted-foreground tabular-nums">
                Page {page} of {pageCount}
              </p>
              <div className="flex items-center gap-2">
                {page <= 1 ? (
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                ) : (
                  <Button asChild variant="outline" size="sm">
                    <Link href={hrefFor({ page: page - 1 })}>Previous</Link>
                  </Button>
                )}
                {page >= pageCount ? (
                  <Button variant="outline" size="sm" disabled>
                    Next
                  </Button>
                ) : (
                  <Button asChild variant="outline" size="sm">
                    <Link href={hrefFor({ page: page + 1 })}>Next</Link>
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </DataTableFrame>
      )}
    </section>
  )
}
