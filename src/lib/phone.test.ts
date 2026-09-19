import { describe, expect, it } from "vitest"

import {
  formatNationalNigerianPhone,
  isValidNigerianE164,
  maskPhone,
  parseNigerianPhone,
} from "./phone"

describe("parseNigerianPhone", () => {
  it("normalizes a local 0-prefixed MTN number to E.164", () => {
    expect(parseNigerianPhone("08031234567")).toBe("+2348031234567")
  })

  it("accepts spaced, dashed, and dotted local numbers", () => {
    expect(parseNigerianPhone("0803 123 4567")).toBe("+2348031234567")
    expect(parseNigerianPhone("0803-123-4567")).toBe("+2348031234567")
    expect(parseNigerianPhone("0803.123.4567")).toBe("+2348031234567")
  })

  it("accepts already-normalized E.164", () => {
    expect(parseNigerianPhone("+2348031234567")).toBe("+2348031234567")
  })

  it("accepts 234 without plus, 00 international prefix, and 10-digit national", () => {
    expect(parseNigerianPhone("2348031234567")).toBe("+2348031234567")
    expect(parseNigerianPhone("002348031234567")).toBe("+2348031234567")
    expect(parseNigerianPhone("8031234567")).toBe("+2348031234567")
  })

  it("strips an extra 0 after the country code", () => {
    expect(parseNigerianPhone("+23408031234567")).toBe("+2348031234567")
    expect(parseNigerianPhone("23408031234567")).toBe("+2348031234567")
  })

  it("accepts common Airtel, Glo, 9mobile, and 090 prefixes", () => {
    expect(parseNigerianPhone("08021234567")).toBe("+2348021234567")
    expect(parseNigerianPhone("08051234567")).toBe("+2348051234567")
    expect(parseNigerianPhone("08091234567")).toBe("+2348091234567")
    expect(parseNigerianPhone("09031234567")).toBe("+2349031234567")
    expect(parseNigerianPhone("07031234567")).toBe("+2347031234567")
    expect(parseNigerianPhone("08121234567")).toBe("+2348121234567")
  })

  it("rejects US NANP formats", () => {
    expect(parseNigerianPhone("(415) 555-0123")).toBeNull()
    expect(parseNigerianPhone("+1 415 555 0123")).toBeNull()
    expect(parseNigerianPhone("415-555-0123")).toBeNull()
    expect(parseNigerianPhone("0014155550123")).toBeNull()
  })

  it("rejects UK numbers and unassigned Nigerian prefixes", () => {
    expect(parseNigerianPhone("02079460111")).toBeNull()
    expect(parseNigerianPhone("08012345678")).toBeNull()
    expect(parseNigerianPhone("+2348012345678")).toBeNull()
  })

  it("rejects landline-length and short values", () => {
    expect(parseNigerianPhone("01 270 1234")).toBeNull()
    expect(parseNigerianPhone("0803")).toBeNull()
  })
})

describe("maskPhone", () => {
  it("masks the middle of a stored E.164 number", () => {
    expect(maskPhone("+2348031234567")).toBe("+234 803 *** 4567")
  })

  it("returns a safe fallback for invalid input", () => {
    expect(maskPhone("not-a-phone")).toBe("Invalid number")
  })
})

describe("formatNationalNigerianPhone", () => {
  it("formats E.164 as a local 0-prefixed number", () => {
    expect(formatNationalNigerianPhone("+2348031234567")).toBe("0803 123 4567")
  })
})

describe("isValidNigerianE164", () => {
  it("accepts Nigerian mobile E.164 with a known prefix", () => {
    expect(isValidNigerianE164("+2348031234567")).toBe(true)
  })

  it("rejects short numbers and US E.164", () => {
    expect(isValidNigerianE164("+234803")).toBe(false)
    expect(isValidNigerianE164("+14155550123")).toBe(false)
  })
})
