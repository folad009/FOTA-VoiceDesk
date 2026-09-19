import { describe, expect, it } from "vitest"

import {
  contentTypeForFileName,
  playableMediaPath,
  voiceFileNameFromMediaUrl,
  voiceMediaUrl,
  voiceObjectKey,
} from "@/lib/s3/paths"

describe("voiceObjectKey", () => {
  it("prefixes voice/ and strips path tricks", () => {
    expect(voiceObjectKey("a.mp3")).toBe("voice/a.mp3")
    expect(voiceObjectKey("voice/a.mp3")).toBe("voice/a.mp3")
    expect(voiceObjectKey("../a.mp3")).toBe("voice/a.mp3")
  })
})

describe("voiceFileNameFromMediaUrl", () => {
  it("parses media API and legacy upload paths", () => {
    expect(voiceFileNameFromMediaUrl("/api/voice/media/abc.mp3")).toBe("abc.mp3")
    expect(voiceFileNameFromMediaUrl("/uploads/voice/abc.mp3")).toBe("abc.mp3")
    expect(
      voiceFileNameFromMediaUrl("https://fota.example/api/voice/media/clone-1.mp3"),
    ).toBe("clone-1.mp3")
    expect(voiceFileNameFromMediaUrl("/other/path.mp3")).toBeNull()
  })
})

describe("playableMediaPath", () => {
  it("rewrites legacy uploads to the media API", () => {
    expect(playableMediaPath("/uploads/voice/a.mp3")).toBe("/api/voice/media/a.mp3")
    expect(playableMediaPath("/api/voice/media/a.mp3")).toBe("/api/voice/media/a.mp3")
    expect(playableMediaPath("https://cdn.example/a.mp3")).toBe("https://cdn.example/a.mp3")
  })
})

describe("voiceMediaUrl and content types", () => {
  it("builds media urls and content types", () => {
    expect(voiceMediaUrl("x.wav")).toBe("/api/voice/media/x.wav")
    expect(contentTypeForFileName("x.wav")).toBe("audio/wav")
    expect(contentTypeForFileName("x.m4a")).toBe("audio/mp4")
    expect(contentTypeForFileName("x.mp3")).toBe("audio/mpeg")
  })
})
