"use client"

import Link from "next/link"
import { CircleCheckIcon, DownloadIcon, UsersIcon } from "lucide-react"

import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

export function StepImport({
  running,
  complete,
  progress,
  imported,
  skipped,
  rejected,
  onDownloadErrors,
  hasErrors,
}: {
  running: boolean
  complete: boolean
  progress: number
  imported: number
  skipped: number
  rejected: number
  onDownloadErrors: () => void
  hasErrors: boolean
}) {
  if (!complete && progress === 0 && !running) {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-medium tracking-tight">Import</h2>
        <p className="text-sm text-muted-foreground">
          Return to Review and choose Import to write validated contacts into the directory.
        </p>
      </div>
    )
  }

  if (running || (!complete && progress > 0)) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-base font-medium tracking-tight">Importing</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Writing validated contacts into the directory. Duplicate numbers are skipped.
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Import in progress</p>
            <span className="text-sm tabular-nums text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Spinner />
            Creating contacts and group memberships
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CircleCheckIcon />
          </EmptyMedia>
          <EmptyTitle>Import complete</EmptyTitle>
          <EmptyDescription>
            {imported.toLocaleString()} contacts imported successfully.
            <br />
            {skipped.toLocaleString()} duplicates skipped.
            <br />
            {rejected.toLocaleString()} invalid records rejected.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={onDownloadErrors} disabled={!hasErrors}>
          <DownloadIcon data-icon="inline-start" />
          Download error report
        </Button>
        <Button asChild>
          <Link href="/contacts">
            <UsersIcon data-icon="inline-start" />
            View contacts
          </Link>
        </Button>
      </div>
    </div>
  )
}
