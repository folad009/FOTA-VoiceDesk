import { requireActorId } from "@/server/auth/actor"
import { formatLagosDate } from "@/lib/datetime"
import { prisma } from "@/server/db/prisma"
import { cloneVoiceWithElevenLabs, useMockElevenLabs } from "@/lib/elevenlabs/client"
import { saveVoiceRecording } from "@/server/voice/store"

export async function listVoiceProfiles(includeArchived = false) {
  const profiles = await prisma.voiceProfile.findMany({
    where: includeArchived ? undefined : { archivedAt: null },
    orderBy: { createdAt: "desc" },
    take: 100,
  })
  return profiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    sampleMediaUrl: profile.sampleMediaUrl,
  }))
}

export async function listVoiceProfilesForPicker(currentId?: string | null) {
  const active = await listVoiceProfiles()
  if (!currentId || active.some((item) => item.id === currentId)) {
    return active
  }
  const current = await prisma.voiceProfile.findUnique({
    where: { id: currentId },
    select: { id: true, name: true, sampleMediaUrl: true },
  })
  return current ? [{ id: current.id, name: current.name, sampleMediaUrl: current.sampleMediaUrl }, ...active] : active
}

export async function getVoiceProfiles(): Promise<{
  items: Array<{
    id: string
    name: string
    sampleMediaUrl: string | null
    createdLabel: string
  }>
  mocked: boolean
}> {
  const items = await prisma.voiceProfile.findMany({
    where: { archivedAt: null },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      sampleMediaUrl: true,
      createdAt: true,
    },
  })
  return {
    mocked: useMockElevenLabs(),
    items: items.map((profile) => ({
      id: profile.id,
      name: profile.name,
      sampleMediaUrl: profile.sampleMediaUrl,
      createdLabel: formatLagosDate(profile.createdAt),
    })),
  }
}

export async function createVoiceProfile(input: {
  name: string
  sample: File
}): Promise<{ id: string }> {
  const actorId = await requireActorId()
  const name = input.name.trim()
  if (!name) {
    throw new Error("Voice name is required")
  }
  if (!input.sample || input.sample.size <= 0) {
    throw new Error("Upload a voice sample to clone")
  }

  const stored = await saveVoiceRecording(input.sample, { maxBytes: 25 * 1024 * 1024 })
  const cloned = await cloneVoiceWithElevenLabs({ name, file: input.sample })
  const created = await prisma.voiceProfile.create({
    data: {
      name,
      elevenLabsVoiceId: cloned.voiceId,
      sampleMediaUrl: stored.mediaUrl,
      createdById: actorId,
    },
  })
  await prisma.auditLog.create({
    data: {
      actorUserId: actorId,
      action: "voice_profile.created",
      entityType: "voice_profile",
      entityId: created.id,
      metadata: { name, mocked: String(cloned.mocked) },
    },
  })
  return { id: created.id }
}

export async function archiveVoiceProfile(id: string): Promise<void> {
  const actorId = await requireActorId()
  const profile = await prisma.voiceProfile.findUnique({ where: { id } })
  if (!profile) {
    throw new Error("Cloned voice not found")
  }
  await prisma.voiceProfile.update({
    where: { id },
    data: { archivedAt: new Date() },
  })
  await prisma.auditLog.create({
    data: {
      actorUserId: actorId,
      action: "voice_profile.archived",
      entityType: "voice_profile",
      entityId: id,
      metadata: { name: profile.name },
    },
  })
}

export async function requireActiveVoiceProfile(id: string) {
  const profile = await prisma.voiceProfile.findFirst({
    where: { id, archivedAt: null },
  })
  if (!profile) {
    throw new Error("Cloned voice not found")
  }
  return profile
}
