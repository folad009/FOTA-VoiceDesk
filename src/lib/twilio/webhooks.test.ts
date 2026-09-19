import { describe, expect, it } from "vitest"

import {
  absoluteMediaUrl,
  applyTwilioCallStatus,
  mapTwilioCallStatus,
  reconstructTwilioRequestUrl,
  twilioWebhookEventId,
  validateTwilioSignature,
} from "./webhooks"

describe("mapTwilioCallStatus", () => {
  it("maps Twilio statuses onto VoiceDesk call statuses", () => {
    expect(mapTwilioCallStatus("queued")).toBe("QUEUED")
    expect(mapTwilioCallStatus("initiated")).toBe("CALLING")
    expect(mapTwilioCallStatus("ringing")).toBe("RINGING")
    expect(mapTwilioCallStatus("in-progress")).toBe("ANSWERED")
    expect(mapTwilioCallStatus("completed")).toBe("COMPLETED")
    expect(mapTwilioCallStatus("busy")).toBe("BUSY")
    expect(mapTwilioCallStatus("no-answer")).toBe("NO_ANSWER")
    expect(mapTwilioCallStatus("failed")).toBe("FAILED")
    expect(mapTwilioCallStatus("canceled")).toBe("CANCELLED")
  })

  it("rejects unknown statuses", () => {
    expect(mapTwilioCallStatus("delivered")).toBeNull()
  })
})

describe("applyTwilioCallStatus", () => {
  const now = new Date("2026-09-16T18:00:00.000Z")

  it("ignores backwards updates after a terminal outcome", () => {
    const result = applyTwilioCallStatus({
      currentAttemptStatus: "COMPLETED",
      twilioStatus: "ringing",
      durationSeconds: 12,
      attemptCount: 1,
      maxAttempts: 2,
      retryDelayMinutes: 30,
      now,
    })
    expect(result.ignore).toBe(true)
  })

  it("ignores queued after the call is already ringing", () => {
    const result = applyTwilioCallStatus({
      currentAttemptStatus: "RINGING",
      twilioStatus: "queued",
      durationSeconds: null,
      attemptCount: 1,
      maxAttempts: 2,
      retryDelayMinutes: 30,
      now,
    })
    expect(result.ignore).toBe(true)
  })

  it("completes an answered call and does not retry", () => {
    const result = applyTwilioCallStatus({
      currentAttemptStatus: "ANSWERED",
      twilioStatus: "completed",
      durationSeconds: 47,
      attemptCount: 1,
      maxAttempts: 2,
      retryDelayMinutes: 30,
      now,
    })
    expect(result.ignore).toBe(false)
    expect(result.attemptStatus).toBe("COMPLETED")
    expect(result.recipientStatus).toBe("COMPLETED")
    expect(result.nextAttemptAt).toBeNull()
    expect(result.durationSeconds).toBe(47)
  })

  it("schedules a retry after no-answer when attempts remain", () => {
    const result = applyTwilioCallStatus({
      currentAttemptStatus: "RINGING",
      twilioStatus: "no-answer",
      durationSeconds: 0,
      attemptCount: 1,
      maxAttempts: 2,
      retryDelayMinutes: 30,
      now,
    })
    expect(result.attemptStatus).toBe("NO_ANSWER")
    expect(result.recipientStatus).toBe("RETRYING")
    expect(result.nextAttemptAt).toEqual(new Date("2026-09-16T18:30:00.000Z"))
  })

  it("marks the recipient failed when retries are exhausted", () => {
    const result = applyTwilioCallStatus({
      currentAttemptStatus: "CALLING",
      twilioStatus: "failed",
      durationSeconds: null,
      attemptCount: 2,
      maxAttempts: 2,
      retryDelayMinutes: 30,
      now,
    })
    expect(result.recipientStatus).toBe("FAILED")
    expect(result.nextAttemptAt).toBeNull()
  })

  it("does not overwrite a real duration with zero", () => {
    const result = applyTwilioCallStatus({
      currentAttemptStatus: "ANSWERED",
      currentDurationSeconds: 40,
      twilioStatus: "completed",
      durationSeconds: 0,
      attemptCount: 1,
      maxAttempts: 1,
      retryDelayMinutes: 30,
      now,
    })
    expect(result.durationSeconds).toBe(40)
  })

  it("treats a machine hang-up as no-answer so the recipient can be retried", () => {
    const result = applyTwilioCallStatus({
      currentAttemptStatus: "ANSWERED",
      twilioStatus: "completed",
      durationSeconds: 2,
      attemptCount: 1,
      maxAttempts: 3,
      retryDelayMinutes: 30,
      now,
      answeredBy: "machine_start",
      hangupOnMachine: true,
    })
    expect(result.ignore).toBe(false)
    expect(result.attemptStatus).toBe("NO_ANSWER")
    expect(result.recipientStatus).toBe("RETRYING")
  })
})

describe("twilioWebhookEventId", () => {
  it("is stable for duplicate Twilio deliveries", () => {
    const params = {
      CallSid: "CA123",
      CallStatus: "completed",
      Timestamp: "2026-09-16T18:00:00Z",
      SequenceNumber: "2",
    }
    expect(twilioWebhookEventId("status", params)).toBe(
      twilioWebhookEventId("status", params),
    )
    expect(twilioWebhookEventId("status", params)).toContain("CA123")
    expect(twilioWebhookEventId("status", { ...params, SequenceNumber: "3" })).not.toBe(
      twilioWebhookEventId("status", params),
    )
  })
})

describe("validateTwilioSignature", () => {
  it("accepts a valid HMAC-SHA1 signature", () => {
    const params = { CallSid: "CA123", CallStatus: "completed" }
    const url = "https://voicedesk.example/api/twilio/status"
    const signature = sign("auth-token", url, params)
    expect(
      validateTwilioSignature({
        authToken: "auth-token",
        url,
        params,
        signature,
      }),
    ).toBe(true)
  })

  it("rejects a tampered signature", () => {
    expect(
      validateTwilioSignature({
        authToken: "auth-token",
        url: "https://voicedesk.example/api/twilio/status",
        params: { CallSid: "CA123" },
        signature: "bogus",
      }),
    ).toBe(false)
  })

  it("keeps query-string attempt in the URL and out of POST params", () => {
    const url =
      "https://fota-voice-desk.vercel.app/api/twilio/status?attempt=cmu8js3ql000cla04k2gqawip"
    const bodyParams = { CallSid: "CA123", CallStatus: "completed" }
    const signature = sign("auth-token", url, bodyParams)
    expect(
      validateTwilioSignature({
        authToken: "auth-token",
        url,
        params: bodyParams,
        signature,
      }),
    ).toBe(true)
    expect(
      validateTwilioSignature({
        authToken: "auth-token",
        url,
        params: { ...bodyParams, attempt: "cmu8js3ql000cla04k2gqawip" },
        signature,
      }),
    ).toBe(false)
  })
})

describe("reconstructTwilioRequestUrl", () => {
  it("prefers the configured public webhook base URL", () => {
    expect(
      reconstructTwilioRequestUrl({
        requestUrl: "http://localhost:3000/api/twilio/status?attempt=1",
        webhookBaseUrl: "https://voicedesk.example",
      }),
    ).toBe("https://voicedesk.example/api/twilio/status?attempt=1")
  })
})

describe("absoluteMediaUrl", () => {
  it("rewrites legacy upload paths through the voice media API", () => {
    const previous = process.env.TWILIO_WEBHOOK_BASE_URL
    process.env.TWILIO_WEBHOOK_BASE_URL = "https://voicedesk.example"
    expect(absoluteMediaUrl("/uploads/voice/sample.mp3")).toBe(
      "https://voicedesk.example/api/voice/media/sample.mp3",
    )
    expect(absoluteMediaUrl("/api/voice/media/sample.mp3")).toBe(
      "https://voicedesk.example/api/voice/media/sample.mp3",
    )
    process.env.TWILIO_WEBHOOK_BASE_URL = previous
  })
})

function sign(authToken: string, url: string, params: Record<string, string>): string {
  const { createHmac } = require("node:crypto") as typeof import("node:crypto")
  const data =
    url +
    Object.keys(params)
      .sort()
      .map((key) => `${key}${params[key]}`)
      .join("")
  return createHmac("sha1", authToken).update(Buffer.from(data, "utf-8")).digest("base64")
}
