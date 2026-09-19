import { prisma } from "@/server/db/prisma"
import { requireActor } from "@/server/auth/actor"

export type ShellNotification = {
  id: string
  title: string
  body: string
}

export async function getShellNotifications(): Promise<ShellNotification[]> {
  const actor = await requireActor()
  const rows = await prisma.notification.findMany({
    where: { userId: actor.id, readAt: null },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { id: true, title: true, body: true },
  })
  return rows
}
