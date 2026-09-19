import { describe, expect, it } from "vitest"

import {
  applyVoiceTemplate,
  duplicateMessageTitle,
  estimateSpokenSeconds,
  messageStatusLabel,
  previewVoiceScript,
  spokenCharacterCount,
  spokenScriptForContact,
  studioWaveform,
} from "./script"

describe("applyVoiceTemplate", () => {
  it("replaces firstName variables for spoken copy", () => {
    expect(
      applyVoiceTemplate("Good evening, {{firstName}}. Service starts at 6pm.", {
        firstName: "John",
      }),
    ).toBe("Good evening, John. Service starts at 6pm.")
  })

  it("leaves scripts without variables unchanged", () => {
    expect(
      applyVoiceTemplate("This is a reminder that Sunday service holds this week.", {
        firstName: "John",
      }),
    ).toBe("This is a reminder that Sunday service holds this week.")
  })
})

describe("previewVoiceScript", () => {
  it("renders the John example preview", () => {
    expect(previewVoiceScript("Good evening, {{firstName}}...")).toBe(
      "Good evening, John...",
    )
  })
})

describe("spokenCharacterCount and estimateSpokenSeconds", () => {
  it("counts characters excluding template braces in the spoken form", () => {
    expect(spokenCharacterCount("Good evening, {{firstName}}.")).toBe(
      "Good evening, John.".length,
    )
  })

  it("estimates duration from spoken words at 150 wpm", () => {
    const script = Array.from({ length: 150 }, () => "word").join(" ")
    expect(estimateSpokenSeconds(script)).toBe(60)
    expect(estimateSpokenSeconds("")).toBe(0)
    expect(estimateSpokenSeconds("Hello")).toBe(1)
  })
})

describe("duplicateMessageTitle", () => {
  it("prefixes a copy label", () => {
    expect(duplicateMessageTitle("Evening greeting")).toBe("Copy of Evening greeting")
  })
})

describe("messageStatusLabel", () => {
  it("labels archived messages", () => {
    expect(messageStatusLabel(null)).toBe("Active")
    expect(messageStatusLabel(new Date("2026-09-16T00:00:00.000Z"))).toBe("Archived")
  })
})

describe("spokenScriptForContact", () => {
  it("applies firstName variables without a Hello prefix", () => {
    expect(
      spokenScriptForContact("Good evening, {{firstName}}.", "John Doe", true),
    ).toBe("Good evening, John.")
  })

  it("keeps the Hello prefix when the script has no variable", () => {
    expect(
      spokenScriptForContact("Service starts at 6pm.", "Ada Okafor", true),
    ).toBe("Hello Ada. Service starts at 6pm.")
  })
})

describe("studioWaveform", () => {
  it("returns a stable bar profile for a seed", () => {
    const a = studioWaveform("msg_1", 8)
    const b = studioWaveform("msg_1", 8)
    expect(a).toEqual(b)
    expect(a).toHaveLength(8)
    expect(a.every((value) => value >= 8 && value <= 100)).toBe(true)
  })
})
