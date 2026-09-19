import { access, mkdir, stat, writeFile } from "node:fs/promises"
import path from "node:path"

import { clonedAudioCacheKey } from "@/lib/elevenlabs/cache-key"
import { synthesizeWithElevenLabs } from "@/lib/elevenlabs/client"
import {
  putVoiceObject,
  useS3VoiceStorage,
  voiceMediaUrl,
  voiceObjectExists,
} from "@/lib/s3/client"

export async function generateClonedSpeech(input: {
  elevenLabsVoiceId: string
  text: string
}): Promise<{ mediaUrl: string; fileSizeBytes: number; mocked: boolean }> {
  const text = input.text.trim()
  if (!text) {
    throw new Error("A spoken script is required to generate cloned audio")
  }

  const fileName = `clone-${clonedAudioCacheKey(input.elevenLabsVoiceId, text)}.mp3`
  const mediaUrl = voiceMediaUrl(fileName)
  const useS3 = useS3VoiceStorage()

  if (useS3) {
    if (await voiceObjectExists(fileName)) {
      return { mediaUrl, fileSizeBytes: 0, mocked: false }
    }
  } else {
    const directory = path.join(process.cwd(), "public", "uploads", "voice")
    const filePath = path.join(directory, fileName)
    try {
      await access(filePath)
      const info = await stat(filePath)
      if (info.size > 0) {
        return { mediaUrl, fileSizeBytes: info.size, mocked: false }
      }
    } catch {
      // Generate a new file when the cache miss or the previous write is empty.
    }
  }

  const { audio, mocked } = await synthesizeWithElevenLabs({
    voiceId: input.elevenLabsVoiceId,
    text,
  })

  if (useS3) {
    await putVoiceObject({
      fileName,
      body: audio,
      contentType: "audio/mpeg",
    })
  } else {
    const directory = path.join(process.cwd(), "public", "uploads", "voice")
    await mkdir(directory, { recursive: true })
    await writeFile(path.join(directory, fileName), audio)
  }

  return { mediaUrl, fileSizeBytes: audio.length, mocked }
}
