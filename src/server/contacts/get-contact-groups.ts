import { prisma } from "@/server/db/prisma"
import { formatLagosDate } from "@/lib/datetime"

export type ContactGroupRow = {
  id: string
  name: string
  description: string | null
  memberCount: number
  createdLabel: string
}

export async function getContactGroups(): Promise<ContactGroupRow[]> {
  const groups = await prisma.contactGroup.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { members: true } },
    },
  })
  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    memberCount: group._count.members,
    createdLabel: formatLagosDate(group.createdAt),
  }))
}
