import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { DashboardErrorState } from "@/components/dashboard/dashboard-error"
import { VoiceMessageComposer } from "@/components/voice-studio/composer"
import { getVoiceMessage } from "@/server/voice/library"
import { cloneVoiceValue } from "@/server/voice/clone"
import { listVoiceProfilesForPicker } from "@/server/voice/profiles"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  try {
    const message = await getVoiceMessage(id)
    return { title: message?.name ?? "Voice message" }
  } catch {
    return { title: "Voice message" }
  }
}

export default async function EditVoiceMessagePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  try {
    const message = await getVoiceMessage(id)
    if (!message) {
      notFound()
    }
    const clonedVoices = await listVoiceProfilesForPicker(message.voiceProfileId)
    return (
      <VoiceMessageComposer
        clonedVoices={clonedVoices}
        message={{
          id: message.id,
          name: message.name,
          kind: message.kind,
          ttsText: message.ttsText ?? "",
          voice: message.voiceProfileId
            ? cloneVoiceValue(message.voiceProfileId)
            : message.voice ?? "en-NG-female",
          language: message.language ?? "en-NG",
          durationSeconds: message.durationSeconds,
          mediaUrl: message.mediaUrl,
          fileSizeBytes: message.fileSizeBytes,
        }}
      />
    )
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) {
      throw error
    }
    console.error("Voice message failed", error)
    return (
      <DashboardErrorState message="Unable to load this voice message. Check that the database is available." />
    )
  }
}
