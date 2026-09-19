import { createHmac, timingSafeEqual } from "node:crypto"

import { Prisma } from "@prisma/client"

import type { CallStatus } from "@/domain/status"
import { prisma } from "@/server/db/prisma"
import { campaignStatusWhenQueueEmpty } from "@/server/calling/eligibility"
import { spokenCampaignBody, spokenScriptForContact } from "@/server/voice/script"
import { playbackMediaUrl } from "@/server/voice/clone"
import {
  generateHangupTwiML,
  generateRecordedAudioTwiML,
  generateVoiceTwiML,
  resolveTwilioVoice,
} from "./twiml"
import type { TwilioStatusApplication, TwilioWebhookParams } from "./types"

const TWILIO_STATUS_MAP: Record<string, CallStatus> = {
  queued: "QUEUED",
  initiated: "CALLING",
  ringing: "RINGING",
  "in-progress": "ANSWERED",
  completed: "COMPLETED",
  busy: "BUSY",
  "no-answer": "NO_ANSWER",
  failed: "FAILED",
  canceled: "CANCELLED",
}

const TERMINAL: CallStatus[] = [
  "COMPLETED",
  "NO_ANSWER",
  "BUSY",
  "FAILED",
  "CANCELLED",
]

const RETRYABLE: CallStatus[] = ["NO_ANSWER", "BUSY", "FAILED"]

const RANK: Record<CallStatus, number> = {
  PENDING: 0,
  QUEUED: 1,
  CALLING: 2,
  RINGING: 3,
  ANSWERED: 4,
  RETRYING: 1,
  NO_ANSWER: 10,
  BUSY: 10,
  FAILED: 10,
  CANCELLED: 10,
  COMPLETED: 11,
}

export function mapTwilioCallStatus(status: string): CallStatus | null {
  return TWILIO_STATUS_MAP[status.trim().toLowerCase()] ?? null
}

export function applyTwilioCallStatus(input: {
  currentAttemptStatus: CallStatus
  currentDurationSeconds?: number | null
  twilioStatus: string
  durationSeconds: number | null
  attemptCount: number
  maxAttempts: number
  retryDelayMinutes: number
  now: Date
  answeredBy?: string
  hangupOnMachine?: boolean
}): TwilioStatusApplication & { ignore: boolean } {
  let mapped = mapTwilioCallStatus(input.twilioStatus)
  if (
    mapped === "COMPLETED" &&
    input.hangupOnMachine &&
    (input.answeredBy ?? "").toLowerCase().includes("machine")
  ) {
    mapped = "NO_ANSWER"
  }
  if (!mapped) {
    return ignored(input.currentAttemptStatus, input.currentDurationSeconds ?? null)
  }

  if (TERMINAL.includes(input.currentAttemptStatus)) {
    return ignored(input.currentAttemptStatus, input.currentDurationSeconds ?? null)
  }

  const goingBackward =
    RANK[mapped] < RANK[input.currentAttemptStatus] && !TERMINAL.includes(mapped)
  if (goingBackward) {
    return ignored(input.currentAttemptStatus, input.currentDurationSeconds ?? null)
  }

  const durationSeconds = resolveDuration(
    input.currentDurationSeconds ?? null,
    input.durationSeconds,
  )
  const terminal = TERMINAL.includes(mapped)
  const shouldRetry =
    terminal && RETRYABLE.includes(mapped) && input.attemptCount < input.maxAttempts

  return {
    ignore: false,
    attemptStatus: mapped,
    recipientStatus: shouldRetry ? "RETRYING" : mapped,
    nextAttemptAt: shouldRetry
      ? new Date(input.now.getTime() + input.retryDelayMinutes * 60_000)
      : null,
    durationSeconds,
    completedAt: terminal ? input.now : null,
  }
}

export function twilioWebhookEventId(
  kind: "voice" | "status" | "gather" | "recording",
  params: TwilioWebhookParams,
): string {
  const sid = params.CallSid || params.RecordingSid || "unknown"
  const status = params.CallStatus || params.RecordingStatus || params.Digits || "event"
  const sequence = params.SequenceNumber || params.Timestamp || params.RecordingUrl || "0"
  return `${kind}:${sid}:${status}:${sequence}`
}

export function validateTwilioSignature(input: {
  authToken: string
  url: string
  params: TwilioWebhookParams
  signature: string
}): boolean {
  if (!input.authToken || !input.signature) {
    return false
  }
  const data =
    input.url +
    Object.keys(input.params)
      .sort()
      .map((key) => `${key}${input.params[key] ?? ""}`)
      .join("")
  const expected = createHmac("sha1", input.authToken)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64")
  const left = Buffer.from(expected)
  const right = Buffer.from(input.signature)
  if (left.length !== right.length) {
    return false
  }
  return timingSafeEqual(left, right)
}

export function parseTwilioDuration(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") {
    return null
  }
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }
  return Math.round(parsed)
}

export function formDataToParams(formData: FormData): TwilioWebhookParams {
  const params: TwilioWebhookParams = {}
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      params[key] = value
    }
  }
  return params
}

function resolveDuration(current: number | null, incoming: number | null): number | null {
  if (incoming === null) {
    return current
  }
  if (incoming === 0 && current !== null && current > 0) {
    return current
  }
  return incoming
}

function ignored(
  status: CallStatus,
  durationSeconds: number | null,
): TwilioStatusApplication & { ignore: boolean } {
  return {
    ignore: true,
    attemptStatus: status,
    recipientStatus: status,
    nextAttemptAt: null,
    durationSeconds,
    completedAt: null,
  }
}

export type TwilioWebhookKind = "voice" | "status" | "gather" | "recording"

export class TwilioWebhookError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = "TwilioWebhookError"
  }
}

export function reconstructTwilioRequestUrl(input: {
  requestUrl: string
  webhookBaseUrl?: string
  forwardedProto?: string | null
  forwardedHost?: string | null
  host?: string | null
}): string {
  const current = new URL(input.requestUrl)
  const configured = input.webhookBaseUrl?.trim().replace(/\/$/, "")
  if (configured) {
    return `${configured}${current.pathname}${current.search}`
  }
  const proto = (input.forwardedProto ?? current.protocol.replace(":", "")).replace(/:$/, "")
  const host = input.forwardedHost ?? input.host ?? current.host
  return `${proto}://${host}${current.pathname}${current.search}`
}

export function getTwilioWebhookBaseUrl(): string {
  return (
    process.env.TWILIO_WEBHOOK_BASE_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    "http://localhost:3000"
  ).replace(/\/$/, "")
}

export function absoluteMediaUrl(mediaUrl: string): string {
  if (/^https?:\/\//i.test(mediaUrl)) {
    return mediaUrl
  }
  const path = mediaUrl.startsWith("/") ? mediaUrl : `/${mediaUrl}`
  return `${getTwilioWebhookBaseUrl()}${path}`
}

export async function handleCallStatus(params: TwilioWebhookParams): Promise<{
  duplicate: boolean
  ignored: boolean
}> {
  const recorded = await recordWebhookEvent("status", params)
  if (recorded.skipApply) {
    return { duplicate: true, ignored: true }
  }

  const callSid = params.CallSid?.trim()
  if (!callSid) {
    await markWebhook(recorded.id, "FAILED")
    throw new TwilioWebhookError("CallSid is required", 400)
  }

  try {
    const ignoredUpdate = await applyStatusToAttempt(params, callSid)
    await markWebhook(recorded.id, "PROCESSED")
    return { duplicate: false, ignored: ignoredUpdate }
  } catch (error) {
    await markWebhook(recorded.id, "FAILED")
    throw error
  }
}

export async function handleGather(params: TwilioWebhookParams): Promise<string> {
  const recorded = await recordWebhookEvent("gather", params)
  try {
    const digits = params.Digits?.trim() ?? ""
    const xml =
      digits === "1" ? await voiceTwimlForCall(params) : generateHangupTwiML()
    if (!recorded.skipApply) {
      await markWebhook(recorded.id, "PROCESSED")
    }
    return xml
  } catch (error) {
    if (!recorded.skipApply) {
      await markWebhook(recorded.id, "FAILED")
    }
    throw error
  }
}

export async function handleRecording(params: TwilioWebhookParams): Promise<{
  duplicate: boolean
  ignored: boolean
}> {
  const recorded = await recordWebhookEvent("recording", params)
  if (recorded.skipApply) {
    return { duplicate: true, ignored: true }
  }

  const callSid = params.CallSid?.trim()
  if (!callSid) {
    await markWebhook(recorded.id, "FAILED")
    throw new TwilioWebhookError("CallSid is required", 400)
  }

  try {
    const attempt = await findAttemptForWebhook(params, callSid)
    if (!attempt) {
      console.warn("[twilio.recording] unknown CallSid", callSid)
      throw new TwilioWebhookError("Call is not ready yet", 503)
    }

    const incoming = parseTwilioDuration(params.RecordingDuration)
    const durationSeconds = resolveDuration(attempt.durationSeconds, incoming)
    if (durationSeconds !== attempt.durationSeconds) {
      await prisma.callAttempt.update({
        where: { id: attempt.id },
        data: { durationSeconds },
      })
    }
    await markWebhook(recorded.id, "PROCESSED")
    return { duplicate: false, ignored: false }
  } catch (error) {
    await markWebhook(recorded.id, "FAILED")
    throw error
  }
}

export async function handleVoice(params: TwilioWebhookParams): Promise<string> {
  const recorded = await recordWebhookEvent("voice", params)
  try {
    if (params.AnsweredBy?.toLowerCase().includes("machine")) {
      const attempt = await findAttemptForWebhook(params, params.CallSid)
      if (attempt?.campaignRecipient.campaign.voicemailBehavior === "HANGUP_ON_MACHINE") {
        if (!recorded.skipApply) {
          await markWebhook(recorded.id, "PROCESSED")
        }
        return generateHangupTwiML()
      }
    }
    const xml = await voiceTwimlForCall(params)
    if (!recorded.skipApply) {
      await markWebhook(recorded.id, "PROCESSED")
    }
    return xml
  } catch (error) {
    if (error instanceof TwilioWebhookError) {
      if (!recorded.skipApply && error.status !== 503) {
        await markWebhook(recorded.id, "FAILED")
      }
      throw error
    }
    if (!recorded.skipApply) {
      await markWebhook(recorded.id, "FAILED")
    }
    console.error("[twilio.voice] failed to build TwiML", error)
    return generateHangupTwiML()
  }
}

async function applyStatusToAttempt(
  params: TwilioWebhookParams,
  callSid: string,
): Promise<boolean> {
  const attempt = await findAttemptForWebhook(params, callSid)

  if (!attempt) {
    console.warn("[twilio.status] unknown CallSid", callSid)
    throw new TwilioWebhookError("Call is not ready yet", 503)
  }

  const campaign = attempt.campaignRecipient.campaign
  const recipientStatus = attempt.campaignRecipient.status
  const application = applyTwilioCallStatus({
    currentAttemptStatus: attempt.status,
    currentDurationSeconds: attempt.durationSeconds,
    twilioStatus: params.CallStatus ?? "",
    durationSeconds: parseTwilioDuration(params.CallDuration),
    attemptCount: attempt.campaignRecipient.attemptCount,
    maxAttempts: campaign.maxAttempts,
    retryDelayMinutes: campaign.retryDelayMinutes,
    now: new Date(),
    answeredBy: params.AnsweredBy,
    hangupOnMachine: campaign.voicemailBehavior === "HANGUP_ON_MACHINE",
  })

  if (application.ignore) {
    return true
  }

  const failureReason =
    application.attemptStatus === "FAILED"
      ? params.ErrorMessage || params.ErrorCode || "Twilio call failed"
      : undefined

  await prisma.$transaction(async (tx) => {
    await tx.callAttempt.update({
      where: { id: attempt.id },
      data: {
        status: application.attemptStatus,
        durationSeconds: application.durationSeconds,
        completedAt: application.completedAt ?? undefined,
        failureReason,
      },
    })
    if (recipientStatus !== "CANCELLED") {
      await tx.campaignRecipient.update({
        where: { id: attempt.campaignRecipientId },
        data: {
          status: application.recipientStatus,
          nextAttemptAt: application.nextAttemptAt,
        },
      })
    }
    if (
      campaign.status === "QUEUED" &&
      (application.recipientStatus === "CALLING" ||
        application.recipientStatus === "RINGING" ||
        application.recipientStatus === "ANSWERED")
    ) {
      await tx.campaign.update({
        where: { id: campaign.id },
        data: { status: "RUNNING" },
      })
    }
  })

  await maybeCompleteCampaign(campaign.id)
  return false
}

async function voiceTwimlForCall(params: TwilioWebhookParams): Promise<string> {
  const attempt = await findAttemptForWebhook(params, params.CallSid)
  if (!attempt) {
    console.warn("[twilio.voice] unknown CallSid", params.CallSid)
    throw new TwilioWebhookError("Call is not ready yet", 503)
  }

  const campaign = attempt.campaignRecipient.campaign
  if (campaign.status === "CANCELLED") {
    return generateHangupTwiML()
  }

  const message = campaign.voiceMessage
  const contactName = attempt.campaignRecipient.contact.name
  const voice = resolveTwilioVoice(message?.voice ?? "en-NG-female", message?.language ?? "en-NG")
  const gatherActionUrl =
    process.env.TWILIO_ENABLE_GATHER === "true"
      ? `${getTwilioWebhookBaseUrl()}/api/twilio/gather?attempt=${attempt.id}`
      : undefined

  const playUrl = playbackMediaUrl({
    kind: message?.kind ?? "TTS",
    voiceProfileId: message?.voiceProfileId ?? null,
    generatedMediaUrl: attempt.generatedMediaUrl ?? null,
    messageMediaUrl: message?.mediaUrl ?? null,
  })
  if (playUrl) {
    const introSource = message?.kind === "RECORDING" ? message.introText?.trim() : undefined
    const introText = introSource
      ? spokenScriptForContact(introSource, contactName, message?.includeRecipientName ?? false)
      : message?.kind === "RECORDING" && message.includeRecipientName
        ? `Hello ${firstName(contactName)}.`
        : undefined
    return generateRecordedAudioTwiML({
      mediaUrl: absoluteMediaUrl(playUrl),
      introText,
      voice: voice.voice,
      language: voice.language,
      gatherActionUrl,
    })
  }

  const body = spokenCampaignBody(message?.ttsText)
  if (!body) {
    return generateHangupTwiML()
  }

  const text = spokenScriptForContact(
    body,
    contactName,
    message?.includeRecipientName ?? false,
  )

  return generateVoiceTwiML({
    text,
    voice: voice.voice,
    language: voice.language,
    gatherActionUrl,
  })
}

async function findAttemptForWebhook(params: TwilioWebhookParams, callSid: string | undefined) {
  const sid = callSid?.trim()
  if (sid) {
    const bySid = await findAttemptByCallSid(sid)
    if (bySid) {
      return bySid
    }
  }

  const attemptId = params.attempt?.trim()
  if (!attemptId) {
    return null
  }

  const byId = await prisma.callAttempt.findUnique({
    where: { id: attemptId },
    include: {
      campaignRecipient: {
        include: {
          contact: { select: { name: true } },
          campaign: {
            include: { voiceMessage: true },
          },
        },
      },
    },
  })
  if (!byId) {
    return null
  }

  if (sid && !byId.twilioCallSid) {
    await prisma.callAttempt.update({
      where: { id: byId.id },
      data: { twilioCallSid: sid },
    })
  }

  return byId
}

async function findAttemptByCallSid(callSid: string | undefined) {
  if (!callSid?.trim()) {
    return null
  }
  return prisma.callAttempt.findUnique({
    where: { twilioCallSid: callSid.trim() },
    include: {
      campaignRecipient: {
        include: {
          contact: { select: { name: true } },
          campaign: {
            include: { voiceMessage: true },
          },
        },
      },
    },
  })
}

async function maybeCompleteCampaign(campaignId: string): Promise<void> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, status: true, autoCompleteOnFinish: true },
  })
  if (!campaign?.autoCompleteOnFinish) {
    return
  }
  if (campaign.status !== "RUNNING" && campaign.status !== "QUEUED") {
    return
  }

  const openCount = await prisma.campaignRecipient.count({
    where: {
      campaignId,
      status: {
        in: ["PENDING", "QUEUED", "CALLING", "RINGING", "ANSWERED", "RETRYING"],
      },
    },
  })
  if (openCount > 0) {
    return
  }

  const [total, failed] = await Promise.all([
    prisma.campaignRecipient.count({ where: { campaignId } }),
    prisma.campaignRecipient.count({ where: { campaignId, status: "FAILED" } }),
  ])
  const statuses: CallStatus[] =
    total === 0 ? [] : failed === total ? Array.from({ length: total }, () => "FAILED") : ["COMPLETED"]

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: campaignStatusWhenQueueEmpty(statuses) },
  })
}

async function recordWebhookEvent(
  kind: TwilioWebhookKind,
  params: TwilioWebhookParams,
): Promise<{ id: string; skipApply: boolean }> {
  const externalEventId = twilioWebhookEventId(kind, params)
  const relatedCallSid = params.CallSid?.trim() || params.RecordingSid?.trim() || null

  console.info("[twilio.webhook]", {
    kind,
    callSid: relatedCallSid,
    callStatus: params.CallStatus ?? params.RecordingStatus ?? null,
    eventId: externalEventId,
  })

  try {
    const created = await prisma.webhookEvent.create({
      data: {
        provider: "TWILIO",
        externalEventId,
        payload: params,
        relatedCallSid,
        processingStatus: "RECEIVED",
      },
      select: { id: true },
    })
    return { id: created.id, skipApply: false }
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error
    }
    const existing = await prisma.webhookEvent.findUnique({
      where: {
        provider_externalEventId: {
          provider: "TWILIO",
          externalEventId,
        },
      },
      select: { id: true, processingStatus: true },
    })
    if (!existing) {
      throw error
    }
    if (existing.processingStatus === "FAILED" || existing.processingStatus === "RECEIVED") {
      return { id: existing.id, skipApply: false }
    }
    console.info("[twilio.webhook] duplicate ignored", { kind, eventId: externalEventId })
    return { id: existing.id, skipApply: true }
  }
}

async function markWebhook(
  id: string,
  processingStatus: "PROCESSED" | "IGNORED_DUPLICATE" | "FAILED",
): Promise<void> {
  await prisma.webhookEvent.update({
    where: { id },
    data: {
      processingStatus,
      processedAt: new Date(),
    },
  })
}

function firstName(name: string): string {
  const token = name.trim().split(/\s+/)[0]
  return token || "friend"
}
