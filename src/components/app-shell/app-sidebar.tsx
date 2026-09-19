"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ActivityIcon,
  AudioLinesIcon,
  ChartColumnIcon,
  FolderUpIcon,
  LayoutDashboardIcon,
  LayersIcon,
  MegaphoneIcon,
  PlusIcon,
  SettingsIcon,
  SpeechIcon,
  UsersIcon,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { isNavActive, navigation, type NavIconName } from "@/config/navigation"

const icons: Record<NavIconName, typeof LayoutDashboardIcon> = {
  dashboard: LayoutDashboardIcon,
  campaigns: MegaphoneIcon,
  create: PlusIcon,
  contacts: UsersIcon,
  groups: LayersIcon,
  import: FolderUpIcon,
  voice: AudioLinesIcon,
  clone: SpeechIcon,
  analytics: ChartColumnIcon,
  activity: ActivityIcon,
  settings: SettingsIcon,
}

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-3">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-[11px] font-semibold text-sidebar-primary-foreground">
            FV
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-sm font-medium tracking-tight">
              FOTA VoiceDesk
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              Communications
            </span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {navigation.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const Icon = icons[item.icon]
                  const active = isNavActive(pathname, item.href)
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
