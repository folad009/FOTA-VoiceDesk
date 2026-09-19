import { APP_LOCALE, APP_TIMEZONE } from "@/config/locale"
import { fotaEvents, type FotaEvent } from "@/config/fota-events"
import type { CampaignType } from "@/server/campaigns/wizard-draft"

export type CampaignTemplate = {
  id: string
  campaignType: CampaignType
  name: string
  objective: string
  audienceGuidance: string
  script: string
  includeRecipientName: boolean
  voice: string
  language: string
  event?: FotaEvent
  maxAttempts: number
  retryDelayMinutes: number
  callingHoursStartMinutes: number
  callingHoursEndMinutes: number
  timezone: string
  pacingSeconds: number
  scheduleMode: "immediate" | "later"
  scheduledDate: string
  scheduledTime: string
  scheduleGuidance: string
}

export type TemplateDraftSlice = {
  templateId: string
  name: string
  description: string
  type: CampaignType | ""
  ttsText: string
  timezone: string
  language: string
  includeRecipientName: boolean
  voice: string
  audienceGuidance: string
  maxAttempts: number
  retryDelayMinutes: number
  callingHoursStartMinutes: number
  callingHoursEndMinutes: number
  pacingSeconds: number
  scheduleMode: "immediate" | "later"
  scheduledDate: string
  scheduledTime: string
}

const TYPE_DEFAULTS = {
  includeRecipientName: true,
  voice: "en-NG-female",
  language: APP_LOCALE,
  maxAttempts: 2,
  retryDelayMinutes: 30,
  callingHoursStartMinutes: 480,
  callingHoursEndMinutes: 1140,
  timezone: APP_TIMEZONE,
  pacingSeconds: 2,
  scheduleMode: "immediate" as const,
  scheduledDate: "",
  scheduledTime: "",
  scheduleGuidance: "Start within Africa/Lagos calling hours, then retry unanswered calls.",
}

function typeTemplate(
  input: Pick<CampaignTemplate, "id" | "campaignType" | "name" | "objective" | "audienceGuidance" | "script"> &
    Partial<CampaignTemplate>,
): CampaignTemplate {
  return {
    ...TYPE_DEFAULTS,
    includeRecipientName: input.includeRecipientName ?? TYPE_DEFAULTS.includeRecipientName,
    ...input,
  }
}

export const campaignTemplates: CampaignTemplate[] = [
  typeTemplate({
    id: "sunday-service-reminder",
    campaignType: "SUNDAY_SERVICE_REMINDER",
    name: "Sunday Service Reminder",
    objective: "Remind recipients that weekly Sunday service holds as scheduled.",
    audienceGuidance: "Congregation members who should be reminded about Sunday service.",
    script:
      "Good day. This is a reminder that Sunday service holds this week. Please plan to attend. We look forward to seeing you.",
  }),
  typeTemplate({
    id: "church-programme-reminder",
    campaignType: "CHURCH_PROGRAMME_REMINDER",
    name: "Church Programme Reminder",
    objective: "Remind recipients about an upcoming church programme.",
    audienceGuidance: "People invited to the programme. Prefer a dedicated group over the full directory.",
    script:
      "Good day. This is a reminder about the upcoming church programme. Please keep the date and time you were given and plan to attend.",
  }),
  typeTemplate({
    id: "conference-reminder",
    campaignType: "CONFERENCE_REMINDER",
    name: "Conference Reminder",
    objective: "Remind registered delegates about an upcoming conference.",
    audienceGuidance: "Registered delegates only. Upload the registration list or select the delegates group.",
    script:
      "Good day. This is a reminder about the upcoming conference. Please arrive early and keep your registration details handy.",
  }),
  typeTemplate({
    id: "birthday-greeting",
    campaignType: "BIRTHDAY_GREETING",
    name: "Birthday Greeting",
    objective: "Deliver a short birthday greeting.",
    audienceGuidance: "Recipients with a birthday in the calling window.",
    script:
      "Happy birthday. We celebrate you today and pray you enjoy a year of peace, health, and joy.",
  }),
  typeTemplate({
    id: "pastoral-announcement",
    campaignType: "PASTORAL_MESSAGE",
    name: "Pastoral Announcement",
    objective: "Deliver a leadership announcement to the congregation.",
    audienceGuidance: "Households that should hear the announcement in full.",
    includeRecipientName: false,
    script:
      "Good day. This is a pastoral announcement. Please listen to this message in full and share it with your household if asked.",
  }),
  typeTemplate({
    id: "workers-meeting-reminder",
    campaignType: "WORKERS_MEETING_REMINDER",
    name: "Workers' Meeting Reminder",
    objective: "Remind department workers about a scheduled meeting.",
    audienceGuidance: "Workers and department members expected at the meeting.",
    script:
      "Good day. This is a reminder that the workers' meeting holds as scheduled. Please make every effort to attend.",
  }),
  typeTemplate({
    id: "cell-fellowship-reminder",
    campaignType: "CELL_FELLOWSHIP_REMINDER",
    name: "Cell Fellowship Reminder",
    objective: "Remind cell members that fellowship holds as scheduled.",
    audienceGuidance: "Cell or home-fellowship members.",
    script:
      "Good day. This is a reminder that cell fellowship holds as scheduled. Please join your group.",
  }),
  typeTemplate({
    id: "emergency-announcement",
    campaignType: "EMERGENCY_ANNOUNCEMENT",
    name: "Emergency Announcement",
    objective: "Reach households quickly with a time-sensitive announcement.",
    audienceGuidance: "Everyone who must receive the announcement. Keep the list as tight as the situation allows.",
    includeRecipientName: false,
    maxAttempts: 3,
    retryDelayMinutes: 15,
    script:
      "This is an urgent announcement. Please listen carefully to this message and share it with your household if asked.",
  }),
  {
    id: "gkc-2026-conference-reminder",
    campaignType: "CONFERENCE_REMINDER",
    name: "GKC 2026 — Conference Reminder",
    event: fotaEvents.gkc2026,
    objective:
      "Remind registered delegates to attend Giant Killer Conference 2026, holding 12–18 October 2026 at FOTA Surulere, Lagos.",
    audienceGuidance:
      "Registered GKC 2026 delegates and invited guests. Select the delegates group or upload the registration list. Do not include the general congregation unless they are registered.",
    script:
      "Good day. This is a reminder about {{eventTitle}}, holding {{eventDates}} at {{eventLocation}}. Please plan to attend and arrive early. We look forward to seeing you.",
    includeRecipientName: true,
    voice: "en-NG-female",
    language: APP_LOCALE,
    maxAttempts: 3,
    retryDelayMinutes: 30,
    callingHoursStartMinutes: 480,
    callingHoursEndMinutes: 1140,
    timezone: APP_TIMEZONE,
    pacingSeconds: 2,
    scheduleMode: "later",
    scheduledDate: "2026-10-11",
    scheduledTime: "18:00",
    scheduleGuidance:
      "Queue the reminder before the conference opens on 12 October 2026. Calls run in Africa/Lagos calling hours.",
  },
]

const templatesById = new Map(campaignTemplates.map((template) => [template.id, template]))

export const eventTemplates = campaignTemplates.filter((template) => template.event)

export function getNamedTemplate(id: string): CampaignTemplate | undefined {
  const trimmed = id.trim()
  if (!trimmed) {
    return undefined
  }
  return templatesById.get(trimmed)
}

export function getCampaignTemplate(type: CampaignType | ""): CampaignTemplate | undefined {
  if (!type) {
    return undefined
  }
  return campaignTemplates.find((template) => template.campaignType === type && !template.event)
}

export function renderTemplateScript(template: CampaignTemplate): string {
  const event = template.event
  return template.script
    .replaceAll("{{eventTitle}}", event?.title ?? "")
    .replaceAll("{{eventDates}}", event?.datesLabel ?? "")
    .replaceAll("{{eventLocation}}", event?.location ?? "")
}

export function applyCampaignTemplate(
  current: TemplateDraftSlice,
  type: CampaignType,
): Partial<TemplateDraftSlice> {
  const next = getCampaignTemplate(type)
  return applyTemplate(current, next, type)
}

export function applyNamedTemplate(
  current: TemplateDraftSlice,
  templateId: string,
): Partial<TemplateDraftSlice> {
  const next = getNamedTemplate(templateId)
  return applyTemplate(current, next, next?.campaignType ?? current.type)
}

function applyTemplate(
  current: TemplateDraftSlice,
  next: CampaignTemplate | undefined,
  type: CampaignType | "",
): Partial<TemplateDraftSlice> {
  const previous = current.templateId
    ? getNamedTemplate(current.templateId)
    : getCampaignTemplate(current.type)
  const previousScript = previous ? renderTemplateScript(previous) : ""
  const ttsIsStock =
    current.ttsText.trim().length === 0 || current.ttsText.trim() === previousScript
  const nameIsStock =
    current.name.trim().length === 0 || (previous !== undefined && current.name.trim() === previous.name)
  const descriptionIsStock =
    current.description.trim().length === 0 ||
    (previous !== undefined && current.description.trim() === previous.objective)

  return {
    templateId: next?.id ?? "",
    type,
    timezone: next?.timezone ?? APP_TIMEZONE,
    language: next?.language ?? APP_LOCALE,
    voice: next?.voice ?? current.voice,
    name: nameIsStock ? (next?.name ?? current.name) : current.name,
    description: descriptionIsStock ? (next?.objective ?? current.description) : current.description,
    audienceGuidance: next?.audienceGuidance ?? "",
    ttsText: ttsIsStock ? (next ? renderTemplateScript(next) : "") : current.ttsText,
    includeRecipientName: next ? next.includeRecipientName : current.includeRecipientName,
    maxAttempts: next?.maxAttempts ?? current.maxAttempts,
    retryDelayMinutes: next?.retryDelayMinutes ?? current.retryDelayMinutes,
    callingHoursStartMinutes: next?.callingHoursStartMinutes ?? current.callingHoursStartMinutes,
    callingHoursEndMinutes: next?.callingHoursEndMinutes ?? current.callingHoursEndMinutes,
    pacingSeconds: next?.pacingSeconds ?? current.pacingSeconds,
    scheduleMode: next?.scheduleMode ?? current.scheduleMode,
    scheduledDate: next?.scheduledDate ?? current.scheduledDate,
    scheduledTime: next?.scheduledTime ?? current.scheduledTime,
  }
}

export const wizardCampaignTypes: CampaignType[] = [
  "SUNDAY_SERVICE_REMINDER",
  "CHURCH_PROGRAMME_REMINDER",
  "CONFERENCE_REMINDER",
  "BIRTHDAY_GREETING",
  "PASTORAL_MESSAGE",
  "WORKERS_MEETING_REMINDER",
  "CELL_FELLOWSHIP_REMINDER",
  "EMERGENCY_ANNOUNCEMENT",
  "GENERAL_BROADCAST",
]
