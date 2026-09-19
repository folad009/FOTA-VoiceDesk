import * as XLSX from "xlsx"

import {
  isSupportedImportFile,
  parseCsvTable,
  type ParsedTable,
} from "./import-workflow"

export async function parseImportFile(file: File): Promise<ParsedTable> {
  if (!isSupportedImportFile(file.name)) {
    throw new Error("Unsupported format. Use a CSV or XLSX file.")
  }
  const buffer = await file.arrayBuffer()
  if (file.name.toLowerCase().endsWith(".csv")) {
    return parseCsvTable(new TextDecoder().decode(buffer))
  }
  return parseXlsxTable(buffer)
}

export function parseXlsxTable(buffer: ArrayBuffer): ParsedTable {
  const workbook = XLSX.read(buffer, { type: "array" })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return { headers: [], rows: [] }
  }
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    return { headers: [], rows: [] }
  }
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  })
  const headerRow = (matrix[0] ?? []).map((cell) => String(cell ?? "").trim())
  const headers = uniqueHeaders(headerRow.filter((header) => header.length > 0))
  if (headers.length === 0) {
    return { headers: [], rows: [] }
  }

  const rows: Record<string, string>[] = []
  for (const line of matrix.slice(1)) {
    const record: Record<string, string> = {}
    let empty = true
    headers.forEach((header, index) => {
      const value = String(line[index] ?? "").trim()
      record[header] = value
      if (value.length > 0) {
        empty = false
      }
    })
    if (!empty) {
      rows.push(record)
    }
  }
  return { headers, rows }
}

function uniqueHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>()
  return headers.map((header) => {
    const count = seen.get(header) ?? 0
    seen.set(header, count + 1)
    return count === 0 ? header : `${header} ${count + 1}`
  })
}
