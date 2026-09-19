import { formatLagosDate } from "@/lib/datetime"

import { prisma } from "@/server/db/prisma"
import { formatDuration } from "@/server/campaigns/wizard-draft"
import { messageStatusLabel } from "@/server/voice/script"

export const voiceLibraryViews = ["library", "tts", "recording", "archived"] as const

export type VoiceLibraryView = (typeof voiceLibraryViews)[number]

export type VoiceLibraryItem = {
  id: string
  name: string
  kind: "TTS" | "RECORDING"
  typeLabel: string
  durationSeconds: number | null
  durationLabel: string
  createdAt: Date
  createdLabel: string
  campaignCount: number
  status: "Active" | "Archived"
  voice: string | null
  language: string | null
  ttsText: string | null
  mediaUrl: string | null
  fileSizeBytes: number | null
  voiceProfileId: string | null
}

export type VoiceLibraryData = {
  view: VoiceLibraryView
  items: VoiceLibraryItem[]
  stats: {
    library: number
    tts: number
    recording: number
    archived: number
    minutesLabel: string
  }
}

export function parseVoiceLibraryView(value: string | undefined): VoiceLibraryView {
  if (value === "tts" || value === "recording" || value === "archived") {
    return value
  }
  return "library"
}

export async function getVoiceLibrary(view: VoiceLibraryView): Promise<VoiceLibraryData> {
  const messages = await prisma.voiceMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      _count: { select: { campaigns: true } },
    },
  })

  const mapped = messages.map((message) => toLibraryItem(message))
  const active = mapped.filter((item) => item.status === "Active")
  const tts = active.filter((item) => item.kind === "TTS")
  const recording = active.filter((item) => item.kind === "RECORDING")
  const archived = mapped.filter((item) => item.status === "Archived")
  const totalSeconds = active.reduce((sum, item) => sum + (item.durationSeconds ?? 0), 0)

  const items =
    view === "tts"
      ? tts
      : view === "recording"
        ? recording
        : view === "archived"
          ? archived
          : active

  return {
    view,
    items,
    stats: {
      library: active.length,
      tts: tts.length,
      recording: recording.length,
      archived: archived.length,
      minutesLabel: formatDuration(totalSeconds),
    },
  }
}

export async function getVoiceMessage(id: string) {
  const message = await prisma.voiceMessage.findUnique({
    where: { id },
    include: {
      _count: { select: { campaigns: true } },
    },
  })
  if (!message) {
    return null
  }
  return {
    ...toLibraryItem(message),
    introText: message.introText,
    includeRecipientName: message.includeRecipientName,
    voiceProfileId: message.voiceProfileId,
  }
}

function toLibraryItem(message: {
  id: string
  kind: "TTS" | "RECORDING"
  title: string
  ttsText: string | null
  voice: string | null
  language: string | null
  mediaUrl: string | null
  durationSeconds: number | null
  fileSizeBytes: number | null
  archivedAt: Date | null
  createdAt: Date
  voiceProfileId: string | null
  _count: { campaigns: number }
}): VoiceLibraryItem {
  return {
    id: message.id,
    name: message.title,
    kind: message.kind,
    typeLabel: message.voiceProfileId
      ? "Cloned voice"
      : message.kind === "TTS"
        ? "Text to speech"
        : "Recorded audio",
    durationSeconds: message.durationSeconds,
    durationLabel:
      message.durationSeconds != null && message.durationSeconds > 0
        ? formatDuration(message.durationSeconds)
        : "—",
    createdAt: message.createdAt,
    createdLabel: formatLagosDate(message.createdAt),
    campaignCount: message._count.campaigns,
    status: messageStatusLabel(message.archivedAt),
    voice: message.voice,
    language: message.language,
    ttsText: message.ttsText,
    mediaUrl: message.mediaUrl,
    fileSizeBytes: message.fileSizeBytes,
    voiceProfileId: message.voiceProfileId,
  }
}
