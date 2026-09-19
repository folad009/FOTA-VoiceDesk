import { describe, expect, it } from "vitest"

import { clonedAudioCacheKey } from "@/lib/elevenlabs/cache-key"
import {
  cloneVoiceValue,
  clonedSpeechPlan,
  parseCloneVoiceValue,
  playbackMediaUrl,
} from "./clone"

describe("clone voice values", () => {
  it("encodes and parses a cloned voice profile id", () => {
    expect(cloneVoiceValue("profile_ada")).toBe("clone:profile_ada")
    expect(parseCloneVoiceValue("clone:profile_ada")).toBe("profile_ada")
  })

  it("rejects catalog voices and empty clone values", () => {
    expect(parseCloneVoiceValue("en-NG-female")).toBeNull()
    expect(parseCloneVoiceValue("clone:")).toBeNull()
    expect(parseCloneVoiceValue(" clone:abc ")).toBe("abc")
  })
})

describe("cloned speech plan", () => {
  it("does not generate cloned audio for catalog TTS or recordings", () => {
    expect(
      clonedSpeechPlan({
        kind: "TTS",
        voiceProfileId: null,
        includeRecipientName: false,
      }),
    ).toBe("none")
    expect(
      clonedSpeechPlan({
        kind: "RECORDING",
        voiceProfileId: "profile_ada",
        includeRecipientName: false,
      }),
    ).toBe("none")
  })

  it("shares one file when the script is not personalized", () => {
    expect(
      clonedSpeechPlan({
        kind: "TTS",
        voiceProfileId: "profile_ada",
        includeRecipientName: false,
      }),
    ).toBe("shared")
  })

  it("generates per recipient when the script uses a first name", () => {
    expect(
      clonedSpeechPlan({
        kind: "TTS",
        voiceProfileId: "profile_ada",
        includeRecipientName: true,
      }),
    ).toBe("per-recipient")
  })
})

describe("playbackMediaUrl", () => {
  it("plays per-recipient generated audio first", () => {
    expect(
      playbackMediaUrl({
        kind: "TTS",
        voiceProfileId: "profile_ada",
        generatedMediaUrl: "/uploads/voice/clone-a.mp3",
        messageMediaUrl: "/uploads/voice/clone-shared.mp3",
      }),
    ).toBe("/uploads/voice/clone-a.mp3")
  })

  it("plays a recording from the message media url", () => {
    expect(
      playbackMediaUrl({
        kind: "RECORDING",
        voiceProfileId: null,
        generatedMediaUrl: null,
        messageMediaUrl: "/uploads/voice/pastor.mp3",
      }),
    ).toBe("/uploads/voice/pastor.mp3")
  })

  it("plays shared cloned TTS and falls back to catalog Say", () => {
    expect(
      playbackMediaUrl({
        kind: "TTS",
        voiceProfileId: "profile_ada",
        generatedMediaUrl: null,
        messageMediaUrl: "/uploads/voice/clone-shared.mp3",
      }),
    ).toBe("/uploads/voice/clone-shared.mp3")
    expect(
      playbackMediaUrl({
        kind: "TTS",
        voiceProfileId: null,
        generatedMediaUrl: null,
        messageMediaUrl: null,
      }),
    ).toBeNull()
  })
})

describe("clonedAudioCacheKey", () => {
  it("is stable for the same voice and text", () => {
    const first = clonedAudioCacheKey("voice_1", "  Hello Ada.  ")
    const second = clonedAudioCacheKey("voice_1", "Hello Ada.")
    expect(first).toBe(second)
    expect(first).toMatch(/^[a-f0-9]{24}$/)
  })

  it("changes when the spoken text changes", () => {
    expect(clonedAudioCacheKey("voice_1", "Hello Ada.")).not.toBe(
      clonedAudioCacheKey("voice_1", "Hello John."),
    )
  })
})
