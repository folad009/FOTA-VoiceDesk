"use server"

import { revalidatePath } from "next/cache"

import {
  cancelCampaign,
  pauseCampaign,
  resumeCampaign,
  retryFailedRecipients,
  retryRecipient,
} from "@/server/campaigns/command-actions"

async function withCampaign(formData: FormData, fn: (campaignId: string) => Promise<void>) {
  const campaignId = String(formData.get("campaignId") ?? "")
  if (!campaignId) {
    throw new Error("Campaign is required")
  }
  await fn(campaignId)
  revalidatePath(`/campaigns/${campaignId}`)
  revalidatePath("/campaigns")
  revalidatePath("/dashboard")
}

export async function pauseCampaignAction(formData: FormData): Promise<void> {
  await withCampaign(formData, pauseCampaign)
}

export async function resumeCampaignAction(formData: FormData): Promise<void> {
  await withCampaign(formData, resumeCampaign)
}

export async function cancelCampaignAction(formData: FormData): Promise<void> {
  await withCampaign(formData, cancelCampaign)
}

export async function retryFailedAction(formData: FormData): Promise<void> {
  await withCampaign(formData, async (campaignId) => {
    await retryFailedRecipients(campaignId)
  })
}

export async function retryRecipientAction(formData: FormData): Promise<void> {
  const campaignId = String(formData.get("campaignId") ?? "")
  const recipientId = String(formData.get("recipientId") ?? "")
  if (!campaignId || !recipientId) {
    throw new Error("Recipient is required")
  }
  await retryRecipient(campaignId, recipientId)
  revalidatePath(`/campaigns/${campaignId}`)
}
