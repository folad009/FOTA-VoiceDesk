import type { RecordedAudioTwimlInput, VoiceTwimlInput } from "./types"

export function generateVoiceTwiML(input: VoiceTwimlInput): string {
  const say = `<Say voice="${escapeXml(input.voice)}" language="${escapeXml(input.language)}">${escapeXml(input.text)}</Say>`
  const inner = wrapGather(say, input.gatherActionUrl)
  return twimlResponse(`${inner}\n  <Hangup/>`)
}

export function generateRecordedAudioTwiML(input: RecordedAudioTwimlInput): string {
  const intro =
    input.introText && input.voice && input.language
      ? `<Say voice="${escapeXml(input.voice)}" language="${escapeXml(input.language)}">${escapeXml(input.introText)}</Say>\n    `
      : input.introText
        ? `<Say>${escapeXml(input.introText)}</Say>\n    `
        : ""
  const play = `${intro}<Play>${escapeXml(input.mediaUrl)}</Play>`
  const inner = wrapGather(play, input.gatherActionUrl)
  return twimlResponse(`${inner}\n  <Hangup/>`)
}

export function generateHangupTwiML(message?: string): string {
  const say = message
    ? `  <Say>${escapeXml(message)}</Say>\n  <Hangup/>`
    : `  <Hangup/>`
  return twimlResponse(say)
}

export function resolveTwilioVoice(voiceId: string, language: string): {
  voice: string
  language: string
} {
  return (
    VOICE_MAP[voiceId] ?? {
      voice: "Google.en-NG-Standard-A",
      language: language || "en-NG",
    }
  )
}

const VOICE_MAP: Record<string, { voice: string; language: string }> = {
  "en-NG-female": { voice: "Google.en-NG-Standard-A", language: "en-NG" },
  "en-NG-male": { voice: "Google.en-NG-Standard-B", language: "en-NG" },
  "en-GB-female": { voice: "Polly.Amy", language: "en-GB" },
  "en-US-female": { voice: "Polly.Joanna", language: "en-US" },
}

function wrapGather(noun: string, actionUrl: string | undefined): string {
  if (!actionUrl) {
    return `  ${noun}`
  }
  return `  <Gather numDigits="1" timeout="5" action="${escapeXml(actionUrl)}" method="POST">\n    ${noun}\n  </Gather>`
}

function twimlResponse(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n${body}\n</Response>`
}

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}
