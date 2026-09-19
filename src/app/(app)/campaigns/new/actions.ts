"use server"

import { createCampaignFromDraft } from "@/server/campaigns/create-campaign"
import { parseWizardDraft } from "@/server/campaigns/wizard-draft"
import { operatorErrorMessage } from "@/lib/operator-error"

export async function submitCampaignAction(formData: FormData): Promise<{
  campaignId: string
}> {
  const intentValue = formData.get("intent")
  const intent = intentValue === "launch" ? "launch" : "draft"
  const rawDraft = formData.get("draft")
  if (typeof rawDraft !== "string") {
    throw new Error("Campaign details are missing")
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(rawDraft)
  } catch {
    throw new Error("Campaign details are invalid")
  }

  let draft
  try {
    draft = parseWizardDraft(parsedJson)
  } catch (error) {
    throw new Error(operatorErrorMessage(error, "Campaign details are invalid"))
  }

  const audioValue = formData.get("audio")
  const audio = audioValue instanceof File && audioValue.size > 0 ? audioValue : null

  return createCampaignFromDraft({ draft, intent, audio })
}
