import "server-only"

import { previewShellUser } from "@/lib/shell-user"
import { prisma } from "@/server/db/prisma"
import { getSessionUser, type SessionUser } from "@/server/auth/session"

export async function requireActor(): Promise<SessionUser> {
  const sessionUser = await getSessionUser()
  if (sessionUser) {
    return sessionUser
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Sign in to continue")
  }

  const actor = await prisma.user.findFirst({
    where: { email: previewShellUser.email.toLowerCase(), isActive: true },
    include: { role: true },
  })
  if (!actor) {
    throw new Error("Operator account not found")
  }
  return {
    id: actor.id,
    name: actor.name,
    email: actor.email,
    roleLabel:
      actor.role.name === "SUPER_ADMIN"
        ? "Super Admin"
        : actor.role.name === "COMMUNICATION_ADMIN"
          ? "Communications Admin"
          : "Viewer",
    roleName:
      actor.role.name === "SUPER_ADMIN" || actor.role.name === "COMMUNICATION_ADMIN"
        ? actor.role.name
        : "VIEWER",
  }
}

export async function requireActorId(): Promise<string> {
  const actor = await requireOperator()
  return actor.id
}

export async function requireOperator(): Promise<SessionUser> {
  const actor = await requireActor()
  if (actor.roleName === "VIEWER") {
    throw new Error("This action requires a communications administrator")
  }
  return actor
}
