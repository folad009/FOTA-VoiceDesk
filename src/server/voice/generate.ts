import { access, mkdir, stat, writeFile } from "node:fs/promises"
import path from "node:path"

import { clonedAudioCacheKey } from "@/lib/elevenlabs/cache-key"
import { synthesizeWithElevenLabs } from "@/lib/elevenlabs/client"

export async function generateClonedSpeech(input: {
  elevenLabsVoiceId: string
  text: string
}): Promise<{ mediaUrl: string; fileSizeBytes: number; mocked: boolean }> {
  const text = input.text.trim()
  if (!text) {
    throw new Error("A spoken script is required to generate cloned audio")
  }

  const fileName = `clone-${clonedAudioCacheKey(input.elevenLabsVoiceId, text)}.mp3`
  const directory = path.join(process.cwd(), "public", "uploads", "voice")
  const filePath = path.join(directory, fileName)
  const mediaUrl = `/uploads/voice/${fileName}`

  try {
    await access(filePath)
    const info = await stat(filePath)
    if (info.size > 0) {
      return { mediaUrl, fileSizeBytes: info.size, mocked: false }
    }
  } catch {
    // Generate a new file when the cache miss or the previous write is empty.
  }

  const { audio, mocked } = await synthesizeWithElevenLabs({
    voiceId: input.elevenLabsVoiceId,
    text,
  })
  await mkdir(directory, { recursive: true })
  await writeFile(filePath, audio)
  return { mediaUrl, fileSizeBytes: audio.length, mocked }
}
