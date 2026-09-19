import { describe, expect, it } from "vitest"

import {
  buildErrorReportCsv,
  composeDisplayName,
  detectColumnMapping,
  importableContacts,
  isSupportedImportFile,
  mappingIsReady,
  parseCsvTable,
  summarizeImport,
  validateImportRows,
} from "./import-workflow"

describe("isSupportedImportFile", () => {
  it("accepts CSV and XLSX only", () => {
    expect(isSupportedImportFile("delegates.csv")).toBe(true)
    expect(isSupportedImportFile("delegates.XLSX")).toBe(true)
    expect(isSupportedImportFile("delegates.xls")).toBe(false)
    expect(isSupportedImportFile("delegates.pdf")).toBe(false)
  })
})

describe("detectColumnMapping", () => {
  it("maps common header aliases automatically", () => {
    const mapping = detectColumnMapping([
      "Full Name",
      "Mobile Number",
      "E-mail",
      "Audience",
    ])
    expect(mapping).toEqual({
      name: "Full Name",
      firstName: null,
      lastName: null,
      phone: "Mobile Number",
      email: "E-mail",
      group: "Audience",
    })
  })

  it("prefers split name columns when a full name is absent", () => {
    const mapping = detectColumnMapping(["First Name", "Surname", "Phone"])
    expect(mapping.name).toBeNull()
    expect(mapping.firstName).toBe("First Name")
    expect(mapping.lastName).toBe("Surname")
    expect(mapping.phone).toBe("Phone")
  })
})

describe("mappingIsReady", () => {
  it("requires a phone column and a name source", () => {
    expect(
      mappingIsReady({
        name: null,
        firstName: null,
        lastName: null,
        phone: "Phone",
        email: null,
        group: null,
      }),
    ).toBe(false)
    expect(
      mappingIsReady({
        name: null,
        firstName: "First",
        lastName: null,
        phone: "Phone",
        email: null,
        group: null,
      }),
    ).toBe(true)
    expect(
      mappingIsReady({
        name: "Name",
        firstName: null,
        lastName: null,
        phone: "Phone",
        email: null,
        group: null,
      }),
    ).toBe(true)
  })
})

describe("composeDisplayName", () => {
  it("joins first and last names and trims extra space", () => {
    expect(composeDisplayName({ name: "", firstName: "Ada", lastName: "Okafor" })).toBe(
      "Ada Okafor",
    )
    expect(composeDisplayName({ name: "  John Doe  ", firstName: "Ada", lastName: "Okafor" })).toBe(
      "John Doe",
    )
  })
})

describe("parseCsvTable", () => {
  it("parses quoted commas and skips blank rows", () => {
    const table = parseCsvTable(
      'Name,Phone\n"Okafor, Ada",08031111111\n\nTunde,08022222222\n',
    )
    expect(table.headers).toEqual(["Name", "Phone"])
    expect(table.rows).toEqual([
      { Name: "Okafor, Ada", Phone: "08031111111" },
      { Name: "Tunde", Phone: "08022222222" },
    ])
  })
})

describe("validateImportRows", () => {
  const mapping = detectColumnMapping(["Name", "Phone", "Email", "Group"])

  it("classifies missing, invalid, duplicate, existing, and valid rows", () => {
    const rows = validateImportRows({
      rows: [
        { Name: "Ada Okafor", Phone: "08031111111", Email: "ada@fota.local", Group: "Choir" },
        { Name: "Tunde", Phone: "08031111111", Email: "", Group: "" },
        { Name: "Bola", Phone: "+2348022222222", Email: "", Group: "" },
        { Name: "", Phone: "08033333333", Email: "", Group: "" },
        { Name: "Chioma", Phone: "", Email: "", Group: "" },
        { Name: "Emeka", Phone: "not-a-phone", Email: "", Group: "" },
        { Name: "Femi", Phone: "08044444444", Email: "", Group: "" },
      ],
      mapping,
      existingPhones: ["+2348022222222"],
    })

    expect(rows.map((row) => row.status)).toEqual([
      "valid",
      "duplicate",
      "existing",
      "missing_name",
      "missing_phone",
      "unsupported_format",
      "valid",
    ])
    expect(rows[0]?.phoneE164).toBe("+2348031111111")
    expect(rows[0]?.rowNumber).toBe(2)
    expect(rows[5]?.reason).toMatch(/unsupported/i)
  })

  it("treats a non-Nigerian number as invalid", () => {
    const rows = validateImportRows({
      rows: [{ Name: "Ada", Phone: "02079460111", Email: "", Group: "" }],
      mapping,
      existingPhones: [],
    })
    expect(rows[0]?.status).toBe("invalid_phone")
  })
})

describe("summarizeImport", () => {
  it("counts the enterprise validation buckets", () => {
    const mapping = detectColumnMapping(["Name", "Phone"])
    const rows = validateImportRows({
      rows: [
        { Name: "A", Phone: "08031111111" },
        { Name: "B", Phone: "08031111111" },
        { Name: "C", Phone: "08022222222" },
        { Name: "D", Phone: "02079460111" },
        { Name: "E", Phone: "" },
      ],
      mapping,
      existingPhones: ["+2348022222222"],
    })
    expect(summarizeImport(rows)).toEqual({
      total: 5,
      valid: 1,
      duplicates: 1,
      existing: 1,
      invalid: 1,
      missingPhone: 1,
      missingName: 0,
      unsupported: 0,
    })
  })
})

describe("importableContacts and error report", () => {
  it("exports only valid rows and a CSV of everything else", () => {
    const mapping = detectColumnMapping(["Name", "Phone"])
    const rows = validateImportRows({
      rows: [
        { Name: "Ada", Phone: "08031111111" },
        { Name: "Tunde", Phone: "08031111111" },
        { Name: "Bola", Phone: "abc" },
      ],
      mapping,
      existingPhones: [],
    })
    expect(importableContacts(rows)).toEqual([
      {
        name: "Ada",
        phoneE164: "+2348031111111",
        email: null,
        group: null,
      },
    ])
    const csv = buildErrorReportCsv(rows)
    expect(csv).toContain("Row,Name,Phone,Status,Reason")
    expect(csv).toContain("Tunde")
    expect(csv).toContain("Bola")
    expect(csv).not.toContain("Ada")
  })
})
