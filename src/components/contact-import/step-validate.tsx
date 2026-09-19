"use client"

import type { ImportSummary } from "@/server/contacts/import-workflow"
import { MetricTile } from "@/components/metric-tile"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CircleCheckIcon } from "lucide-react"

export function StepValidate({ summary }: { summary: ImportSummary }) {
  const ready = summary.valid > 0
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-medium tracking-tight">Validate</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every row was checked against Nigerian E.164 rules, missing fields, and the current directory.
        </p>
      </div>

      <Alert>
        <CircleCheckIcon />
        <AlertTitle>
          {summary.total.toLocaleString()} rows processed
        </AlertTitle>
        <AlertDescription>
          {ready
            ? `${summary.valid.toLocaleString()} contacts are ready to import.`
            : "No rows are ready to import. Review the issues below before continuing."}
        </AlertDescription>
      </Alert>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricTile label="Rows" value={summary.total.toLocaleString()} />
        <MetricTile label="Valid" value={summary.valid.toLocaleString()} />
        <MetricTile label="Duplicates" value={summary.duplicates.toLocaleString()} />
        <MetricTile label="Invalid" value={summary.invalid.toLocaleString()} />
        <MetricTile label="Missing phone numbers" value={summary.missingPhone.toLocaleString()} />
        <MetricTile label="Existing contacts" value={summary.existing.toLocaleString()} />
      </div>

      {summary.missingName > 0 || summary.unsupported > 0 ? (
        <p className="text-sm text-muted-foreground">
          {summary.missingName > 0
            ? `${summary.missingName.toLocaleString()} missing names. `
            : null}
          {summary.unsupported > 0
            ? `${summary.unsupported.toLocaleString()} unsupported formats.`
            : null}
        </p>
      ) : null}
    </div>
  )
}
