import type { CallStatus } from "@/domain/status"

export type CreateOutboundCallInput = {
  to: string
  from: string
  url: string
  statusCallback: string
  statusCallbackEvent?: string[]
  idempotencyKey: string
  timeoutSeconds?: number
  machineDetection?: boolean
}

export type CreateOutboundCallResult = {
  sid: string
  status: string
  mocked: boolean
}

export type TwilioWebhookParams = Record<string, string>

export type TwilioSignatureInput = {
  authToken: string
  url: string
  params: TwilioWebhookParams
  signature: string
}

export interface TwilioVoiceProvider {
  readonly kind: "live" | "mock"
  createOutboundCall(input: CreateOutboundCallInput): Promise<CreateOutboundCallResult>
  validateSignature(input: Omit<TwilioSignatureInput, "authToken">): boolean
}

export type VoiceTwimlInput = {
  text: string
  voice: string
  language: string
  gatherActionUrl?: string
}

export type RecordedAudioTwimlInput = {
  mediaUrl: string
  gatherActionUrl?: string
  introText?: string
  voice?: string
  language?: string
}

export type TwilioStatusApplication = {
  ignore: boolean
  attemptStatus: CallStatus
  recipientStatus: CallStatus
  nextAttemptAt: Date | null
  durationSeconds: number | null
  completedAt: Date | null
}
