import { createHash } from "node:crypto"

export function clonedAudioCacheKey(elevenLabsVoiceId: string, text: string): string {
  return createHash("sha256")
    .update(`${elevenLabsVoiceId}\n${text.trim()}`)
    .digest("hex")
    .slice(0, 24)
}
