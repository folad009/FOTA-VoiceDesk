import type { Metadata } from "next"

import { DashboardErrorState } from "@/components/dashboard/dashboard-error"
import { VoiceMessageComposer } from "@/components/voice-studio/composer"
import { listVoiceProfilesForPicker } from "@/server/voice/profiles"

export const metadata: Metadata = {
  title: "Create Message",
}

export default async function CreateVoiceMessagePage() {
  try {
    const clonedVoices = await listVoiceProfilesForPicker()
    return <VoiceMessageComposer clonedVoices={clonedVoices} />
  } catch (error) {
    console.error("Create voice message failed", error)
    return (
      <DashboardErrorState message="Unable to load cloned voices. Check that the database is available." />
    )
  }
}
