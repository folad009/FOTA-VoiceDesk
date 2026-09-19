import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

const ALLOWED_AUDIO = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
])

export async function saveVoiceRecording(
  file: File,
  options?: { maxBytes?: number },
): Promise<{
  mediaUrl: string
  fileSizeBytes: number
}> {
  const maxBytes = options?.maxBytes ?? 8 * 1024 * 1024
  if (file.size <= 0) {
    throw new Error("Upload an audio file")
  }
  if (file.size > maxBytes) {
    throw new Error(
      maxBytes > 8 * 1024 * 1024
        ? "Voice samples must be 25 MB or smaller"
        : "Audio files must be 8 MB or smaller",
    )
  }
  const type = file.type.toLowerCase()
  if (type && !ALLOWED_AUDIO.has(type) && !type.startsWith("audio/")) {
    throw new Error("Upload an MP3, WAV, or M4A recording")
  }

  const extension = extensionFor(file.type, file.name)
  const fileName = `${crypto.randomUUID()}.${extension}`
  const directory = path.join(process.cwd(), "public", "uploads", "voice")
  await mkdir(directory, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(directory, fileName), buffer)

  return {
    mediaUrl: `/uploads/voice/${fileName}`,
    fileSizeBytes: file.size,
  }
}

function extensionFor(mimeType: string, fileName: string): string {
  if (mimeType.includes("wav")) {
    return "wav"
  }
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) {
    return "mp3"
  }
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) {
    return "m4a"
  }
  const fromName = fileName.split(".").pop()?.toLowerCase()
  if (fromName === "wav" || fromName === "mp3" || fromName === "m4a") {
    return fromName
  }
  return "mp3"
}
