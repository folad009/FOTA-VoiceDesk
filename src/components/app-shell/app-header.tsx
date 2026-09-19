"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SearchIcon } from "lucide-react"

import { breadcrumbsForPath } from "@/config/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { CommandMenu, useCommandMenu } from "@/components/app-shell/command-menu"
import { NotificationsMenu } from "@/components/app-shell/notifications-menu"
import { UserMenu } from "@/components/app-shell/user-menu"
import type { ShellUser } from "@/lib/shell-user"
import type { ShellNotification } from "@/server/notifications/get-shell-notifications"

export function AppHeader({
  user,
  notifications = [],
}: {
  user: ShellUser
  notifications?: ShellNotification[]
}) {
  const pathname = usePathname()
  const crumbs = breadcrumbsForPath(pathname)
  const { open, setOpen } = useCommandMenu()

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-3 md:px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="hidden h-4 md:block" />
      <Breadcrumb className="min-w-0 flex-1 overflow-hidden">
        <BreadcrumbList>
          {crumbs.flatMap((crumb, index) => {
            const isLast = index === crumbs.length - 1
            const nodes = [
              <BreadcrumbItem key={`${crumb.title}-${index}`}>
                {isLast || !crumb.href ? (
                  <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.title}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>,
            ]
            if (index < crumbs.length - 1) {
              nodes.push(
                <BreadcrumbSeparator key={`${crumb.title}-sep`} />,
              )
            }
            return nodes
          })}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="hidden text-muted-foreground md:inline-flex"
          onClick={() => setOpen(true)}
        >
          <SearchIcon data-icon="inline-start" />
          Search
          <kbd className="ml-3 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          aria-label="Search"
          onClick={() => setOpen(true)}
        >
          <SearchIcon />
        </Button>
        <NotificationsMenu items={notifications} />
        <UserMenu user={user} />
      </div>
      <CommandMenu open={open} onOpenChange={setOpen} />
    </header>
  )
}
