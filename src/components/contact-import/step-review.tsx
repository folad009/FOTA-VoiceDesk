"use client"

import { useMemo } from "react"

import {
  importStatusLabel,
  matchesReviewFilter,
  reviewFilterLabels,
  reviewFilters,
  type ReviewFilter,
  type ValidatedImportRow,
} from "@/server/contacts/import-workflow"
import {
  DataTableFrame,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { SectionEmpty } from "@/components/section-empty"
import { ListFilterIcon } from "lucide-react"

export function StepReview({
  rows,
  filter,
  onFilter,
}: {
  rows: ValidatedImportRow[]
  filter: ReviewFilter
  onFilter: (filter: ReviewFilter) => void
}) {
  const visible = useMemo(
    () => rows.filter((row) => matchesReviewFilter(row.status, filter)),
    [filter, rows],
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-base font-medium tracking-tight">Review</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Inspect each row before anything is written to the directory.
          </p>
        </div>
        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(value) => {
            if (value && reviewFilters.includes(value as ReviewFilter)) {
              onFilter(value as ReviewFilter)
            }
          }}
          variant="outline"
          size="sm"
          spacing={0}
          className="flex-wrap"
        >
          {reviewFilters.map((item) => (
            <ToggleGroupItem key={item} value={item}>
              {reviewFilterLabels[item]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {visible.length === 0 ? (
        <SectionEmpty
          icon={ListFilterIcon}
          title="No rows in this filter"
          description="Choose another validation status to inspect the spreadsheet."
        />
      ) : (
        <DataTableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Row</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.slice(0, 100).map((row) => (
                <TableRow key={row.rowNumber}>
                  <TableCell className="tabular-nums text-muted-foreground">{row.rowNumber}</TableCell>
                  <TableCell className="font-medium">{row.name || "—"}</TableCell>
                  <TableCell className="tabular-nums">{row.phoneRaw || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(row.status)}>{importStatusLabel(row.status)}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableFrame>
      )}
      {visible.length > 100 ? (
        <p className="text-xs text-muted-foreground">
          Showing the first 100 of {visible.length.toLocaleString()} matching rows.
        </p>
      ) : null}
    </div>
  )
}

function statusVariant(status: ValidatedImportRow["status"]) {
  switch (status) {
    case "valid":
      return "success" as const
    case "duplicate":
    case "existing":
      return "warning" as const
    case "invalid_phone":
    case "missing_phone":
    case "missing_name":
    case "unsupported_format":
      return "destructive" as const
  }
}
