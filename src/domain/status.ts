export const campaignStatuses = [
  "DRAFT",
  "SCHEDULED",
  "QUEUED",
  "RUNNING",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
] as const

export type CampaignStatus = (typeof campaignStatuses)[number]

export const callStatuses = [
  "PENDING",
  "QUEUED",
  "CALLING",
  "RINGING",
  "ANSWERED",
  "COMPLETED",
  "NO_ANSWER",
  "BUSY",
  "FAILED",
  "CANCELLED",
  "RETRYING",
] as const

export type CallStatus = (typeof callStatuses)[number]

export type StatusTone = "success" | "warning" | "info" | "destructive" | "muted"
