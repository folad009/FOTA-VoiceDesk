export type NavIconName =
  | "dashboard"
  | "campaigns"
  | "create"
  | "contacts"
  | "groups"
  | "import"
  | "voice"
  | "clone"
  | "analytics"
  | "activity"
  | "settings"

export type NavItem = {
  title: string
  href: string
  icon: NavIconName
}

export type NavSection = {
  title: string
  items: NavItem[]
}

export const navigation: NavSection[] = [
  {
    title: "Overview",
    items: [{ title: "Dashboard", href: "/dashboard", icon: "dashboard" }],
  },
  {
    title: "Campaigns",
    items: [
      { title: "All Campaigns", href: "/campaigns", icon: "campaigns" },
      { title: "Create Campaign", href: "/campaigns/new", icon: "create" },
    ],
  },
  {
    title: "Audience",
    items: [
      { title: "Contacts", href: "/contacts", icon: "contacts" },
      { title: "Groups", href: "/groups", icon: "groups" },
      { title: "Import Contacts", href: "/contacts/import", icon: "import" },
    ],
  },
  {
    title: "Voice",
    items: [
      { title: "Voice Messages", href: "/voice/messages", icon: "voice" },
      { title: "Cloned Voices", href: "/voice/voices", icon: "clone" },
    ],
  },
  {
    title: "Analytics",
    items: [
      { title: "Campaign Analytics", href: "/analytics", icon: "analytics" },
    ],
  },
  {
    title: "System",
    items: [
      { title: "Activity Log", href: "/activity", icon: "activity" },
      { title: "Settings", href: "/settings", icon: "settings" },
    ],
  },
]

export type BreadcrumbCrumb = {
  title: string
  href?: string
}

export function breadcrumbsForPath(pathname: string): BreadcrumbCrumb[] {
  if (pathname === "/voice" || pathname === "/voice/messages") {
    return [{ title: "Voice" }, { title: "Voice Messages" }]
  }
  if (pathname === "/voice/voices") {
    return [{ title: "Voice" }, { title: "Cloned Voices" }]
  }
  if (pathname === "/voice/messages/new") {
    return [
      { title: "Voice" },
      { title: "Voice Messages", href: "/voice/messages" },
      { title: "Create Message" },
    ]
  }
  if (pathname.startsWith("/voice/messages/")) {
    return [
      { title: "Voice" },
      { title: "Voice Messages", href: "/voice/messages" },
      { title: "Edit Message" },
    ]
  }

  const match = navigation
    .flatMap((section) =>
      section.items.map((item) => ({ section: section.title, item })),
    )
    .find((entry) => entry.item.href === pathname)

  if (pathname.startsWith("/campaigns/") && pathname !== "/campaigns/new") {
    return [{ title: "Campaigns", href: "/campaigns" }, { title: "Campaign" }]
  }

  if (!match) {
    return [{ title: "Dashboard", href: "/dashboard" }]
  }

  if (match.section === "Overview") {
    return [{ title: match.item.title }]
  }

  return [{ title: match.section }, { title: match.item.title }]
}

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname === "/"
  }
  if (href === "/campaigns") {
    return (
      pathname === "/campaigns" ||
      (pathname.startsWith("/campaigns/") && !pathname.startsWith("/campaigns/new"))
    )
  }
  if (href === "/contacts") {
    return pathname === "/contacts"
  }
  if (href === "/voice/voices") {
    return pathname === "/voice/voices" || pathname.startsWith("/voice/voices/")
  }
  if (href === "/voice/messages") {
    return (
      pathname === "/voice" ||
      pathname === "/voice/messages" ||
      pathname.startsWith("/voice/messages/")
    )
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}
