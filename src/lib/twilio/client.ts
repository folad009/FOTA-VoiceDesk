import "server-only"

import { randomBytes } from "node:crypto"

import type {
  CreateOutboundCallInput,
  CreateOutboundCallResult,
  TwilioVoiceProvider,
} from "./types"
import { validateTwilioSignature } from "./webhooks"

export const DEV_TWILIO_AUTH_TOKEN = "voicedesk-dev-twilio"

const MOCK_FROM = "+2348000000000"

export function isLiveTwilioConfigured(): boolean {
  return (
    Boolean(process.env.TWILIO_ACCOUNT_SID?.trim()) &&
    Boolean(process.env.TWILIO_AUTH_TOKEN?.trim()) &&
    Boolean(process.env.TWILIO_PHONE_NUMBER?.trim())
  )
}

export function useMockTwilio(): boolean {
  if (process.env.TWILIO_MOCK === "true") {
    return true
  }
  if (process.env.NODE_ENV === "production") {
    return false
  }
  return !isLiveTwilioConfigured()
}

export function getTwilioFromNumber(): string {
  if (useMockTwilio()) {
    return process.env.TWILIO_PHONE_NUMBER?.trim() || MOCK_FROM
  }
  const from = process.env.TWILIO_PHONE_NUMBER?.trim()
  if (!from) {
    throw new Error("TWILIO_PHONE_NUMBER is not configured")
  }
  return from
}

export function getTwilioAuthToken(): string {
  if (useMockTwilio()) {
    return process.env.TWILIO_AUTH_TOKEN?.trim() || DEV_TWILIO_AUTH_TOKEN
  }
  const token = process.env.TWILIO_AUTH_TOKEN?.trim()
  if (!token) {
    throw new Error("TWILIO_AUTH_TOKEN is not configured")
  }
  return token
}

export function getTwilioProvider(): TwilioVoiceProvider {
  if (useMockTwilio()) {
    return new DevTwilioProvider()
  }
  return new LiveTwilioProvider()
}

export class DevTwilioProvider implements TwilioVoiceProvider {
  readonly kind = "mock" as const

  async createOutboundCall(
    input: CreateOutboundCallInput,
  ): Promise<CreateOutboundCallResult> {
    if (!input.to || !input.url) {
      throw new Error("Mock Twilio call is missing destination or webhook URL")
    }
    return {
      sid: `CAdev${randomBytes(15).toString("hex")}`,
      status: "queued",
      mocked: true,
    }
  }

  validateSignature(input: {
    signature: string
    url: string
    params: Record<string, string>
  }): boolean {
    return validateTwilioSignature({
      authToken: getTwilioAuthToken(),
      url: input.url,
      params: input.params,
      signature: input.signature,
    })
  }
}

export class LiveTwilioProvider implements TwilioVoiceProvider {
  readonly kind = "live" as const

  async createOutboundCall(
    input: CreateOutboundCallInput,
  ): Promise<CreateOutboundCallResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim()
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim()
    if (!accountSid || !authToken) {
      throw new Error("Twilio is not configured")
    }

    const body = new URLSearchParams({
      To: input.to,
      From: input.from,
      Url: input.url,
      Method: "POST",
      StatusCallback: input.statusCallback,
      StatusCallbackMethod: "POST",
    })
    for (const event of input.statusCallbackEvent ?? [
      "initiated",
      "ringing",
      "answered",
      "completed",
    ]) {
      body.append("StatusCallbackEvent", event)
    }
    if (input.timeoutSeconds) {
      body.set("Timeout", String(input.timeoutSeconds))
    }
    if (input.machineDetection) {
      body.set("MachineDetection", "Enable")
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Idempotency-Key": input.idempotencyKey,
        },
        body,
      },
    )

    const payload = (await response.json()) as {
      sid?: string
      status?: string
      message?: string
    }

    if (!response.ok || !payload.sid) {
      throw new Error(payload.message || `Twilio create call failed (${response.status})`)
    }

    return {
      sid: payload.sid,
      status: payload.status ?? "queued",
      mocked: false,
    }
  }

  validateSignature(input: {
    signature: string
    url: string
    params: Record<string, string>
  }): boolean {
    return validateTwilioSignature({
      authToken: getTwilioAuthToken(),
      url: input.url,
      params: input.params,
      signature: input.signature,
    })
  }
}
