import type { Metadata } from "next"

import { CampaignWizard } from "@/components/campaign-wizard/campaign-wizard"
import { DashboardErrorState } from "@/components/dashboard/dashboard-error"
import { getWizardOptions } from "@/server/campaigns/get-wizard-options"

export const metadata: Metadata = {
  title: "Create Campaign",
}

export default async function CreateCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>
}) {
  try {
    const params = await searchParams
    const options = await getWizardOptions()
    return (
      <CampaignWizard
        groups={options.groups}
        contacts={options.contacts}
        twilioConnected={options.twilioConnected}
        voiceMessages={options.voiceMessages}
        clonedVoices={options.clonedVoices}
        initialTemplateId={params.template}
      />
    )
  } catch (error) {
    console.error("Wizard options failed", error)
    return (
      <DashboardErrorState message="Unable to load campaign setup. Check that the database is available." />
    )
  }
}
