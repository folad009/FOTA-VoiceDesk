import { getTwilioAuthToken } from "@/lib/twilio/client"
import {
  formDataToParams,
  handleCallStatus,
  handleGather,
  handleRecording,
  handleVoice,
  reconstructTwilioRequestUrl,
  TwilioWebhookError,
  validateTwilioSignature,
  type TwilioWebhookKind,
} from "@/lib/twilio/webhooks"

export async function dispatchTwilioWebhook(
  request: Request,
  kind: TwilioWebhookKind,
): Promise<Response> {
  let params: Record<string, string> = {}
  try {
    const formData = await request.formData()
    params = formDataToParams(formData)
  } catch (error) {
    console.error("[twilio.http] failed to parse body", error)
    return jsonError("Invalid Twilio payload", 400)
  }

  const url = reconstructTwilioRequestUrl({
    requestUrl: request.url,
    webhookBaseUrl: process.env.TWILIO_WEBHOOK_BASE_URL,
    forwardedProto: request.headers.get("x-forwarded-proto"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    host: request.headers.get("host"),
  })
  // Twilio signs: full URL (including query string) + POST body fields only.
  // Do not copy query params into `params` before validation.
  const signature = request.headers.get("x-twilio-signature") ?? ""
  const valid = validateTwilioSignature({
    authToken: getTwilioAuthToken(),
    url,
    params,
    signature,
  })
  if (!valid) {
    console.warn("[twilio.http] invalid signature", { kind, url })
    return jsonError("Invalid Twilio signature", 403)
  }

  const attemptFromQuery = new URL(request.url).searchParams.get("attempt")
  if (attemptFromQuery && !params.attempt) {
    params.attempt = attemptFromQuery
  }

  try {
    if (kind === "voice") {
      return twiml(await handleVoice(params))
    }
    if (kind === "gather") {
      return twiml(await handleGather(params))
    }
    if (kind === "recording") {
      await handleRecording(params)
      return new Response("OK", { status: 200 })
    }
    await handleCallStatus(params)
    return new Response("OK", { status: 200 })
  } catch (error) {
    if (error instanceof TwilioWebhookError) {
      return jsonError(error.message, error.status)
    }
    console.error("[twilio.http] handler failed", { kind, error })
    return jsonError("Twilio webhook failed", 500)
  }
}

function twiml(xml: string): Response {
  return new Response(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  })
}

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status })
}
