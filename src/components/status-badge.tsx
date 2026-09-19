import { Badge } from "@/components/ui/badge"
import type { CallStatus, CampaignStatus, StatusTone } from "@/domain/status"

const campaignTone: Record<CampaignStatus, StatusTone> = {
  DRAFT: "muted",
  SCHEDULED: "info",
  QUEUED: "info",
  RUNNING: "info",
  PAUSED: "warning",
  COMPLETED: "success",
  CANCELLED: "muted",
  FAILED: "destructive",
}

const campaignLabel: Record<CampaignStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  QUEUED: "Queued",
  RUNNING: "Running",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  FAILED: "Failed",
}

const callTone: Record<CallStatus, StatusTone> = {
  PENDING: "muted",
  QUEUED: "info",
  CALLING: "info",
  RINGING: "info",
  ANSWERED: "success",
  COMPLETED: "success",
  NO_ANSWER: "warning",
  BUSY: "warning",
  FAILED: "destructive",
  CANCELLED: "muted",
  RETRYING: "warning",
}

const callLabel: Record<CallStatus, string> = {
  PENDING: "Pending",
  QUEUED: "Queued",
  CALLING: "Calling",
  RINGING: "Ringing",
  ANSWERED: "Answered",
  COMPLETED: "Completed",
  NO_ANSWER: "No answer",
  BUSY: "Busy",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  RETRYING: "Retrying",
}

function badgeVariant(tone: StatusTone) {
  if (tone === "destructive") {
    return "destructive" as const
  }
  return tone
}

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return <Badge variant={badgeVariant(campaignTone[status])}>{campaignLabel[status]}</Badge>
}

export function CallStatusBadge({ status }: { status: CallStatus }) {
  return <Badge variant={badgeVariant(callTone[status])}>{callLabel[status]}</Badge>
}
