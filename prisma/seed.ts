import { PrismaClient, RoleName } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const roleNames: RoleName[] = [
    RoleName.SUPER_ADMIN,
    RoleName.COMMUNICATION_ADMIN,
    RoleName.VIEWER,
  ]

  for (const name of roleNames) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }

  const superAdminRole = await prisma.role.findUniqueOrThrow({
    where: { name: RoleName.SUPER_ADMIN },
  })

  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@fota.local").toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD ?? "change-me-now"
  const passwordHash = await hash(password, 12)

  await prisma.user.upsert({
    where: { email },
    update: {
      name: "Fola",
      passwordHash,
      roleId: superAdminRole.id,
      isActive: true,
    },
    create: {
      name: "Fola",
      email,
      passwordHash,
      roleId: superAdminRole.id,
    },
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
