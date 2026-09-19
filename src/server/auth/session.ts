import "server-only"

import { cookies } from "next/headers"
import { compare } from "bcryptjs"
import { randomBytes } from "node:crypto"

import { prisma } from "@/server/db/prisma"

export const SESSION_COOKIE = "voicedesk_session"
const SESSION_DAYS = 14

export type SessionUser = {
  id: string
  name: string
  email: string
  roleLabel: string
  roleName: "SUPER_ADMIN" | "COMMUNICATION_ADMIN" | "VIEWER"
}

export async function createSession(email: string, password: string): Promise<SessionUser> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: { role: true },
  })
  if (!user?.isActive) {
    throw new Error("Invalid email or password")
  }
  const matches = await compare(password, user.passwordHash)
  if (!matches) {
    throw new Error("Invalid email or password")
  }

  const sessionToken = randomBytes(32).toString("hex")
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires,
    },
  })

  const store = await cookies()
  store.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  })

  return toSessionUser(user)
}

export async function destroySession(): Promise<void> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) {
    await prisma.session.deleteMany({ where: { sessionToken: token } })
  }
  store.delete(SESSION_COOKIE)
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) {
    return null
  }

  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    include: {
      user: { include: { role: true } },
    },
  })
  if (!session || session.expires.getTime() <= Date.now() || !session.user.isActive) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined)
    }
    return null
  }

  return toSessionUser(session.user)
}

function toSessionUser(user: {
  id: string
  name: string
  email: string
  role: { name: string }
}): SessionUser {
  const roleName = toRoleName(user.role.name)
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roleLabel: formatRole(roleName),
    roleName,
  }
}

function toRoleName(role: string): SessionUser["roleName"] {
  if (role === "SUPER_ADMIN" || role === "COMMUNICATION_ADMIN" || role === "VIEWER") {
    return role
  }
  return "VIEWER"
}

function formatRole(role: string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super Admin"
    case "COMMUNICATION_ADMIN":
      return "Communications Admin"
    case "VIEWER":
      return "Viewer"
    default:
      return "Operator"
  }
}
