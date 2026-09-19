import "server-only"

import { getTwilioProvider } from "./client"
import {
  generateRecordedAudioTwiML,
  generateVoiceTwiML,
  resolveTwilioVoice,
} from "./twiml"
import type { CreateOutboundCallInput, CreateOutboundCallResult } from "./types"

export {
  generateRecordedAudioTwiML,
  generateVoiceTwiML,
  resolveTwilioVoice,
}
export { handleCallStatus, handleGather, handleRecording } from "./webhooks"

export async function createOutboundCall(
  input: CreateOutboundCallInput,
): Promise<CreateOutboundCallResult> {
  return getTwilioProvider().createOutboundCall(input)
}
