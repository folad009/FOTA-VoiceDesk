import { isLiveTwilioConfigured, useMockTwilio } from "@/lib/twilio/client"
import { prisma } from "@/server/db/prisma"

export type WizardContact = {
  id: string
  name: string
  phoneE164: string
}

export type WizardGroup = {
  id: string
  name: string
  memberCount: number
  members: WizardContact[]
}

export type WizardVoiceMessage = {
  id: string
  title: string
  kind: "TTS" | "RECORDING"
  ttsText: string | null
  voice: string | null
  language: string | null
  includeRecipientName: boolean
  mediaUrl: string | null
  durationSeconds: number | null
}

export type WizardClonedVoice = {
  id: string
  name: string
}

export type WizardOptions = {
  groups: WizardGroup[]
  contacts: WizardContact[]
  voiceMessages: WizardVoiceMessage[]
  clonedVoices: WizardClonedVoice[]
  twilioConnected: boolean
}

export function isTwilioConnected(): boolean {
  return isLiveTwilioConfigured() || useMockTwilio()
}

export async function getWizardOptions(): Promise<WizardOptions> {
  const [groups, contacts, voiceMessages, clonedVoices] = await Promise.all([
    prisma.contactGroup.findMany({
      orderBy: { name: "asc" },
      include: {
        members: {
          include: {
            contact: {
              select: { id: true, name: true, phoneE164: true, isActive: true },
            },
          },
        },
      },
    }),
    prisma.contact.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      take: 200,
      select: { id: true, name: true, phoneE164: true },
    }),
    prisma.voiceMessage.findMany({
      where: { archivedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        kind: true,
        ttsText: true,
        voice: true,
        language: true,
        includeRecipientName: true,
        mediaUrl: true,
        durationSeconds: true,
      },
    }),
    prisma.voiceProfile.findMany({
      where: { archivedAt: null },
      orderBy: { name: "asc" },
      take: 100,
      select: { id: true, name: true },
    }),
  ])

  return {
    twilioConnected: isTwilioConnected(),
    contacts,
    voiceMessages,
    clonedVoices,
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      memberCount: group.members.filter((member) => member.contact.isActive).length,
      members: group.members
        .filter((member) => member.contact.isActive)
        .map((member) => ({
          id: member.contact.id,
          name: member.contact.name,
          phoneE164: member.contact.phoneE164,
        })),
    })),
  }
}
