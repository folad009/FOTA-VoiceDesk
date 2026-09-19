const VOICE_PREFIX = "voice/"

export function voiceObjectKey(fileName: string): string {
  const safe = fileName
    .replaceAll("\\", "/")
    .split("/")
    .filter((part) => part.length > 0 && part !== "." && part !== "..")
    .join("/")
  if (!safe) {
    throw new Error("Invalid voice object key")
  }
  if (safe.startsWith(VOICE_PREFIX)) {
    return safe
  }
  return `${VOICE_PREFIX}${safe}`
}

/** Map stored media URLs to the voice object file name. */
export function voiceFileNameFromMediaUrl(mediaUrl: string): string | null {
  const trimmed = mediaUrl.trim()
  if (!trimmed) {
    return null
  }
  try {
    const path = trimmed.startsWith("http") ? new URL(trimmed).pathname : trimmed
    const match = path.match(/\/(?:api\/voice\/media|uploads\/voice)\/([^/?#]+)$/i)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

export function voiceMediaUrl(fileName: string): string {
  return `/api/voice/media/${fileName}`
}

export function contentTypeForFileName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase()
  if (ext === "wav") {
    return "audio/wav"
  }
  if (ext === "m4a") {
    return "audio/mp4"
  }
  return "audio/mpeg"
}

/** Normalize app media paths so Twilio Play hits the media API (S3 or disk). */
export function playableMediaPath(mediaUrl: string): string {
  if (/^https?:\/\//i.test(mediaUrl)) {
    return mediaUrl
  }
  const fileName = voiceFileNameFromMediaUrl(mediaUrl)
  if (fileName) {
    return voiceMediaUrl(fileName)
  }
  return mediaUrl.startsWith("/") ? mediaUrl : `/${mediaUrl}`
}
