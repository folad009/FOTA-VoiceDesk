export const CLONE_VOICE_PREFIX = "clone:"

export function cloneVoiceValue(profileId: string): string {
  return `${CLONE_VOICE_PREFIX}${profileId}`
}

export function parseCloneVoiceValue(voice: string | null | undefined): string | null {
  const value = voice?.trim() ?? ""
  if (!value.startsWith(CLONE_VOICE_PREFIX)) {
    return null
  }
  const profileId = value.slice(CLONE_VOICE_PREFIX.length).trim()
  return profileId.length > 0 ? profileId : null
}

export function clonedSpeechPlan(input: {
  kind: "TTS" | "RECORDING"
  voiceProfileId: string | null
  includeRecipientName: boolean
}): "none" | "shared" | "per-recipient" {
  if (input.kind !== "TTS" || !input.voiceProfileId) {
    return "none"
  }
  return input.includeRecipientName ? "per-recipient" : "shared"
}

export function playbackMediaUrl(input: {
  kind: "TTS" | "RECORDING"
  voiceProfileId: string | null
  generatedMediaUrl: string | null
  messageMediaUrl: string | null
}): string | null {
  if (input.generatedMediaUrl) {
    return input.generatedMediaUrl
  }
  if (input.kind === "RECORDING") {
    return input.messageMediaUrl
  }
  if (input.voiceProfileId) {
    return input.messageMediaUrl
  }
  return null
}
