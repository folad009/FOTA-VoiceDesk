import type { Metadata } from "next"

import { DashboardErrorState } from "@/components/dashboard/dashboard-error"
import { ClonedVoicesStudio } from "@/components/voice-studio/cloned-voices"
import { getVoiceProfiles } from "@/server/voice/profiles"

export const metadata: Metadata = {
  title: "Cloned Voices",
}

export default async function ClonedVoicesPage() {
  try {
    const data = await getVoiceProfiles()
    return <ClonedVoicesStudio items={data.items} mocked={data.mocked} />
  } catch (error) {
    console.error("Cloned voices failed", error)
    return (
      <DashboardErrorState message="Unable to load cloned voices. Check that the database is available." />
    )
  }
}
