"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { navigation } from "@/config/navigation"

export function CommandMenu({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()

  if (!open) {
    return null
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search VoiceDesk"
      description="Jump to a section of FOTA VoiceDesk"
    >
      <CommandInput placeholder="Search campaigns, contacts, settings…" />
      <CommandList>
        <CommandEmpty>No matching section.</CommandEmpty>
        {navigation.map((section) => (
          <CommandGroup key={section.title} heading={section.title}>
            {section.items.map((item) => (
              <CommandItem
                key={item.href}
                value={`${section.title} ${item.title}`}
                onSelect={() => {
                  onOpenChange(false)
                  router.push(item.href)
                }}
              >
                {item.title}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}

export function useCommandMenu() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return { open, setOpen }
}
