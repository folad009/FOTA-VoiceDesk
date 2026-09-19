import { prisma } from "@/server/db/prisma"

export async function getImportContext(): Promise<{ existingPhones: string[] }> {
  const contacts = await prisma.contact.findMany({
    where: { isActive: true },
    select: { phoneE164: true },
  })
  return { existingPhones: contacts.map((contact) => contact.phoneE164) }
}
