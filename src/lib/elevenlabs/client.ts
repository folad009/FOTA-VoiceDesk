import "server-only"

export { clonedAudioCacheKey } from "./cache-key"

export function isElevenLabsConfigured(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY?.trim())
}

export function useMockElevenLabs(): boolean {
  if (process.env.ELEVENLABS_MOCK === "true") {
    return true
  }
  if (process.env.NODE_ENV === "production") {
    return false
  }
  return !isElevenLabsConfigured()
}

export function getElevenLabsApiKey(): string {
  if (useMockElevenLabs()) {
    return process.env.ELEVENLABS_API_KEY?.trim() || "voicedesk-dev-elevenlabs"
  }
  const key = process.env.ELEVENLABS_API_KEY?.trim()
  if (!key) {
    throw new Error("ElevenLabs is not connected. Add ELEVENLABS_API_KEY to generate cloned speech.")
  }
  return key
}

export function getElevenLabsModelId(): string {
  return process.env.ELEVENLABS_MODEL_ID?.trim() || "eleven_multilingual_v2"
}

export function elevenLabsCloneUrl(): string {
  return "https://api.elevenlabs.io/v1/voices/add"
}

export function elevenLabsSpeechUrl(voiceId: string): string {
  return `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`
}

export async function cloneVoiceWithElevenLabs(input: {
  name: string
  file: File
}): Promise<{ voiceId: string; mocked: boolean }> {
  if (useMockElevenLabs()) {
    return { voiceId: `mock_${crypto.randomUUID()}`, mocked: true }
  }

  const body = new FormData()
  body.set("name", input.name)
  body.set("description", "FOTA VoiceDesk cloned campaign voice")
  body.append("files", input.file)

  const response = await fetch(elevenLabsCloneUrl(), {
    method: "POST",
    headers: {
      "xi-api-key": getElevenLabsApiKey(),
    },
    body,
  })
  if (!response.ok) {
    const detail = await response.text()
    console.error("[elevenlabs.clone] failed", response.status, detail)
    throw new Error("Unable to clone this voice sample. Check the ElevenLabs plan and try a clearer recording.")
  }
  const payload = (await response.json()) as { voice_id?: string }
  if (!payload.voice_id) {
    throw new Error("ElevenLabs did not return a voice id")
  }
  return { voiceId: payload.voice_id, mocked: false }
}

export async function synthesizeWithElevenLabs(input: {
  voiceId: string
  text: string
}): Promise<{ audio: Buffer; mocked: boolean }> {
  const text = input.text.trim()
  if (!text) {
    throw new Error("A spoken script is required to generate cloned audio")
  }
  if (useMockElevenLabs()) {
    return { audio: mockMp3(), mocked: true }
  }

  const response = await fetch(elevenLabsSpeechUrl(input.voiceId), {
    method: "POST",
    headers: {
      "xi-api-key": getElevenLabsApiKey(),
      Accept: "audio/mpeg",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: getElevenLabsModelId(),
    }),
  })
  if (!response.ok) {
    const detail = await response.text()
    console.error("[elevenlabs.speech] failed", response.status, detail)
    throw new Error("Unable to generate cloned speech. Try again or use a catalog voice.")
  }
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length === 0) {
    throw new Error("ElevenLabs returned empty audio")
  }
  return { audio: bytes, mocked: false }
}

function mockMp3(): Buffer {
  return Buffer.from("ID3\u0003\u0000\u0000\u0000\u0000\u0000\u0000mock-elevenlabs-audio")
}
