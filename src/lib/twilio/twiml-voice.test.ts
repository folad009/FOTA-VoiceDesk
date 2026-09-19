import { describe, expect, it } from "vitest"

import { resolveTwilioVoice } from "./twiml"

describe("resolveTwilioVoice", () => {
  it("maps Nigerian voices to Nigerian English, not US Polly", () => {
    expect(resolveTwilioVoice("en-NG-female", "en-NG")).toEqual({
      voice: "Google.en-NG-Standard-A",
      language: "en-NG",
    })
    expect(resolveTwilioVoice("en-NG-male", "en-NG")).toEqual({
      voice: "Google.en-NG-Standard-B",
      language: "en-NG",
    })
  })

  it("defaults unknown voices to Nigerian English instead of en-US", () => {
    expect(resolveTwilioVoice("unknown", "")).toEqual({
      voice: "Google.en-NG-Standard-A",
      language: "en-NG",
    })
  })
})
