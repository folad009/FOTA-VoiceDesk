"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { archiveVoiceProfile, createVoiceProfile } from "@/server/voice/profiles"

function revalidateVoices() {
  revalidatePath("/voice/voices")
  revalidatePath("/voice/messages")
  revalidatePath("/voice/messages/new")
  revalidatePath("/campaigns/new")
}

export async function createVoiceProfileAction(formData: FormData): Promise<void> {
  const sample = formData.get("sample")
  await createVoiceProfile({
    name: String(formData.get("name") ?? ""),
    sample: sample instanceof File ? sample : new File([], ""),
  })
  revalidateVoices()
  redirect("/voice/voices")
}

export async function archiveVoiceProfileAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "")
  if (!id) {
    throw new Error("Cloned voice is required")
  }
  await archiveVoiceProfile(id)
  revalidateVoices()
}
