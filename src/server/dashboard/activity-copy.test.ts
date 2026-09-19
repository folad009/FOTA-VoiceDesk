import { describe, expect, it } from "vitest"

import { describeActivity } from "./activity-copy"

describe("describeActivity", () => {
  it("describes a campaign launch", () => {
    expect(
      describeActivity({
        action: "campaign.launched",
        metadata: { name: "GKC Reminder" },
      }),
    ).toBe("Campaign GKC Reminder started")
  })

  it("describes a completed call batch", () => {
    expect(
      describeActivity({
        action: "calls.batch_completed",
        metadata: { count: 48 },
      }),
    ).toBe("48 calls completed")
  })

  it("describes a recipient answering", () => {
    expect(
      describeActivity({
        action: "call.answered",
        metadata: { recipientName: "John Doe" },
      }),
    ).toBe("John Doe answered campaign call")
  })

  it("describes a retry cycle", () => {
    expect(
      describeActivity({
        action: "campaign.retry_started",
        metadata: { name: "GKC Reminder" },
      }),
    ).toBe("Campaign retry cycle started")
  })
})
