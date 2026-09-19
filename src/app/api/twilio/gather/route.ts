import { dispatchTwilioWebhook } from "../dispatch"

export const dynamic = "force-dynamic"

export async function POST(request: Request): Promise<Response> {
  return dispatchTwilioWebhook(request, "gather")
}
