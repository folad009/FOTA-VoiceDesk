"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  archiveVoiceMessage,
  duplicateVoiceMessage,
  restoreVoiceMessage,
  saveVoiceMessage,
  type VoiceMessageKind,
} from "@/server/voice/mutations"

function revalidateStudio(id?: string) {
  revalidatePath("/voice/messages")
  revalidatePath("/voice")
  if (id) {
    revalidatePath(`/voice/messages/${id}`)
  }
}

export async function saveVoiceMessageAction(formData: FormData): Promise<void> {
  const idValue = String(formData.get("id") ?? "").trim()
  const kindValue = String(formData.get("kind") ?? "")
  const kind: VoiceMessageKind = kindValue === "RECORDING" ? "RECORDING" : "TTS"
  const audioValue = formData.get("audio")
  const durationRaw = String(formData.get("durationSeconds") ?? "")
  const durationSeconds = durationRaw.trim() ? Number(durationRaw) : null

  const saved = await saveVoiceMessage({
    id: idValue || undefined,
    name: String(formData.get("name") ?? ""),
    kind,
    ttsText: String(formData.get("ttsText") ?? ""),
    voice: String(formData.get("voice") ?? "en-NG-female"),
    language: String(formData.get("language") ?? "en-NG"),
    durationSeconds,
    audio: audioValue instanceof File && audioValue.size > 0 ? audioValue : null,
  })

  revalidateStudio(saved.id)
  redirect(`/voice/messages/${saved.id}`)
}

export async function duplicateVoiceMessageAction(formData: FormData): Promise<{ id: string }> {
  const id = String(formData.get("id") ?? "")
  if (!id) {
    throw new Error("Voice message is required")
  }
  const copy = await duplicateVoiceMessage(id)
  revalidateStudio(copy.id)
  return { id: copy.id }
}

export async function archiveVoiceMessageAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "")
  if (!id) {
    throw new Error("Voice message is required")
  }
  await archiveVoiceMessage(id)
  revalidateStudio(id)
}

export async function restoreVoiceMessageAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "")
  if (!id) {
    throw new Error("Voice message is required")
  }
  await restoreVoiceMessage(id)
  revalidateStudio(id)
}
