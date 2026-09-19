"use client"

import { BellIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ShellNotification } from "@/server/notifications/get-shell-notifications"

export function NotificationsMenu({ items }: { items: ShellNotification[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Notifications" className="relative">
          <BellIcon />
          {items.length > 0 ? (
            <span className="bg-primary absolute top-1.5 right-1.5 size-1.5 rounded-full" />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 min-w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          {items.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              No unread campaign notices.
            </div>
          ) : (
            <ul className="flex flex-col gap-1 p-1">
              {items.map((item) => (
                <li key={item.id} className="rounded-md px-2 py-2">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.body}</p>
                </li>
              ))}
            </ul>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
