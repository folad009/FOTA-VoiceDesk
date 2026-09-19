import { describe, expect, it } from "vitest"

import { breadcrumbsForPath, isNavActive } from "./navigation"

describe("breadcrumbsForPath", () => {
  it("places a live campaign under Campaigns, not Dashboard", () => {
    expect(breadcrumbsForPath("/campaigns/cm123")).toEqual([
      { title: "Campaigns", href: "/campaigns" },
      { title: "Campaign" },
    ])
  })

  it("keeps create-campaign on its own trail", () => {
    expect(breadcrumbsForPath("/campaigns/new")).toEqual([
      { title: "Campaigns" },
      { title: "Create Campaign" },
    ])
  })
})

describe("isNavActive", () => {
  it("highlights All Campaigns on a command center, not Create Campaign", () => {
    expect(isNavActive("/campaigns/cm123", "/campaigns")).toBe(true)
    expect(isNavActive("/campaigns/cm123", "/campaigns/new")).toBe(false)
    expect(isNavActive("/campaigns/new", "/campaigns")).toBe(false)
  })

  it("keeps cloned voices separate from the message library", () => {
    expect(isNavActive("/voice/voices", "/voice/voices")).toBe(true)
    expect(isNavActive("/voice/voices", "/voice/messages")).toBe(false)
    expect(isNavActive("/voice/messages/new", "/voice/messages")).toBe(true)
  })
})
