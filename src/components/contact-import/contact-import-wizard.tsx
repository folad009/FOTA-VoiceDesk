"use client"

import { useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { importContactBatchAction } from "@/app/(app)/contacts/import/actions"
import { parseImportFile } from "@/server/contacts/parse-spreadsheet"
import {
  buildErrorReportCsv,
  detectColumnMapping,
  importableContacts,
  importSteps,
  isSupportedImportFile,
  mappingIsReady,
  rejectedCount,
  skippedCount,
  summarizeImport,
  validateImportRows,
  type ColumnMapping,
  type ImportStepId,
  type ParsedTable,
  type ReviewFilter,
} from "@/server/contacts/import-workflow"
import { ImportStepper } from "@/components/contact-import/import-stepper"
import { StepUpload } from "@/components/contact-import/step-upload"
import { StepMap } from "@/components/contact-import/step-map"
import { StepValidate } from "@/components/contact-import/step-validate"
import { StepReview } from "@/components/contact-import/step-review"
import { StepImport } from "@/components/contact-import/step-import"
import { Button } from "@/components/ui/button"
import { canSelectReachedStep } from "@/server/campaigns/wizard-draft"
import { Spinner } from "@/components/ui/spinner"

const BATCH_SIZE = 25
const emptyMapping = (): ColumnMapping => ({
  name: null,
  firstName: null,
  lastName: null,
  phone: null,
  email: null,
  group: null,
})

export function ContactImportWizard({ existingPhones }: { existingPhones: string[] }) {
  const [step, setStep] = useState<ImportStepId>("upload")
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<number | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [table, setTable] = useState<ParsedTable>({ headers: [], rows: [] })
  const [mapping, setMapping] = useState<ColumnMapping>(emptyMapping)
  const [filter, setFilter] = useState<ReviewFilter>("all")
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [imported, setImported] = useState(0)
  const [skipped, setSkipped] = useState(0)
  const [complete, setComplete] = useState(false)
  const [highestStep, setHighestStep] = useState(0)
  const importStarted = useRef(false)

  const validated = useMemo(
    () =>
      validateImportRows({
        rows: table.rows,
        mapping,
        existingPhones,
      }),
    [existingPhones, mapping, table.rows],
  )
  const summary = useMemo(() => summarizeImport(validated), [validated])
  const importable = useMemo(() => importableContacts(validated), [validated])
  const stepIndex = importSteps.findIndex((item) => item.id === step)

  const canContinue =
    step === "upload"
      ? table.rows.length > 0
      : step === "map"
        ? mappingIsReady(mapping)
        : step === "validate"
          ? summary.total > 0
          : step === "review"
            ? importable.length > 0 && !running
            : false

  async function handleFile(file: File) {
    if (!isSupportedImportFile(file.name)) {
      setParseError("Unsupported format. Use a CSV or XLSX file.")
      setFileName(null)
      setFileSize(null)
      setTable({ headers: [], rows: [] })
      return
    }
    setParseError(null)
    try {
      const parsed = await parseImportFile(file)
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        setParseError("No rows found in this file.")
        setFileName(file.name)
        setFileSize(file.size)
        setTable({ headers: [], rows: [] })
        return
      }
      setFileName(file.name)
      setFileSize(file.size)
      setTable(parsed)
      setMapping(detectColumnMapping(parsed.headers))
      setComplete(false)
      setImported(0)
      setSkipped(0)
      setProgress(0)
      importStarted.current = false
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Unable to read this file.")
      setTable({ headers: [], rows: [] })
    }
  }

  function clearFile() {
    setFileName(null)
    setFileSize(null)
    setParseError(null)
    setTable({ headers: [], rows: [] })
    setMapping(emptyMapping())
  }

  function goNext() {
    if (step === "review") {
      setStep("import")
      setHighestStep((current) => Math.max(current, stepIndex + 1))
      void runImport()
      return
    }
    const next = importSteps[stepIndex + 1]
    if (next && canContinue) {
      setStep(next.id)
      setHighestStep((current) => Math.max(current, stepIndex + 1))
    }
  }

  function goBack() {
    const previous = importSteps[stepIndex - 1]
    if (previous && !running) {
      setStep(previous.id)
    }
  }

  async function runImport() {
    if (importStarted.current) {
      return
    }
    importStarted.current = true
    setRunning(true)
    setComplete(false)
    setProgress(8)
    let importedCount = 0
    let skippedCountValue = skippedCount(summary)
    try {
      for (let index = 0; index < importable.length; index += BATCH_SIZE) {
        const batch = importable.slice(index, index + BATCH_SIZE)
        const result = await importContactBatchAction(batch)
        importedCount += result.imported
        skippedCountValue += result.skippedExisting
        setImported(importedCount)
        setSkipped(skippedCountValue)
        setProgress(Math.min(96, Math.round(((index + batch.length) / importable.length) * 100)))
      }
      setImported(importedCount)
      setSkipped(skippedCountValue)
      setProgress(100)
      setComplete(true)
      toast.success(`${importedCount.toLocaleString()} contacts imported`)
    } catch (error) {
      importStarted.current = false
      toast.error(error instanceof Error ? error.message : "Import failed")
    } finally {
      setRunning(false)
    }
  }

  function downloadErrors() {
    const csv = buildErrorReportCsv(validated)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "voicedesk-import-errors.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Audience
        </p>
        <h1 className="text-xl font-medium tracking-tight">Import contacts</h1>
        <p className="text-sm text-muted-foreground">
          Upload, map, validate, review, then write Nigerian mobile numbers into the directory.
        </p>
      </header>

      <ImportStepper
        current={step}
        onSelect={(next) => {
          const nextIndex = importSteps.findIndex((item) => item.id === next)
          if (!running && canSelectReachedStep(nextIndex, highestStep)) {
            setStep(next)
          }
        }}
      />

      <section className="min-w-0 rounded-md border border-border bg-card p-5 md:p-6">
        {step === "upload" ? (
          <StepUpload
            fileName={fileName}
            fileSize={fileSize}
            error={parseError}
            onFile={(file) => void handleFile(file)}
            onClear={clearFile}
          />
        ) : null}
        {step === "map" ? <StepMap table={table} mapping={mapping} onChange={setMapping} /> : null}
        {step === "validate" ? <StepValidate summary={summary} /> : null}
        {step === "review" ? (
          <StepReview rows={validated} filter={filter} onFilter={setFilter} />
        ) : null}
        {step === "import" ? (
          <StepImport
            running={running}
            complete={complete}
            progress={progress}
            imported={imported}
            skipped={skipped}
            rejected={rejectedCount(summary)}
            onDownloadErrors={downloadErrors}
            hasErrors={rejectedCount(summary) + skippedCount(summary) > 0}
          />
        ) : null}
      </section>

      <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <Button type="button" variant="ghost" onClick={goBack} disabled={stepIndex === 0 || running}>
          Back
        </Button>
        {step === "import" ? (
          <p className="text-sm text-muted-foreground">
            {complete ? "Directory updated." : "Please wait while contacts are imported."}
          </p>
        ) : (
          <Button type="button" onClick={goNext} disabled={!canContinue}>
            {running ? <Spinner data-icon="inline-start" /> : null}
            {step === "review"
              ? `Import ${importable.length.toLocaleString()} contacts`
              : "Continue"}
          </Button>
        )}
      </div>
    </div>
  )
}
