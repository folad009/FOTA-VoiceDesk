"use client"

import {
  importFieldLabels,
  importFields,
  type ColumnMapping,
  type ImportField,
  type ParsedTable,
} from "@/server/contacts/import-workflow"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DataTableFrame,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/data-table"

const UNMAPPED = "__unmapped__"

export function StepMap({
  table,
  mapping,
  onChange,
}: {
  table: ParsedTable
  mapping: ColumnMapping
  onChange: (mapping: ColumnMapping) => void
}) {
  const preview = table.rows.slice(0, 4)

  function setField(field: ImportField, value: string) {
    const header = value === UNMAPPED ? null : value
    const next: ColumnMapping = { ...mapping, [field]: header }
    if (header) {
      for (const other of importFields) {
        if (other !== field && next[other] === header) {
          next[other] = null
        }
      }
    }
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-medium tracking-tight">Map columns</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We detected likely matches. Confirm Phone, then Name or First Name, before validating.
        </p>
      </div>

      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        {importFields.map((field) => (
          <Field key={field}>
            <FieldLabel>
              {importFieldLabels[field]}
              {field === "phone" ? " *" : ""}
            </FieldLabel>
            <Select
              value={mapping[field] ?? UNMAPPED}
              onValueChange={(value) => setField(field, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Not mapped" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={UNMAPPED}>Not mapped</SelectItem>
                  {table.headers.map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        ))}
      </FieldGroup>

      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Preview
        </p>
        <DataTableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                {table.headers.map((header) => (
                  <TableHead key={header}>{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.map((row, index) => (
                <TableRow key={index}>
                  {table.headers.map((header) => (
                    <TableCell key={header} className="max-w-40 truncate">
                      {row[header] || "—"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableFrame>
      </div>
    </div>
  )
}
