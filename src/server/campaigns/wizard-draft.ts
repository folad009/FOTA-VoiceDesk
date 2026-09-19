import { format, parse } from "date-fns"
import { z } from "zod"

import { APP_LOCALE, APP_TIMEZONE } from "@/config/locale"
import { parseNigerianPhone } from "@/lib/phone"
import { parseCloneVoiceValue } from "@/server/voice/clone"

export const campaignTypes = [
  "SUNDAY_SERVICE_REMINDER",
  "CHURCH_PROGRAMME_REMINDER",
  "CONFERENCE_REMINDER",
  "SERVICE_ANNOUNCEMENT",
  "BIRTHDAY_GREETING",
  "PASTORAL_MESSAGE",
  "WORKERS_MEETING_REMINDER",
  "CELL_FELLOWSHIP_REMINDER",
  "EMERGENCY_ANNOUNCEMENT",
  "GENERAL_BROADCAST",
] as const

export type CampaignType = (typeof campaignTypes)[number]

export const campaignTypeLabels: Record<CampaignType, string> = {
  SUNDAY_SERVICE_REMINDER: "Sunday Service Reminder",
  CHURCH_PROGRAMME_REMINDER: "Church Programme Reminder",
  CONFERENCE_REMINDER: "Conference Reminder",
  SERVICE_ANNOUNCEMENT: "Service Announcement",
  BIRTHDAY_GREETING: "Birthday Greeting",
  PASTORAL_MESSAGE: "Pastoral Announcement",
  WORKERS_MEETING_REMINDER: "Workers' Meeting Reminder",
  CELL_FELLOWSHIP_REMINDER: "Cell Fellowship Reminder",
  EMERGENCY_ANNOUNCEMENT: "Emergency Announcement",
  GENERAL_BROADCAST: "General Broadcast",
}

export const wizardVoices = [
  { id: "en-NG-female", label: "Ada — Female (Nigeria)", lang: "en-NG" },
  { id: "en-NG-male", label: "Tunde — Male (Nigeria)", lang: "en-NG" },
  { id: "en-GB-female", label: "Amelia — Female (UK)", lang: "en-GB" },
  { id: "en-US-female", label: "Jenny — Female (US)", lang: "en-US" },
] as const

export const wizardLanguages = [
  { id: "en-NG", label: "English (Nigeria)" },
  { id: "en-GB", label: "English (UK)" },
  { id: "en-US", label: "English (US)" },
] as const

export function voiceLabel(
  voiceId: string,
  clonedVoices: Array<{ id: string; name: string }> = [],
): string {
  const clonedId = parseCloneVoiceValue(voiceId)
  if (clonedId) {
    return clonedVoices.find((voice) => voice.id === clonedId)?.name ?? "Cloned voice"
  }
  return wizardVoices.find((voice) => voice.id === voiceId)?.label ?? voiceId
}

export const wizardSteps = [
  { id: "details", number: "01", label: "Details" },
  { id: "audience", number: "02", label: "Audience" },
  { id: "message", number: "03", label: "Message" },
  { id: "rules", number: "04", label: "Calling Rules" },
  { id: "schedule", number: "05", label: "Schedule" },
  { id: "review", number: "06", label: "Review" },
] as const

export type WizardStepId = (typeof wizardSteps)[number]["id"]

export type UploadedRecipient = {
  name: string
  phoneE164: string
}

export type AudiencePreviewRow = {
  id: string
  name: string
  phoneE164: string
  source: string
}

export type RecordingMeta = {
  fileName: string
  durationSeconds: number
  sizeBytes: number
  dataUrl?: string
}

export type WizardDraft = {
  templateId: string
  name: string
  description: string
  type: CampaignType | ""
  audienceGuidance: string
  selectedGroupIds: string[]
  selectedContactIds: string[]
  uploadedRecipients: UploadedRecipient[]
  messageKind: "TTS" | "RECORDING"
  ttsText: string
  voice: string
  language: string
  includeRecipientName: boolean
  libraryMessageId: string
  recording: RecordingMeta | null
  maxAttempts: number
  retryDelayMinutes: number
  callingHoursStartMinutes: number
  callingHoursEndMinutes: number
  timezone: string
  pacingSeconds: number
  scheduleMode: "immediate" | "later"
  scheduledDate: string
  scheduledTime: string
}

export type ReadinessCheck = {
  id: string
  label: string
  ok: boolean
}

export function defaultWizardDraft(): WizardDraft {
  return {
    templateId: "",
    name: "",
    description: "",
    type: "SUNDAY_SERVICE_REMINDER",
    audienceGuidance: "",
    selectedGroupIds: [],
    selectedContactIds: [],
    uploadedRecipients: [],
    messageKind: "TTS",
    ttsText: "",
    voice: "en-NG-female",
    language: APP_LOCALE,
    includeRecipientName: false,
    libraryMessageId: "",
    recording: null,
    maxAttempts: 2,
    retryDelayMinutes: 30,
    callingHoursStartMinutes: 480,
    callingHoursEndMinutes: 1140,
    timezone: APP_TIMEZONE,
    pacingSeconds: 2,
    scheduleMode: "immediate",
    scheduledDate: "",
    scheduledTime: "",
  }
}

export function canProceedFromStep(step: WizardStepId, draft: WizardDraft): boolean {
  switch (step) {
    case "details":
      return draft.name.trim().length > 0 && draft.type !== ""
    case "audience":
      return (
        draft.selectedGroupIds.length > 0 ||
        draft.selectedContactIds.length > 0 ||
        draft.uploadedRecipients.length > 0
      )
    case "message":
      if (draft.libraryMessageId.trim().length > 0) {
        return true
      }
      if (draft.messageKind === "TTS") {
        return draft.ttsText.trim().length > 0
      }
      return draft.recording !== null && draft.recording.durationSeconds > 0
    case "rules":
      return (
        draft.maxAttempts >= 1 &&
        draft.retryDelayMinutes >= 1 &&
        draft.callingHoursStartMinutes < draft.callingHoursEndMinutes &&
        draft.timezone.length > 0
      )
    case "schedule":
      if (draft.scheduleMode === "immediate") {
        return true
      }
      return draft.scheduledDate.length > 0 && draft.scheduledTime.length > 0
    case "review":
      return wizardSteps
        .filter((item) => item.id !== "review")
        .every((item) => canProceedFromStep(item.id, draft))
  }
}

export function mergeAudience({
  groupMembers,
  selectedContacts,
  uploadedRecipients,
}: {
  groupMembers: AudiencePreviewRow[]
  selectedContacts: Array<{ id: string; name: string; phoneE164: string }>
  uploadedRecipients: UploadedRecipient[]
}): AudiencePreviewRow[] {
  const rows: AudiencePreviewRow[] = []
  const seen = new Set<string>()

  for (const member of groupMembers) {
    if (seen.has(member.phoneE164)) {
      continue
    }
    seen.add(member.phoneE164)
    rows.push(member)
  }

  for (const contact of selectedContacts) {
    if (seen.has(contact.phoneE164)) {
      continue
    }
    seen.add(contact.phoneE164)
    rows.push({
      id: contact.id,
      name: contact.name,
      phoneE164: contact.phoneE164,
      source: "Individual",
    })
  }

  for (const uploaded of uploadedRecipients) {
    if (seen.has(uploaded.phoneE164)) {
      continue
    }
    seen.add(uploaded.phoneE164)
    rows.push({
      id: `upload:${uploaded.phoneE164}`,
      name: uploaded.name,
      phoneE164: uploaded.phoneE164,
      source: "Upload",
    })
  }

  return rows
}

export function timeValueToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map((part) => Number(part))
  return (hours ?? 0) * 60 + (minutes ?? 0)
}

export function minutesToTimeValue(total: number): string {
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

export function formatCallingHours(startMinutes: number, endMinutes: number): string {
  return `${formatClock(startMinutes)} – ${formatClock(endMinutes)}`
}

export function formatCompactHours(startMinutes: number, endMinutes: number): string {
  return `${formatClock(startMinutes).replace(":00", "").replace(" ", "")}–${formatClock(endMinutes).replace(":00", "").replace(" ", "")}`
}

export function parseCsvContacts(csv: string): UploadedRecipient[] {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  if (lines.length === 0) {
    return []
  }

  const start = /name|phone/i.test(lines[0] ?? "") ? 1 : 0
  const rows: UploadedRecipient[] = []

  for (const line of lines.slice(start)) {
    const [rawName, rawPhone] = line.split(",").map((part) => part.trim())
    if (!rawName || !rawPhone) {
      continue
    }
    const phoneE164 = parseNigerianPhone(rawPhone)
    if (!phoneE164) {
      continue
    }
    rows.push({ name: rawName, phoneE164 })
  }

  return rows
}

export function personalizePreview(
  text: string,
  includeFirstName: boolean,
  sampleName = "Ada Okafor",
): string {
  const trimmed = text.trim()
  if (!includeFirstName || trimmed.length === 0) {
    return trimmed
  }
  const first = sampleName.trim().split(/\s+/)[0] ?? "Ada"
  const rest = trimmed.charAt(0).toLowerCase() + trimmed.slice(1)
  return `${first}, ${rest}`
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.round(totalSeconds % 60)
  if (minutes === 0) {
    return `${seconds}s`
  }
  return `${minutes}m ${seconds}s`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  return `${Math.round(bytes / 1024)} KB`
}

export function reviewCopy(
  draft: WizardDraft,
  recipientCount: number,
  clonedVoices: Array<{ id: string; name: string }> = [],
) {
  const scheduledAt =
    draft.scheduleMode === "later" && draft.scheduledDate && draft.scheduledTime
      ? parse(`${draft.scheduledDate} ${draft.scheduledTime}`, "yyyy-MM-dd HH:mm", new Date())
      : null

  return {
    campaign: draft.name.trim(),
    audience: `${recipientCount.toLocaleString()} recipient${recipientCount === 1 ? "" : "s"}`,
    voice: draft.messageKind === "RECORDING" ? "Recorded message" : "Text to speech",
    voiceMeta:
      draft.messageKind === "RECORDING"
        ? draft.recording
          ? formatDuration(draft.recording.durationSeconds)
          : "No recording uploaded"
        : voiceLabel(draft.voice, clonedVoices),
    rules: `${draft.maxAttempts} attempt${draft.maxAttempts === 1 ? "" : "s"}`,
    retry: `${draft.retryDelayMinutes} minute retry delay`,
    hours: formatCompactHours(
      draft.callingHoursStartMinutes,
      draft.callingHoursEndMinutes,
    ),
    scheduleDate: scheduledAt
      ? format(scheduledAt, "d MMMM yyyy")
      : "Start immediately",
    scheduleTime: scheduledAt ? format(scheduledAt, "h:mm a") : "",
    timezone: draft.timezone,
  }
}

export function readinessChecks(
  draft: WizardDraft,
  options: {
    recipientCount: number
    phonesValid: boolean
    twilioConnected: boolean
  },
): ReadinessCheck[] {
  return [
    {
      id: "audience",
      label: "Audience validated",
      ok: options.recipientCount > 0,
    },
    {
      id: "phones",
      label: "Phone numbers validated",
      ok: options.phonesValid && options.recipientCount > 0,
    },
    {
      id: "voice",
      label: "Voice message ready",
      ok: canProceedFromStep("message", draft),
    },
    {
      id: "rules",
      label: "Calling rules configured",
      ok: canProceedFromStep("rules", draft),
    },
    {
      id: "schedule",
      label: "Schedule configured",
      ok: canProceedFromStep("schedule", draft),
    },
    {
      id: "twilio",
      label: "Twilio connection available",
      ok: options.twilioConnected,
    },
  ]
}

export function launchStatus(draft: WizardDraft): "QUEUED" | "SCHEDULED" {
  return draft.scheduleMode === "later" ? "SCHEDULED" : "QUEUED"
}

export function canSelectReachedStep(
  targetIndex: number,
  highestReachedIndex: number,
): boolean {
  return (
    Number.isInteger(targetIndex) &&
    targetIndex >= 0 &&
    targetIndex <= highestReachedIndex
  )
}

const uploadedRecipientSchema = z.object({
  name: z.string().trim().min(1),
  phoneE164: z.string(),
})

const recordingSchema = z.object({
  fileName: z.string(),
  durationSeconds: z.number(),
  sizeBytes: z.number(),
  dataUrl: z.string().optional(),
})

const wizardDraftSchema = z.object({
  templateId: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  type: z.union([z.enum(campaignTypes), z.literal("")]),
  audienceGuidance: z.string().optional(),
  selectedGroupIds: z.array(z.string()).optional(),
  selectedContactIds: z.array(z.string()).optional(),
  uploadedRecipients: z.array(uploadedRecipientSchema).optional(),
  messageKind: z.union([z.literal("TTS"), z.literal("RECORDING")]).optional(),
  ttsText: z.string().optional(),
  voice: z.string().optional(),
  language: z.string().optional(),
  includeRecipientName: z.boolean().optional(),
  libraryMessageId: z.string().optional(),
  recording: z.union([recordingSchema, z.null()]).optional(),
  maxAttempts: z.number().optional(),
  retryDelayMinutes: z.number().optional(),
  callingHoursStartMinutes: z.number().optional(),
  callingHoursEndMinutes: z.number().optional(),
  timezone: z.string().optional(),
  pacingSeconds: z.number().optional(),
  scheduleMode: z.union([z.literal("immediate"), z.literal("later")]).optional(),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
})

export function parseWizardDraft(input: unknown): WizardDraft {
  let parsed: z.infer<typeof wizardDraftSchema>
  try {
    parsed = wizardDraftSchema.parse(input)
  } catch {
    throw new Error("Campaign details are invalid")
  }
  const uploadedRecipients = (parsed.uploadedRecipients ?? []).map((row) => {
    const phoneE164 = parseNigerianPhone(row.phoneE164)
    if (!phoneE164) {
      throw new Error("Uploaded recipients must use valid Nigerian mobile numbers")
    }
    return { name: row.name, phoneE164 }
  })

  return {
    ...defaultWizardDraft(),
    ...parsed,
    uploadedRecipients,
    selectedGroupIds: parsed.selectedGroupIds ?? [],
    selectedContactIds: parsed.selectedContactIds ?? [],
    libraryMessageId: parsed.libraryMessageId ?? "",
  }
}

function formatClock(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const period = hours >= 12 ? "PM" : "AM"
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`
}
