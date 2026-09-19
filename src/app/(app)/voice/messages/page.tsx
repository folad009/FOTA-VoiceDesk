import type { Metadata } from "next"

import { DashboardErrorState } from "@/components/dashboard/dashboard-error"
import { VoiceMessageLibrary } from "@/components/voice-studio/library"
import { getVoiceLibrary, parseVoiceLibraryView } from "@/server/voice/library"

export const metadata: Metadata = {
  title: "Voice Messages",
}

export default async function VoiceMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const params = await searchParams
  try {
    const data = await getVoiceLibrary(parseVoiceLibraryView(params.view))
    return <VoiceMessageLibrary data={data} />
  } catch (error) {
    console.error("Voice library failed", error)
    return (
      <DashboardErrorState message="Unable to load voice messages. Check that the database is available." />
    )
  }
}
