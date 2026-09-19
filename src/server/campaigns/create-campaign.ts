import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { fromZonedTime } from "date-fns-tz"

import { requireOperator } from "@/server/auth/actor"
import { prisma } from "@/server/db/prisma"
import { enqueueCallingTick } from "@/server/calling/engine"
import { isTwilioConnected } from "@/server/campaigns/get-wizard-options"
import {
  canProceedFromStep,
  launchStatus,
  mergeAudience,
  parseWizardDraft,
  type WizardDraft,
} from "@/server/campaigns/wizard-draft"
import { clonedSpeechPlan, parseCloneVoiceValue } from "@/server/voice/clone"
import { generateClonedSpeech } from "@/server/voice/generate"
import { requireActiveVoiceProfile } from "@/server/voice/profiles"

export async function createCampaignFromDraft({
  draft: rawDraft,
  intent,
  audio,
}: {
  draft: WizardDraft
  intent: "draft" | "launch"
  audio: File | null
}): Promise<{ campaignId: string }> {
  const draft = parseWizardDraft(rawDraft)
  if (intent === "launch" && !canProceedFromStep("review", draft)) {
    throw new Error("Campaign is not ready to launch")
  }
  if (intent === "launch" && !isTwilioConnected()) {
    throw new Error("Twilio is not connected")
  }

  const actor = await requireOperator()

  const groupRecords = await prisma.contactGroup.findMany({
    where: { id: { in: draft.selectedGroupIds } },
    include: {
      members: {
        include: {
          contact: { select: { id: true, name: true, phoneE164: true } },
        },
      },
    },
  })

  const selectedContacts = await prisma.contact.findMany({
    where: { id: { in: draft.selectedContactIds }, isActive: true },
    select: { id: true, name: true, phoneE164: true },
  })

  const groupMembers = groupRecords.flatMap((group) =>
    group.members.map((member) => ({
      id: member.contact.id,
      name: member.contact.name,
      phoneE164: member.contact.phoneE164,
      source: group.name,
    })),
  )

  const audience = mergeAudience({
    groupMembers,
    selectedContacts,
    uploadedRecipients: draft.uploadedRecipients,
  })

  if (intent === "launch" && audience.length === 0) {
    throw new Error("Select or upload at least one recipient")
  }

  let mediaUrl: string | null = null
  let voiceProfileId: string | null = null
  if (!draft.libraryMessageId && draft.messageKind === "RECORDING" && audio && audio.size > 0) {
    const extension = extensionFor(audio.type, audio.name)
    const fileName = `${crypto.randomUUID()}.${extension}`
    const directory = path.join(process.cwd(), "public", "uploads", "voice")
    await mkdir(directory, { recursive: true })
    const buffer = Buffer.from(await audio.arrayBuffer())
    await writeFile(path.join(directory, fileName), buffer)
    mediaUrl = `/uploads/voice/${fileName}`
  }
  if (!draft.libraryMessageId && draft.messageKind === "TTS") {
    const profileId = parseCloneVoiceValue(draft.voice)
    if (profileId) {
      const profile = await requireActiveVoiceProfile(profileId)
      voiceProfileId = profile.id
      const plan = clonedSpeechPlan({
        kind: "TTS",
        voiceProfileId: profile.id,
        includeRecipientName: draft.includeRecipientName,
      })
      if (plan === "shared") {
        const generated = await generateClonedSpeech({
          elevenLabsVoiceId: profile.elevenLabsVoiceId,
          text: draft.ttsText.trim(),
        })
        mediaUrl = generated.mediaUrl
      }
    }
  }

  const status = intent === "draft" ? "DRAFT" : launchStatus(draft)
  const scheduledFor =
    status === "SCHEDULED" && draft.scheduledDate && draft.scheduledTime
      ? fromZonedTime(`${draft.scheduledDate}T${draft.scheduledTime}:00`, draft.timezone)
      : null

  const campaignId = await prisma.$transaction(async (tx) => {
    const contactIds: string[] = []
    for (const row of audience) {
      const existing = await tx.contact.findUnique({
        where: { phoneE164: row.phoneE164 },
        select: { id: true },
      })
      if (existing) {
        contactIds.push(existing.id)
        continue
      }
      const created = await tx.contact.create({
        data: {
          name: row.name,
          phoneE164: row.phoneE164,
        },
        select: { id: true },
      })
      contactIds.push(created.id)
    }

    let voiceMessageId: string
    if (draft.libraryMessageId.trim()) {
      const saved = await tx.voiceMessage.findFirst({
        where: { id: draft.libraryMessageId, archivedAt: null },
        select: { id: true },
      })
      if (!saved) {
        throw new Error("Saved voice message was not found")
      }
      voiceMessageId = saved.id
    } else {
      const voiceMessage = await tx.voiceMessage.create({
        data: {
          kind: draft.messageKind,
          title: draft.name.trim(),
          ttsText: draft.messageKind === "TTS" ? draft.ttsText.trim() : null,
          voice: draft.voice,
          language: draft.language,
          includeRecipientName: draft.includeRecipientName,
          mediaUrl,
          durationSeconds: draft.recording?.durationSeconds ?? null,
          createdById: actor.id,
          voiceProfileId,
        },
      })
      voiceMessageId = voiceMessage.id
    }

    const campaign = await tx.campaign.create({
      data: {
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        type: draft.type === "" ? "GENERAL_BROADCAST" : draft.type,
        status,
        voiceMessageId,
        groupId: groupRecords[0]?.id ?? null,
        maxAttempts: draft.maxAttempts,
        retryDelayMinutes: draft.retryDelayMinutes,
        callingHoursStartMinutes: draft.callingHoursStartMinutes,
        callingHoursEndMinutes: draft.callingHoursEndMinutes,
        timezone: draft.timezone,
        minDelayBetweenCallsMs: Math.round(draft.pacingSeconds * 1000),
        createdById: actor.id,
        startedAt: status === "QUEUED" ? new Date() : null,
      },
    })

    if (contactIds.length > 0) {
      await tx.campaignRecipient.createMany({
        data: contactIds.map((contactId) => ({
          campaignId: campaign.id,
          contactId,
        })),
        skipDuplicates: true,
      })
    }

    if (scheduledFor) {
      await tx.campaignSchedule.create({
        data: {
          campaignId: campaign.id,
          scheduledFor,
          timezone: draft.timezone,
        },
      })
    }

    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: intent === "launch" ? "campaign.launched" : "campaign.draft_saved",
        entityType: "campaign",
        entityId: campaign.id,
        metadata: { name: campaign.name, recipients: contactIds.length },
      },
    })

    if (intent === "launch") {
      await tx.notification.create({
        data: {
          userId: actor.id,
          kind: "CAMPAIGN",
          title: status === "SCHEDULED" ? "Campaign scheduled" : "Campaign launched",
          body:
            status === "SCHEDULED"
              ? `${campaign.name} will start at the scheduled time.`
              : `${campaign.name} is now in the calling queue.`,
        },
      })
    }

    return campaign.id
  })

  if (status === "QUEUED") {
    enqueueCallingTick()
  }

  return { campaignId }
}

function extensionFor(mimeType: string, fileName: string): string {
  if (mimeType.includes("wav")) {
    return "wav"
  }
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) {
    return "mp3"
  }
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) {
    return "m4a"
  }
  const fromName = fileName.split(".").pop()?.toLowerCase()
  if (fromName === "wav" || fromName === "mp3" || fromName === "m4a") {
    return fromName
  }
  return "mp3"
}
