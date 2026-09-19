import { parseNigerianPhone } from "@/lib/phone"

export const importFields = [
  "name",
  "firstName",
  "lastName",
  "phone",
  "email",
  "group",
] as const

export type ImportField = (typeof importFields)[number]

export const importFieldLabels: Record<ImportField, string> = {
  name: "Name",
  firstName: "First Name",
  lastName: "Last Name",
  phone: "Phone",
  email: "Email",
  group: "Group",
}

export const importSteps = [
  { id: "upload", number: "01", label: "Upload" },
  { id: "map", number: "02", label: "Map" },
  { id: "validate", number: "03", label: "Validate" },
  { id: "review", number: "04", label: "Review" },
  { id: "import", number: "05", label: "Import" },
] as const

export type ImportStepId = (typeof importSteps)[number]["id"]

export const reviewFilters = [
  "all",
  "valid",
  "duplicate",
  "existing",
  "invalid",
  "missing",
] as const

export type ReviewFilter = (typeof reviewFilters)[number]

export const reviewFilterLabels: Record<ReviewFilter, string> = {
  all: "All",
  valid: "Valid",
  duplicate: "Duplicates",
  existing: "Existing",
  invalid: "Invalid",
  missing: "Missing",
}

export type ColumnMapping = Record<ImportField, string | null>

export type ParsedTable = {
  headers: string[]
  rows: Record<string, string>[]
}

export type ImportRowStatus =
  | "valid"
  | "duplicate"
  | "existing"
  | "invalid_phone"
  | "missing_phone"
  | "missing_name"
  | "unsupported_format"

export type ValidatedImportRow = {
  rowNumber: number
  name: string
  phoneRaw: string
  phoneE164: string | null
  email: string | null
  group: string | null
  status: ImportRowStatus
  reason: string
}

export type ImportSummary = {
  total: number
  valid: number
  duplicates: number
  existing: number
  invalid: number
  missingPhone: number
  missingName: number
  unsupported: number
}

export type ImportableContact = {
  name: string
  phoneE164: string
  email: string | null
  group: string | null
}

const FIELD_ALIASES: Record<ImportField, string[]> = {
  name: ["name", "full name", "fullname", "contact name", "recipient", "contact"],
  firstName: ["first name", "firstname", "first", "given name", "givenname"],
  lastName: ["last name", "lastname", "last", "surname", "family name", "familyname"],
  phone: [
    "phone",
    "phone number",
    "phonenumber",
    "mobile",
    "mobile number",
    "tel",
    "telephone",
    "cell",
    "msisdn",
    "e164",
    "e.164",
  ],
  email: ["email", "email address", "e-mail", "mail"],
  group: ["group", "audience", "list", "tag", "category", "segment"],
}

const STATUS_LABEL: Record<ImportRowStatus, string> = {
  valid: "Valid",
  duplicate: "Duplicate",
  existing: "Existing contact",
  invalid_phone: "Invalid",
  missing_phone: "Missing phone",
  missing_name: "Missing name",
  unsupported_format: "Unsupported format",
}

export function isSupportedImportFile(fileName: string): boolean {
  return /\.(csv|xlsx)$/i.test(fileName.trim())
}

export function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    name: null,
    firstName: null,
    lastName: null,
    phone: null,
    email: null,
    group: null,
  }
  const used = new Set<string>()

  for (const field of importFields) {
    const match = headers.find((header) => {
      if (used.has(header)) {
        return false
      }
      const normalized = normalizeHeader(header)
      return FIELD_ALIASES[field].some((alias) => normalizeHeader(alias) === normalized)
    })
    if (match) {
      mapping[field] = match
      used.add(match)
    }
  }

  return mapping
}

export function mappingIsReady(mapping: ColumnMapping): boolean {
  const hasName = Boolean(mapping.name || mapping.firstName)
  return Boolean(mapping.phone) && hasName
}

export function composeDisplayName(input: {
  name: string
  firstName: string
  lastName: string
}): string {
  const full = input.name.trim()
  if (full) {
    return full
  }
  return [input.firstName, input.lastName].map((part) => part.trim()).filter(Boolean).join(" ")
}

export function parseCsvTable(text: string): ParsedTable {
  const cleaned = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const lines = splitCsvLines(cleaned)
  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }
  const delimiter = detectDelimiter(lines[0] ?? "")
  const records = lines.map((line) => splitCsvRecord(line, delimiter))
  const headers = (records[0] ?? []).map((header) => header.trim()).filter((header) => header.length > 0)
  const rows: Record<string, string>[] = []

  for (const record of records.slice(1)) {
    const values = Object.fromEntries(headers.map((header, index) => [header, (record[index] ?? "").trim()]))
    if (Object.values(values).every((value) => value.length === 0)) {
      continue
    }
    rows.push(values)
  }

  return { headers, rows }
}

export function validateImportRows(input: {
  rows: Record<string, string>[]
  mapping: ColumnMapping
  existingPhones: string[]
}): ValidatedImportRow[] {
  const seen = new Set<string>()
  const existing = new Set(input.existingPhones)

  return input.rows.map((raw, index) => {
    const phoneRaw = readMapped(raw, input.mapping.phone)
    const name = composeDisplayName({
      name: readMapped(raw, input.mapping.name),
      firstName: readMapped(raw, input.mapping.firstName),
      lastName: readMapped(raw, input.mapping.lastName),
    })
    const email = emptyToNull(readMapped(raw, input.mapping.email))
    const group = emptyToNull(readMapped(raw, input.mapping.group))
    const rowNumber = index + 2

    if (!phoneRaw) {
      return row(rowNumber, name, phoneRaw, null, email, group, "missing_phone", "Missing phone number")
    }
    if (!looksLikePhone(phoneRaw)) {
      return row(
        rowNumber,
        name,
        phoneRaw,
        null,
        email,
        group,
        "unsupported_format",
        "Unsupported format",
      )
    }
    const phoneE164 = parseNigerianPhone(phoneRaw)
    if (!phoneE164) {
      return row(
        rowNumber,
        name,
        phoneRaw,
        null,
        email,
        group,
        "invalid_phone",
        "Invalid Nigerian phone number",
      )
    }
    if (!name) {
      return row(rowNumber, name, phoneRaw, phoneE164, email, group, "missing_name", "Missing name")
    }
    if (seen.has(phoneE164)) {
      return row(
        rowNumber,
        name,
        phoneRaw,
        phoneE164,
        email,
        group,
        "duplicate",
        "Duplicate phone number",
      )
    }
    seen.add(phoneE164)
    if (existing.has(phoneE164)) {
      return row(
        rowNumber,
        name,
        phoneRaw,
        phoneE164,
        email,
        group,
        "existing",
        "Existing contact",
      )
    }
    return row(rowNumber, name, phoneRaw, phoneE164, email, group, "valid", "Ready to import")
  })
}

export function summarizeImport(rows: ValidatedImportRow[]): ImportSummary {
  return {
    total: rows.length,
    valid: countStatus(rows, "valid"),
    duplicates: countStatus(rows, "duplicate"),
    existing: countStatus(rows, "existing"),
    invalid: countStatus(rows, "invalid_phone"),
    missingPhone: countStatus(rows, "missing_phone"),
    missingName: countStatus(rows, "missing_name"),
    unsupported: countStatus(rows, "unsupported_format"),
  }
}

export function importableContacts(rows: ValidatedImportRow[]): ImportableContact[] {
  return rows
    .filter((row) => row.status === "valid" && row.phoneE164)
    .map((row) => ({
      name: row.name,
      phoneE164: row.phoneE164 as string,
      email: row.email,
      group: row.group,
    }))
}

export function buildErrorReportCsv(rows: ValidatedImportRow[]): string {
  const rejected = rows.filter((row) => row.status !== "valid")
  const header = "Row,Name,Phone,Status,Reason"
  const body = rejected.map((row) =>
    [row.rowNumber, csvCell(row.name), csvCell(row.phoneRaw), csvCell(STATUS_LABEL[row.status]), csvCell(row.reason)].join(
      ",",
    ),
  )
  return [header, ...body].join("\n")
}

export function importStatusLabel(status: ImportRowStatus): string {
  return STATUS_LABEL[status]
}

export function skippedCount(summary: ImportSummary): number {
  return summary.duplicates + summary.existing
}

export function rejectedCount(summary: ImportSummary): number {
  return summary.invalid + summary.missingPhone + summary.missingName + summary.unsupported
}

export function matchesReviewFilter(status: ImportRowStatus, filter: ReviewFilter): boolean {
  switch (filter) {
    case "all":
      return true
    case "valid":
      return status === "valid"
    case "duplicate":
      return status === "duplicate"
    case "existing":
      return status === "existing"
    case "invalid":
      return status === "invalid_phone" || status === "unsupported_format"
    case "missing":
      return status === "missing_phone" || status === "missing_name"
  }
}

function row(
  rowNumber: number,
  name: string,
  phoneRaw: string,
  phoneE164: string | null,
  email: string | null,
  group: string | null,
  status: ImportRowStatus,
  reason: string,
): ValidatedImportRow {
  return { rowNumber, name, phoneRaw, phoneE164, email, group, status, reason }
}

function readMapped(raw: Record<string, string>, header: string | null): string {
  if (!header) {
    return ""
  }
  return (raw[header] ?? "").trim()
}

function emptyToNull(value: string): string | null {
  return value.length === 0 ? null : value
}

function looksLikePhone(value: string): boolean {
  return value.replace(/\D/g, "").length >= 7
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ")
}

function countStatus(rows: ValidatedImportRow[], status: ImportRowStatus): number {
  return rows.filter((row) => row.status === status).length
}

function detectDelimiter(headerLine: string): string {
  const counts = {
    ",": 0,
    ";": 0,
    "\t": 0,
  }
  let quoted = false
  for (const char of headerLine) {
    if (char === '"') {
      quoted = !quoted
      continue
    }
    if (!quoted && char in counts) {
      counts[char as "," | ";" | "\t"] += 1
    }
  }
  if (counts[";"] > counts[","] && counts[";"] >= counts["\t"]) {
    return ";"
  }
  if (counts["\t"] > counts[","] && counts["\t"] >= counts[";"]) {
    return "\t"
  }
  return ","
}

function splitCsvLines(text: string): string[] {
  const lines: string[] = []
  let current = ""
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === '"') {
      quoted = !quoted
      current += char
      continue
    }
    if (char === "\n" && !quoted) {
      if (current.trim().length > 0) {
        lines.push(current)
      }
      current = ""
      continue
    }
    current += char
  }
  if (current.trim().length > 0) {
    lines.push(current)
  }
  return lines
}

function splitCsvRecord(line: string, delimiter: string): string[] {
  const cells: string[] = []
  let current = ""
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"'
        index += 1
        continue
      }
      quoted = !quoted
      continue
    }
    if (char === delimiter && !quoted) {
      cells.push(current)
      current = ""
      continue
    }
    current += char
  }
  cells.push(current)
  return cells
}

function csvCell(value: string | number): string {
  const text = String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}
