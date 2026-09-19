import { describe, expect, it } from "vitest"

import {
  canProceedFromStep,
  canSelectReachedStep,
  defaultWizardDraft,
  formatCallingHours,
  formatDuration,
  formatFileSize,
  mergeAudience,
  minutesToTimeValue,
  parseCsvContacts,
  parseWizardDraft,
  personalizePreview,
  readinessChecks,
  reviewCopy,
  timeValueToMinutes,
  voiceLabel,
  type WizardDraft,
} from "./wizard-draft"
import { cloneVoiceValue } from "@/server/voice/clone"

function draft(overrides: Partial<WizardDraft> = {}): WizardDraft {
  return { ...defaultWizardDraft(), ...overrides }
}

describe("canProceedFromStep", () => {
  it("blocks details until a name and type exist", () => {
    expect(canProceedFromStep("details", draft({ name: "" }))).toBe(false)
    expect(
      canProceedFromStep(
        "details",
        draft({ name: "GKC 2026 Reminder", type: "CONFERENCE_REMINDER" }),
      ),
    ).toBe(true)
  })

  it("blocks audience until there is at least one recipient", () => {
    expect(canProceedFromStep("audience", draft())).toBe(false)
    expect(
      canProceedFromStep(
        "audience",
        draft({
          uploadedRecipients: [{ name: "John Doe", phoneE164: "+2348031234567" }],
        }),
      ),
    ).toBe(true)
  })

  it("requires TTS text or a recording", () => {
    expect(
      canProceedFromStep("message", draft({ messageKind: "TTS", ttsText: "" })),
    ).toBe(false)
    expect(
      canProceedFromStep(
        "message",
        draft({ messageKind: "TTS", ttsText: "Conference starts at 6pm." }),
      ),
    ).toBe(true)
    expect(
      canProceedFromStep(
        "message",
        draft({
          messageKind: "RECORDING",
          recording: {
            fileName: "gkc.mp3",
            durationSeconds: 84,
            sizeBytes: 240_000,
          },
        }),
      ),
    ).toBe(true)
    expect(
      canProceedFromStep(
        "message",
        draft({ libraryMessageId: "voice_saved_1", ttsText: "" }),
      ),
    ).toBe(true)
  })
})

describe("canSelectReachedStep", () => {
  it("allows revisiting completed steps but not skipping ahead", () => {
    expect(canSelectReachedStep(1, 2)).toBe(true)
    expect(canSelectReachedStep(2, 2)).toBe(true)
    expect(canSelectReachedStep(3, 2)).toBe(false)
  })
})

describe("parseWizardDraft", () => {
  it("accepts a valid draft and normalizes uploaded Nigerian numbers", () => {
    const parsed = parseWizardDraft({
      ...defaultWizardDraft(),
      name: "Workers meeting",
      type: "WORKERS_MEETING_REMINDER",
      ttsText: "Meeting starts at 6pm.",
      uploadedRecipients: [{ name: "Ada", phoneE164: "08031234567" }],
    })
    expect(parsed.uploadedRecipients[0]?.phoneE164).toBe("+2348031234567")
  })

  it("rejects invalid uploaded phone numbers", () => {
    expect(() =>
      parseWizardDraft({
        ...defaultWizardDraft(),
        uploadedRecipients: [{ name: "Ada", phoneE164: "+15551234567" }],
      }),
    ).toThrow(/Nigerian/)
  })
})

describe("mergeAudience", () => {
  it("deduplicates recipients by phone number", () => {
    const result = mergeAudience({
      groupMembers: [
        { id: "c1", name: "Ada", phoneE164: "+2348031111111", source: "GKC Delegates" },
        { id: "c2", name: "Tunde", phoneE164: "+2348022222222", source: "GKC Delegates" },
      ],
      selectedContacts: [
        { id: "c2", name: "Tunde", phoneE164: "+2348022222222" },
      ],
      uploadedRecipients: [
        { name: "Ada Duplicate", phoneE164: "+2348031111111" },
        { name: "John Doe", phoneE164: "+2348053333333" },
      ],
    })
    expect(result).toHaveLength(3)
    expect(result.map((row) => row.phoneE164)).toEqual([
      "+2348031111111",
      "+2348022222222",
      "+2348053333333",
    ])
  })
})

describe("calling hours", () => {
  it("converts 8:00 AM and 7:00 PM to minutes past midnight", () => {
    expect(timeValueToMinutes("08:00")).toBe(480)
    expect(timeValueToMinutes("19:00")).toBe(1140)
    expect(minutesToTimeValue(480)).toBe("08:00")
    expect(formatCallingHours(480, 1140)).toBe("8:00 AM – 7:00 PM")
  })
})

describe("parseCsvContacts", () => {
  it("parses name and phone rows and skips the header", () => {
    const rows = parseCsvContacts("name,phone\nJohn Doe,08033333333\nAda,08031111111")
    expect(rows).toEqual([
      { name: "John Doe", phoneE164: "+2348033333333" },
      { name: "Ada", phoneE164: "+2348031111111" },
    ])
  })
})

describe("message helpers", () => {
  it("personalizes a preview with the recipient first name", () => {
    expect(
      personalizePreview("This is a reminder about GKC.", true, "John Doe"),
    ).toBe("John, this is a reminder about GKC.")
  })

  it("formats recording duration and file size", () => {
    expect(formatDuration(84)).toBe("1m 24s")
    expect(formatFileSize(240_000)).toBe("234 KB")
  })
})

describe("readiness and review", () => {
  it("builds review copy and readiness for a complete campaign", () => {
    const complete = draft({
      name: "GKC 2026 Reminder",
      type: "CONFERENCE_REMINDER",
      uploadedRecipients: Array.from({ length: 3 }, (_, index) => ({
        name: `Person ${index}`,
        phoneE164: `+234803123456${index}`,
      })),
      messageKind: "RECORDING",
      recording: {
        fileName: "gkc.mp3",
        durationSeconds: 84,
        sizeBytes: 240_000,
      },
      maxAttempts: 2,
      retryDelayMinutes: 30,
      callingHoursStartMinutes: 480,
      callingHoursEndMinutes: 1140,
      timezone: "Africa/Lagos",
      scheduleMode: "later",
      scheduledDate: "2026-09-16",
      scheduledTime: "18:00",
    })

    expect(reviewCopy(complete, 500)).toMatchObject({
      campaign: "GKC 2026 Reminder",
      audience: "500 recipients",
      voice: "Recorded message",
      voiceMeta: "1m 24s",
      rules: "2 attempts",
      retry: "30 minute retry delay",
      hours: "8AM–7PM",
      scheduleDate: "16 September 2026",
      scheduleTime: "6:00 PM",
      timezone: "Africa/Lagos",
    })

    const checks = readinessChecks(complete, {
      recipientCount: 500,
      phonesValid: true,
      twilioConnected: true,
    })
    expect(checks.every((check) => check.ok)).toBe(true)
  })

  it("does not treat a missing recording as a ready voice message", () => {
    const incomplete = draft({
      name: "GKC 2026 Reminder",
      messageKind: "RECORDING",
      recording: null,
    })

    expect(reviewCopy(incomplete, 0).voiceMeta).toBe("No recording uploaded")
    expect(
      readinessChecks(incomplete, {
        recipientCount: 0,
        phonesValid: false,
        twilioConnected: true,
      }).find((check) => check.id === "voice")?.ok,
    ).toBe(false)
  })
})

describe("voiceLabel", () => {
  it("uses cloned profile names for clone voice values", () => {
    expect(voiceLabel("en-NG-female")).toBe("Ada — Female (Nigeria)")
    expect(voiceLabel(cloneVoiceValue("profile_ada"))).toBe("Cloned voice")
    expect(
      voiceLabel(cloneVoiceValue("profile_ada"), [
        { id: "profile_ada", name: "Pastor Ada" },
      ]),
    ).toBe("Pastor Ada")
  })
})
