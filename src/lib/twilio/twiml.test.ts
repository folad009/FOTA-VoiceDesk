import { describe, expect, it } from "vitest"

import {
  generateRecordedAudioTwiML,
  generateVoiceTwiML,
} from "./twiml"

describe("generateVoiceTwiML", () => {
  it("speaks escaped TTS and hangs up", () => {
    const xml = generateVoiceTwiML({
      text: `Hello <Ada> & friends`,
      voice: "Polly.Joanna",
      language: "en-US",
    })

    expect(xml).toContain("<Say")
    expect(xml).toContain('voice="Polly.Joanna"')
    expect(xml).toContain('language="en-US"')
    expect(xml).toContain("Hello &lt;Ada&gt; &amp; friends")
    expect(xml).toContain("<Hangup")
    expect(xml).not.toContain("<Ada>")
  })

  it("wraps speech in a gather when an action URL is provided", () => {
    const xml = generateVoiceTwiML({
      text: "Press 1 to hear this again.",
      voice: "Polly.Amy",
      language: "en-GB",
      gatherActionUrl: "https://voicedesk.example/api/twilio/gather?attempt=att_1",
    })

    expect(xml).toContain("<Gather")
    expect(xml).toContain('action="https://voicedesk.example/api/twilio/gather?attempt=att_1"')
    expect(xml).toContain('numDigits="1"')
  })
})

describe("generateRecordedAudioTwiML", () => {
  it("plays the absolute recording URL", () => {
    const xml = generateRecordedAudioTwiML({
      mediaUrl: "https://voicedesk.example/uploads/voice/gkc.mp3",
    })
    expect(xml).toContain("<Play>https://voicedesk.example/uploads/voice/gkc.mp3</Play>")
    expect(xml).toContain("<Hangup")
  })

  it("speaks an intro before the recording", () => {
    const xml = generateRecordedAudioTwiML({
      mediaUrl: "https://voicedesk.example/uploads/voice/gkc.mp3",
      introText: "Hello Ada.",
      voice: "Polly.Joanna",
      language: "en-US",
    })
    expect(xml).toContain("Hello Ada.")
    expect(xml).toContain("<Play>https://voicedesk.example/uploads/voice/gkc.mp3</Play>")
  })
})
