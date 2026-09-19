import { describe, expect, it } from "vitest"

import {
  formatLagosDate,
  formatLagosDateTime,
  formatLagosTime,
} from "./datetime"
import { APP_TIMEZONE } from "@/config/locale"

describe("Nigerian date and time conventions", () => {
  const noonUtc = new Date("2026-09-16T11:00:00.000Z")

  it("defaults operations to Africa/Lagos", () => {
    expect(APP_TIMEZONE).toBe("Africa/Lagos")
  })

  it("formats dates as day month year, not US month-first", () => {
    expect(formatLagosDate(noonUtc)).toBe("16 Sep 2026")
    expect(formatLagosDate(noonUtc)).not.toMatch(/Sep 16/)
  })

  it("formats time in Africa/Lagos", () => {
    expect(formatLagosTime(noonUtc)).toBe("12:00")
  })

  it("combines date and time for operations copy", () => {
    expect(formatLagosDateTime(noonUtc)).toBe("16 Sep 2026, 12:00")
  })
})
