type ActivityMetadata = {
  name?: unknown
  count?: unknown
  recipientName?: unknown
}

export function describeActivity({
  action,
  metadata,
}: {
  action: string
  metadata: unknown
}): string {
  const data = asMetadata(metadata)

  switch (action) {
    case "campaign.launched":
      return `Campaign ${readString(data.name) ?? "campaign"} started`
    case "calls.batch_completed": {
      const count = readNumber(data.count) ?? 0
      return `${count} calls completed`
    }
    case "call.answered": {
      const recipient = readString(data.recipientName) ?? "A recipient"
      return `${recipient} answered campaign call`
    }
    case "campaign.retry_started":
      return "Campaign retry cycle started"
    default:
      return action.split(".").join(" ")
  }
}

function asMetadata(metadata: unknown): ActivityMetadata {
  if (typeof metadata !== "object" || metadata === null) {
    return {}
  }
  return metadata as ActivityMetadata
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}
