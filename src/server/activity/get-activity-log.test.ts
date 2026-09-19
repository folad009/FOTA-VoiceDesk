import { describe, expect, it } from "vitest"

import { auditActionLabel } from "./get-activity-log"

describe("auditActionLabel", () => {
  it("turns stored actions into operator language", () => {
    expect(auditActionLabel("campaign.launched")).toBe("Campaign launched")
    expect(auditActionLabel("campaign.retry_started")).toBe("Retries queued")
    expect(auditActionLabel("contacts.imported")).toBe("Contacts imported")
  })
})
