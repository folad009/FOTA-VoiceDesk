import { Prisma } from "@prisma/client"

import { requireActorId } from "@/server/auth/actor"
import { prisma } from "@/server/db/prisma"
import type { ImportableContact } from "@/server/contacts/import-workflow"

export async function importContactBatch(
  rows: ImportableContact[],
): Promise<{ imported: number; skippedExisting: number }> {
  const actorId = await requireActorId()

  let imported = 0
  let skippedExisting = 0
  const groupIds = new Map<string, string>()

  for (const row of rows) {
    try {
      const contact = await prisma.contact.create({
        data: {
          name: row.name,
          phoneE164: row.phoneE164,
          email: row.email,
        },
        select: { id: true },
      })
      imported += 1
      if (row.group) {
        const groupId = await resolveGroupId(row.group, actorId, groupIds)
        await prisma.contactGroupMember.upsert({
          where: {
            groupId_contactId: {
              groupId,
              contactId: contact.id,
            },
          },
          create: { groupId, contactId: contact.id },
          update: {},
        })
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        skippedExisting += 1
        continue
      }
      throw error
    }
  }

  if (imported > 0 || skippedExisting > 0) {
    await prisma.auditLog.create({
      data: {
        actorUserId: actorId,
        action: "contacts.imported",
        entityType: "contact",
        metadata: { imported, skippedExisting },
      },
    })
  }

  return { imported, skippedExisting }
}

async function resolveGroupId(
  name: string,
  createdById: string,
  cache: Map<string, string>,
): Promise<string> {
  const key = name.trim().toLowerCase()
  const cached = cache.get(key)
  if (cached) {
    return cached
  }
  const existing = await prisma.contactGroup.findFirst({
    where: { name: { equals: name.trim(), mode: "insensitive" } },
    select: { id: true },
  })
  if (existing) {
    cache.set(key, existing.id)
    return existing.id
  }
  const created = await prisma.contactGroup.create({
    data: { name: name.trim(), createdById },
    select: { id: true },
  })
  cache.set(key, created.id)
  return created.id
}
