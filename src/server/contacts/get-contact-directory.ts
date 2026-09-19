import { prisma } from "@/server/db/prisma"
import { maskPhone } from "@/lib/phone"

export type DirectoryContact = {
  id: string
  name: string
  phone: string
  email: string | null
  groups: string[]
}

export async function getContactDirectory(): Promise<{
  total: number
  rows: DirectoryContact[]
}> {
  const [total, contacts] = await Promise.all([
    prisma.contact.count({ where: { isActive: true } }),
    prisma.contact.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        memberships: {
          include: { group: { select: { name: true } } },
        },
      },
    }),
  ])

  return {
    total,
    rows: contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      phone: maskPhone(contact.phoneE164),
      email: contact.email,
      groups: contact.memberships.map((membership) => membership.group.name),
    })),
  }
}
