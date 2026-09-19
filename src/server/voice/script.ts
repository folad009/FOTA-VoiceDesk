const WORDS_PER_MINUTE = 150

function firstNameToken(): RegExp {
  return /\{\{\s*firstName\s*\}\}/gi
}

export function spokenCampaignBody(text: string | null | undefined): string | null {
  const trimmed = text?.trim()
  return trimmed ? trimmed : null
}

export function applyVoiceTemplate(
  text: string,
  vars: { firstName: string },
): string {
  return text.replace(firstNameToken(), vars.firstName)
}

export function previewVoiceScript(text: string, sampleName = "John"): string {
  const first = sampleName.trim().split(/\s+/)[0] || "John"
  return applyVoiceTemplate(text, { firstName: first })
}

export function spokenCharacterCount(text: string): number {
  return previewVoiceScript(text).length
}

export function estimateSpokenSeconds(text: string): number {
  const spoken = previewVoiceScript(text).trim()
  if (spoken.length === 0) {
    return 0
  }
  const words = spoken.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round((words / WORDS_PER_MINUTE) * 60))
}

export function duplicateMessageTitle(title: string): string {
  const trimmed = title.trim()
  if (trimmed.toLowerCase().startsWith("copy of ")) {
    return trimmed
  }
  return `Copy of ${trimmed}`
}

export function messageStatusLabel(archivedAt: Date | null): "Active" | "Archived" {
  return archivedAt ? "Archived" : "Active"
}

export function scriptUsesFirstName(text: string): boolean {
  return firstNameToken().test(text)
}

export function spokenScriptForContact(
  text: string,
  contactName: string,
  includeRecipientName: boolean,
): string {
  const first = contactName.trim().split(/\s+/)[0] || "friend"
  const replaced = applyVoiceTemplate(text, { firstName: first })
  if (scriptUsesFirstName(text) || !includeRecipientName) {
    return replaced.trim()
  }
  if (!replaced.trim()) {
    return `Hello ${first}.`
  }
  return `Hello ${first}. ${replaced.trim()}`
}

export function studioWaveform(seed: string, count = 48): number[] {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  const bars: number[] = []
  for (let index = 0; index < count; index += 1) {
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177)
    const envelope = 0.35 + 0.65 * Math.abs(Math.sin(index * 0.41 + (hash & 255) / 40))
    const jitter = ((hash >>> 8) & 63) / 63
    bars.push(Math.max(8, Math.round((0.45 + 0.55 * jitter) * envelope * 100)))
  }
  return bars
}
