"use client"

import { useRef, useState } from "react"
import { FileSpreadsheetIcon, FileUpIcon, UploadIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "cn"

const TEMPLATE = `Name,Phone,Email,Group
Ada Okafor,08031234567,,Choir
Tunde Balogun,08021234567,,Ushers
`

export function StepUpload({
  fileName,
  fileSize,
  error,
  onFile,
  onClear,
}: {
  fileName: string | null
  fileSize: number | null
  error: string | null
  onFile: (file: File) => void
  onClear: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function accept(file: File | undefined) {
    if (!file) {
      return
    }
    onFile(file)
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "voicedesk-contacts-template.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-medium tracking-tight">Upload</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Start with a clean spreadsheet. We will map columns, validate Nigerian numbers, then import.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only"
        onChange={(event) => {
          accept(event.target.files?.[0])
          event.target.value = ""
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          accept(event.dataTransfer.files[0])
        }}
        className={cn(
          "flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center transition-colors",
          dragging && "border-primary bg-primary/5",
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-foreground">
          <UploadIcon />
        </span>
        <span className="text-base font-medium">Drop your contact file here</span>
        <span className="text-sm text-muted-foreground">or click to browse from your computer</span>
        <span className="mt-2 flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          <FileSpreadsheetIcon className="size-3.5" />
          Supported: CSV · XLSX
        </span>
      </button>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {fileName ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <FileUpIcon className="size-4 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{fileName}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {fileSize ? formatBytes(fileSize) : "Ready"}
              </p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClear} aria-label="Remove file">
            <XIcon />
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Use Nigerian mobile numbers (+234). Local 0-prefixed values such as 0803 123 4567 are converted to E.164.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
          Download CSV template
        </Button>
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
