import { describe, expect, it } from "vitest"

import { operatorErrorMessage } from "./operator-error"

describe("operatorErrorMessage", () => {
  it("keeps a short operator-facing error", () => {
    expect(operatorErrorMessage(new Error("Campaign is not ready to launch"), "Unable to save")).toBe(
      "Campaign is not ready to launch",
    )
  })

  it("hides database internals", () => {
    expect(
      operatorErrorMessage(
        new Error("Can't reach database server at localhost:5432"),
        "Unable to load campaigns. Check that the database is available.",
      ),
    ).toBe("Unable to load campaigns. Check that the database is available.")
    expect(
      operatorErrorMessage(
        new Error("Invalid `prisma.campaign.findMany()` invocation"),
        "Unable to load campaigns. Check that the database is available.",
      ),
    ).toBe("Unable to load campaigns. Check that the database is available.")
  })
})
