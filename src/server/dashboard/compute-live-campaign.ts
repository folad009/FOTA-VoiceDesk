import type { CallStatus, CampaignStatus } from "@/domain/status"

export type LiveCampaignInput = {
  id: string
  name: string
  status: CampaignStatus
  startedAt: Date | null
  recipientStatuses: CallStatus[]
  now: Date
}

export type LiveCampaignCard = {
  id: string
  name: string
  status: CampaignStatus
  total: number
  processed: number
  answered: number
  noAnswer: number
  busy: number
  failed: number
  progressPercent: number
  estimatedCompletion: string
  isLive: boolean
}

export function estimateCompletion({
  status,
  processed,
  total,
  startedAt,
  now,
}: {
  status: CampaignStatus
  processed: number
  total: number
  startedAt: Date | null
  now: Date
}): string {
  if (status === "PAUSED") {
    return "Paused"
  }
  if (status === "QUEUED" && processed === 0) {
    return "Waiting to start"
  }
  if (processed === 0 || startedAt === null) {
    return "Calculating"
  }
  if (processed >= total) {
    return "Wrapping up"
  }

  const elapsedMinutes = (now.getTime() - startedAt.getTime()) / 60_000
  if (elapsedMinutes < 0.5) {
    return "Calculating"
  }

  const remaining = total - processed
  const etaMinutes = remaining / (processed / elapsedMinutes)
  const rounded = Math.round(etaMinutes)

  if (rounded < 1) {
    return "Less than a minute"
  }
  return `About ${rounded} min`
}

export function computeLiveCampaign(input: LiveCampaignInput): LiveCampaignCard {
  const total = input.recipientStatuses.length
  const answered = input.recipientStatuses.filter(
    (status) => status === "COMPLETED" || status === "ANSWERED",
  ).length
  const noAnswer = input.recipientStatuses.filter(
    (status) => status === "NO_ANSWER",
  ).length
  const busy = input.recipientStatuses.filter((status) => status === "BUSY").length
  const failed = input.recipientStatuses.filter(
    (status) => status === "FAILED",
  ).length
  const processed = input.recipientStatuses.filter(
    (status) => status !== "PENDING",
  ).length

  return {
    id: input.id,
    name: input.name,
    status: input.status,
    total,
    processed,
    answered,
    noAnswer,
    busy,
    failed,
    progressPercent: total === 0 ? 0 : Math.round((processed / total) * 100),
    estimatedCompletion: estimateCompletion({
      status: input.status,
      processed,
      total,
      startedAt: input.startedAt,
      now: input.now,
    }),
    isLive: input.status === "RUNNING",
  }
}
