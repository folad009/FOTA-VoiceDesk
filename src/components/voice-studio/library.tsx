"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { AudioLinesIcon, PlusIcon } from "lucide-react"

import type { VoiceLibraryData, VoiceLibraryItem, VoiceLibraryView } from "@/server/voice/library"
import { KpiStrip } from "@/components/dashboard/kpi-strip"
import { PageHeader } from "@/components/page-header"
import { SectionEmpty } from "@/components/section-empty"
import { Button } from "@/components/ui/button"
import { VoiceMessageCard } from "@/components/voice-studio/message-card"
import { PreviewMessageDialog } from "@/components/voice-studio/preview-dialog"
import { cn } from "cn"

const views: Array<{ id: VoiceLibraryView; label: string; href: string }> = [
  { id: "library", label: "Library", href: "/voice/messages" },
  { id: "tts", label: "Text to speech", href: "/voice/messages?view=tts" },
  { id: "recording", label: "Recorded audio", href: "/voice/messages?view=recording" },
  { id: "archived", label: "Archive", href: "/voice/messages?view=archived" },
]

const emptyCopy: Record<VoiceLibraryView, { title: string; description: string }> = {
  library: {
    title: "No voice messages yet",
    description:
      "Write a text-to-speech script or upload a recording. Campaigns reuse these messages instead of starting from a blank file each time.",
  },
  tts: {
    title: "No text-to-speech messages",
    description: "Create a spoken script with voice, language, and {{firstName}} personalization.",
  },
  recording: {
    title: "No recorded audio",
    description: "Upload an MP3, WAV, or M4A file to keep a reusable pastoral recording.",
  },
  archived: {
    title: "Archive is empty",
    description: "Archived messages stay here so campaigns can keep historical copy without cluttering the library.",
  },
}

export function VoiceMessageLibrary({ data }: { data: VoiceLibraryData }) {
  const [preview, setPreview] = useState<VoiceLibraryItem | null>(null)
  const counts = useMemo(
    () => ({
      library: data.stats.library,
      tts: data.stats.tts,
      recording: data.stats.recording,
      archived: data.stats.archived,
    }),
    [data.stats],
  )

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Voice Message Studio"
        description="Reusable spoken copy for FOTA campaigns — scripts, voices, and recordings in one library."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/voice/voices">Cloned voices</Link>
            </Button>
            <Button asChild>
              <Link href="/voice/messages/new">
                <PlusIcon data-icon="inline-start" />
                Create message
              </Link>
            </Button>
          </div>
        }
      />

      <KpiStrip
        items={[
          { label: "In library", value: String(data.stats.library) },
          { label: "Text to speech", value: String(data.stats.tts) },
          { label: "Recorded audio", value: String(data.stats.recording) },
          { label: "Spoken length", value: data.stats.minutesLabel },
          { label: "Archived", value: String(data.stats.archived) },
        ]}
      />

      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
        {views.map((view) => {
          const active = data.view === view.id
          return (
            <Link
              key={view.id}
              href={view.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/10"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {view.label}
              <span className="ml-1.5 tabular-nums text-muted-foreground">
                {counts[view.id]}
              </span>
            </Link>
          )
        })}
      </div>

      {data.items.length === 0 ? (
        <SectionEmpty
          icon={AudioLinesIcon}
          title={emptyCopy[data.view].title}
          description={emptyCopy[data.view].description}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map((message) => (
            <VoiceMessageCard
              key={message.id}
              message={message}
              onPreview={setPreview}
            />
          ))}
        </div>
      )}

      <PreviewMessageDialog
        message={preview}
        open={preview !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPreview(null)
          }
        }}
      />
    </div>
  )
}
