import { formatDistanceToNow } from "date-fns"

import { prisma } from "@/server/db/prisma"

export type ActivityRow = {
  id: string
  title: string
  detail: string
  actor: string
  relativeTime: string
}

export function auditActionLabel(action: string): string {
  switch (action) {
    case "campaign.launched":
      return "Campaign launched"
    case "campaign.draft_saved":
      return "Draft saved"
    case "campaign.paused":
      return "Campaign paused"
    case "campaign.resumed":
      return "Campaign resumed"
    case "campaign.cancelled":
      return "Campaign cancelled"
    case "campaign.retry_started":
      return "Retries queued"
    case "campaign.recipient_retry":
      return "Recipient queued for retry"
    case "contacts.imported":
      return "Contacts imported"
    case "voice_message.created":
      return "Voice message created"
    case "voice_message.updated":
      return "Voice message updated"
    case "voice_message.duplicated":
      return "Voice message duplicated"
    case "voice_message.archived":
      return "Voice message archived"
    default:
      return action.replaceAll(".", " ").replaceAll("_", " ")
  }
}

export async function getActivityLog(limit = 80): Promise<ActivityRow[]> {
  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      actor: { select: { name: true, email: true } },
    },
  })

  return rows.map((row) => ({
    id: row.id,
    title: auditActionLabel(row.action),
    detail: detailFor(row.entityType, row.metadata),
    actor: row.actor?.name ?? row.actor?.email ?? "System",
    relativeTime: formatDistanceToNow(row.createdAt, { addSuffix: true }),
  }))
}

function detailFor(entityType: string, metadata: unknown): string {
  if (metadata && typeof metadata === "object" && "name" in metadata) {
    const name = metadata.name
    if (typeof name === "string" && name.trim()) {
      return name
    }
  }
  if (metadata && typeof metadata === "object" && "count" in metadata) {
    const count = metadata.count
    if (typeof count === "number") {
      return `${count.toLocaleString()} records`
    }
  }
  return entityType.replaceAll("_", " ")
}
