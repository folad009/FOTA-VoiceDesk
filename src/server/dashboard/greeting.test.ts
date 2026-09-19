import { describe, expect, it } from "vitest"

import { firstName, greetingFor } from "./greeting"

describe("firstName", () => {
  it("returns the first token of a full name", () => {
    expect(firstName("Fola Adeyemi")).toBe("Fola")
  })

  it("returns a single name unchanged", () => {
    expect(firstName("Fola")).toBe("Fola")
  })
})

describe("greetingFor", () => {
  it("says good evening in Lagos after 17:00", () => {
    expect(
      greetingFor({
        now: new Date("2026-09-15T22:55:00.000Z"),
        timeZone: "Africa/Lagos",
        name: "Fola Adeyemi",
      }),
    ).toBe("Good evening, Fola")
  })

  it("says good morning in Lagos before noon", () => {
    expect(
      greetingFor({
        now: new Date("2026-09-15T07:00:00.000Z"),
        timeZone: "Africa/Lagos",
        name: "Fola",
      }),
    ).toBe("Good morning, Fola")
  })

  it("says good afternoon in Lagos after noon", () => {
    expect(
      greetingFor({
        now: new Date("2026-09-15T12:00:00.000Z"),
        timeZone: "Africa/Lagos",
        name: "Fola",
      }),
    ).toBe("Good afternoon, Fola")
  })
})
