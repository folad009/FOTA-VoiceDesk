import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { spokenCampaignBody } from "@/server/voice/script"
import {
  applyCampaignTemplate,
  applyNamedTemplate,
  campaignTemplates,
  getCampaignTemplate,
  getNamedTemplate,
  renderTemplateScript,
  type TemplateDraftSlice,
} from "./campaign-templates"

function emptyDraft(): TemplateDraftSlice {
  return {
    templateId: "",
    name: "",
    description: "",
    type: "",
    ttsText: "",
    timezone: "UTC",
    language: "en-US",
    includeRecipientName: false,
    voice: "en-NG-female",
    audienceGuidance: "",
    maxAttempts: 2,
    retryDelayMinutes: 30,
    callingHoursStartMinutes: 480,
    callingHoursEndMinutes: 1140,
    pacingSeconds: 2,
    scheduleMode: "immediate",
    scheduledDate: "",
    scheduledTime: "",
  }
}

describe("FOTA campaign templates", () => {
  it("exposes the eight type starters plus the GKC 2026 event template", () => {
    expect(campaignTemplates.map((template) => template.name)).toEqual([
      "Sunday Service Reminder",
      "Church Programme Reminder",
      "Conference Reminder",
      "Birthday Greeting",
      "Pastoral Announcement",
      "Workers' Meeting Reminder",
      "Cell Fellowship Reminder",
      "Emergency Announcement",
      "GKC 2026 — Conference Reminder",
    ])
  })

  it("keeps template copy out of the calling engine fallback", () => {
    expect(spokenCampaignBody(undefined)).toBeNull()
    expect(spokenCampaignBody("  ")).toBeNull()
    expect(spokenCampaignBody("Service holds at 6pm.")).toBe("Service holds at 6pm.")
    expect(spokenCampaignBody(null)).toBeNull()
  })

  it("keeps Giant Killer Conference copy out of the calling engine", () => {
    const engine = readFileSync(resolve("src/server/calling/engine.ts"), "utf8")
    const webhooks = readFileSync(resolve("src/lib/twilio/webhooks.ts"), "utf8")
    expect(engine).not.toMatch(/Giant Killer|GKC 2026|Surulere/)
    expect(webhooks).not.toMatch(/Giant Killer|GKC 2026|Surulere/)
  })

  it("stores GKC 2026 as a reusable event template, not a type alias", () => {
    const gkc = getNamedTemplate("gkc-2026-conference-reminder")
    expect(gkc?.name).toBe("GKC 2026 — Conference Reminder")
    expect(gkc?.campaignType).toBe("CONFERENCE_REMINDER")
    expect(gkc?.event).toEqual({
      id: "gkc-2026",
      title: "Giant Killer Conference 2026",
      datesLabel: "12–18 October 2026",
      location: "FOTA Surulere, Lagos",
    })
    expect(gkc?.objective).toContain("Giant Killer Conference 2026")
    expect(gkc?.audienceGuidance.toLowerCase()).toContain("delegate")
    expect(gkc?.scheduleMode).toBe("later")
    expect(gkc?.scheduledDate).toBe("2026-10-11")
    expect(getCampaignTemplate("CONFERENCE_REMINDER")?.id).not.toBe(
      "gkc-2026-conference-reminder",
    )
  })

  it("renders event placeholders into the spoken script before launch", () => {
    const gkc = getNamedTemplate("gkc-2026-conference-reminder")
    expect(gkc).toBeDefined()
    const spoken = renderTemplateScript(gkc!)
    expect(spoken).toContain("Giant Killer Conference 2026")
    expect(spoken).toContain("12–18 October 2026")
    expect(spoken).toContain("FOTA Surulere, Lagos")
    expect(spoken).not.toContain("{{eventTitle}}")
  })

  it("applies GKC 2026 into an editable draft: objective, audience, message, rules, schedule", () => {
    const applied = applyNamedTemplate(emptyDraft(), "gkc-2026-conference-reminder")
    expect(applied.templateId).toBe("gkc-2026-conference-reminder")
    expect(applied.name).toBe("GKC 2026 — Conference Reminder")
    expect(applied.type).toBe("CONFERENCE_REMINDER")
    expect(applied.description).toContain("Giant Killer Conference 2026")
    expect(applied.audienceGuidance?.toLowerCase()).toContain("delegate")
    expect(applied.ttsText).toContain("FOTA Surulere, Lagos")
    expect(applied.maxAttempts).toBe(3)
    expect(applied.timezone).toBe("Africa/Lagos")
    expect(applied.scheduleMode).toBe("later")
    expect(applied.scheduledDate).toBe("2026-10-11")
    expect(applied.scheduledTime).toBe("18:00")
  })

  it("fills an empty draft from a type template without overwriting a custom script", () => {
    const applied = applyCampaignTemplate(emptyDraft(), "SUNDAY_SERVICE_REMINDER")
    expect(applied.type).toBe("SUNDAY_SERVICE_REMINDER")
    expect(applied.name).toBe("Sunday Service Reminder")
    expect(applied.ttsText).toContain("Sunday service")
    expect(applied.timezone).toBe("Africa/Lagos")
    expect(applied.language).toBe("en-NG")

    const custom: TemplateDraftSlice = {
      ...emptyDraft(),
      ...applied,
      ttsText: "Custom script about the conference.",
    }
    const switched = applyCampaignTemplate(custom, "EMERGENCY_ANNOUNCEMENT")
    expect(switched.ttsText).toBe("Custom script about the conference.")
    expect(switched.type).toBe("EMERGENCY_ANNOUNCEMENT")
  })

  it("replaces stock template copy when the operator switches templates", () => {
    const draft = {
      ...emptyDraft(),
      ...applyCampaignTemplate(emptyDraft(), "CONFERENCE_REMINDER"),
    }
    const next = applyCampaignTemplate(draft, "BIRTHDAY_GREETING")
    expect(next.ttsText).toBe(getCampaignTemplate("BIRTHDAY_GREETING")?.script)
  })
})
