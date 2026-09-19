import { requireActorId } from "@/server/auth/actor"
import { prisma } from "@/server/db/prisma"
import {
  duplicateMessageTitle,
  estimateSpokenSeconds,
  scriptUsesFirstName,
} from "@/server/voice/script"
import { clonedSpeechPlan, parseCloneVoiceValue } from "@/server/voice/clone"
import { generateClonedSpeech } from "@/server/voice/generate"
import { requireActiveVoiceProfile } from "@/server/voice/profiles"
import { saveVoiceRecording } from "@/server/voice/store"

export type VoiceMessageKind = "TTS" | "RECORDING"

export type SaveVoiceMessageInput = {
  id?: string
  name: string
  kind: VoiceMessageKind
  ttsText: string
  voice: string
  language: string
  durationSeconds?: number | null
  audio?: File | null
}

export async function saveVoiceMessage(input: SaveVoiceMessageInput): Promise<{ id: string }> {
  const actorId = await operatorId()
  const name = input.name.trim()
  if (!name) {
    throw new Error("Message name is required")
  }

  if (input.kind === "TTS") {
    const ttsText = input.ttsText.trim()
    if (!ttsText) {
      throw new Error("Write a spoken script")
    }
    const includeRecipientName = scriptUsesFirstName(ttsText)
    const cloned = await resolveClonedTts({
      voice: input.voice,
      ttsText,
      includeRecipientName,
    })
    const data = {
      kind: "TTS" as const,
      title: name,
      ttsText,
      voice: input.voice,
      language: input.language,
      includeRecipientName,
      introText: null,
      mediaUrl: cloned.mediaUrl,
      fileSizeBytes: cloned.fileSizeBytes,
      durationSeconds: estimateSpokenSeconds(ttsText),
      voiceProfileId: cloned.voiceProfileId,
    }
    if (input.id) {
      await requireMessage(input.id)
      await prisma.voiceMessage.update({ where: { id: input.id }, data })
      await writeAudit(actorId, "voice_message.updated", input.id, { name, kind: "TTS" })
      return { id: input.id }
    }
    const created = await prisma.voiceMessage.create({
      data: { ...data, createdById: actorId },
    })
    await writeAudit(actorId, "voice_message.created", created.id, { name, kind: "TTS" })
    return { id: created.id }
  }

  const existing = input.id ? await requireMessage(input.id) : null
  const uploaded =
    input.audio && input.audio.size > 0 ? await saveVoiceRecording(input.audio) : null
  if (!existing && !uploaded) {
    throw new Error("Upload a recorded audio file")
  }

  const durationSeconds =
    input.durationSeconds != null && Number.isFinite(input.durationSeconds)
      ? Math.max(1, Math.round(input.durationSeconds))
      : existing?.durationSeconds ?? null

  const data = {
    kind: "RECORDING" as const,
    title: name,
    ttsText: null,
    voice: input.voice,
    language: input.language,
    includeRecipientName: false,
    mediaUrl: uploaded?.mediaUrl ?? existing?.mediaUrl ?? null,
    durationSeconds,
    fileSizeBytes: uploaded?.fileSizeBytes ?? existing?.fileSizeBytes ?? null,
    voiceProfileId: null,
  }

  if (existing) {
    await prisma.voiceMessage.update({ where: { id: existing.id }, data })
    await writeAudit(actorId, "voice_message.updated", existing.id, { name, kind: "RECORDING" })
    return { id: existing.id }
  }

  const created = await prisma.voiceMessage.create({
    data: { ...data, createdById: actorId },
  })
  await writeAudit(actorId, "voice_message.created", created.id, { name, kind: "RECORDING" })
  return { id: created.id }
}

export async function duplicateVoiceMessage(id: string): Promise<{ id: string }> {
  const actorId = await operatorId()
  const source = await requireMessage(id)
  const created = await prisma.voiceMessage.create({
    data: {
      kind: source.kind,
      title: duplicateMessageTitle(source.title),
      ttsText: source.ttsText,
      voice: source.voice,
      language: source.language,
      introText: source.introText,
      includeRecipientName: source.includeRecipientName,
      mediaUrl: source.mediaUrl,
      durationSeconds: source.durationSeconds,
      fileSizeBytes: source.fileSizeBytes,
      voiceProfileId: source.voiceProfileId,
      createdById: actorId,
    },
  })
  await writeAudit(actorId, "voice_message.duplicated", created.id, {
    sourceId: source.id,
    name: created.title,
  })
  return { id: created.id }
}

export async function archiveVoiceMessage(id: string): Promise<void> {
  const actorId = await operatorId()
  await requireMessage(id)
  await prisma.voiceMessage.update({
    where: { id },
    data: { archivedAt: new Date() },
  })
  await writeAudit(actorId, "voice_message.archived", id, {})
}

export async function restoreVoiceMessage(id: string): Promise<void> {
  const actorId = await operatorId()
  await requireMessage(id)
  await prisma.voiceMessage.update({
    where: { id },
    data: { archivedAt: null },
  })
  await writeAudit(actorId, "voice_message.restored", id, {})
}

async function resolveClonedTts(input: {
  voice: string
  ttsText: string
  includeRecipientName: boolean
}): Promise<{
  voiceProfileId: string | null
  mediaUrl: string | null
  fileSizeBytes: number | null
}> {
  const profileId = parseCloneVoiceValue(input.voice)
  if (!profileId) {
    return { voiceProfileId: null, mediaUrl: null, fileSizeBytes: null }
  }
  const profile = await requireActiveVoiceProfile(profileId)
  const plan = clonedSpeechPlan({
    kind: "TTS",
    voiceProfileId: profile.id,
    includeRecipientName: input.includeRecipientName,
  })
  if (plan !== "shared") {
    return { voiceProfileId: profile.id, mediaUrl: null, fileSizeBytes: null }
  }
  const generated = await generateClonedSpeech({
    elevenLabsVoiceId: profile.elevenLabsVoiceId,
    text: input.ttsText,
  })
  return {
    voiceProfileId: profile.id,
    mediaUrl: generated.mediaUrl,
    fileSizeBytes: generated.fileSizeBytes,
  }
}

async function requireMessage(id: string) {
  const message = await prisma.voiceMessage.findUnique({ where: { id } })
  if (!message) {
    throw new Error("Voice message not found")
  }
  return message
}

async function operatorId(): Promise<string> {
  return requireActorId()
}

async function writeAudit(
  actorUserId: string,
  action: string,
  entityId: string,
  metadata: Record<string, string>,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorUserId,
      action,
      entityType: "voice_message",
      entityId,
      metadata,
    },
  })
}
