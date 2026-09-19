import type { ReactNode } from "react"

import { TooltipProvider } from "@/components/ui/tooltip"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { AppHeader } from "@/components/app-shell/app-header"
import { AppSidebar } from "@/components/app-shell/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import type { ShellUser } from "@/lib/shell-user"
import type { ShellNotification } from "@/server/notifications/get-shell-notifications"

export function AppShell({
  user,
  notifications = [],
  children,
}: {
  user: ShellUser
  notifications?: ShellNotification[]
  children: ReactNode
}) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AppHeader user={user} notifications={notifications} />
          <div className="flex flex-1 flex-col bg-background">
            <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
              {children}
            </div>
          </div>
        </SidebarInset>
        <Toaster />
      </SidebarProvider>
    </TooltipProvider>
  )
}
