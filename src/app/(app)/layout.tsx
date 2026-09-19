import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { AppShell } from "@/components/app-shell/app-shell"
import { requireActor } from "@/server/auth/actor"
import { getSessionUser } from "@/server/auth/session"
import { getShellNotifications } from "@/server/notifications/get-shell-notifications"

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await getSessionUser()
  if (!session && process.env.NODE_ENV === "production") {
    redirect("/login")
  }
  const user = await requireActor()
  const notifications = await getShellNotifications().catch(() => [])
  return (
    <AppShell user={user} notifications={notifications}>
      {children}
    </AppShell>
  )
}
