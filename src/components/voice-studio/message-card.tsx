"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { MoreHorizontalIcon } from "lucide-react"
import { toast } from "sonner"

import {
  archiveVoiceMessageAction,
  duplicateVoiceMessageAction,
  restoreVoiceMessageAction,
} from "@/app/(app)/voice/messages/actions"
import type { VoiceLibraryItem } from "@/server/voice/library"
import { studioWaveform } from "@/server/voice/script"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { WaveformBars } from "@/components/voice-studio/waveform"

export function VoiceMessageCard({
  message,
  onPreview,
}: {
  message: VoiceLibraryItem
  onPreview: (message: VoiceLibraryItem) => void
}) {
  const router = useRouter()
  const peaks = studioWaveform(message.id, 42)

  async function runArchiveOrRestore(
    action: (formData: FormData) => Promise<void>,
    success: string,
  ) {
    const formData = new FormData()
    formData.set("id", message.id)
    try {
      await action(formData)
      toast.success(success)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed")
    }
  }

  async function onDuplicate() {
    const formData = new FormData()
    formData.set("id", message.id)
    try {
      const copy = await duplicateVoiceMessageAction(formData)
      toast.success("Message duplicated")
      router.push(`/voice/messages/${copy.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to duplicate")
    }
  }

  return (
    <Card className="transition-colors hover:ring-foreground/20">
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate">
              <Link href={`/voice/messages/${message.id}`} className="hover:underline">
                {message.name}
              </Link>
            </CardTitle>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge variant={message.kind === "TTS" ? "info" : "secondary"}>
                {message.typeLabel}
              </Badge>
              <Badge variant={message.status === "Archived" ? "muted" : "success"}>
                {message.status}
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for ${message.name}`}
              >
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onPreview(message)}>
                Preview message
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/voice/messages/${message.id}`}>Open in studio</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void onDuplicate()}>
                Duplicate message
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {message.status === "Archived" ? (
                <DropdownMenuItem
                  onClick={() =>
                    void runArchiveOrRestore(restoreVoiceMessageAction, "Message restored")
                  }
                >
                  Restore message
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() =>
                    void runArchiveOrRestore(archiveVoiceMessageAction, "Message archived")
                  }
                >
                  Archive message
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {message.kind === "TTS" ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {message.ttsText || "No script yet."}
          </p>
        ) : (
          <button
            type="button"
            className="w-full text-left"
            onClick={() => onPreview(message)}
            aria-label={`Preview ${message.name}`}
          >
            <WaveformBars peaks={peaks} className="h-12" />
          </button>
        )}
      </CardContent>
      <CardFooter className="grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-4">
        <Meta label="Duration" value={message.durationLabel} />
        <Meta label="Created" value={message.createdLabel} />
        <Meta
          label="Used in campaigns"
          value={
            message.campaignCount === 0
              ? "Not used"
              : `${message.campaignCount} campaign${message.campaignCount === 1 ? "" : "s"}`
          }
        />
        <Meta label="Status" value={message.status} />
      </CardFooter>
    </Card>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium tracking-wide uppercase">{label}</p>
      <p className="mt-0.5 truncate tabular-nums text-foreground">{value}</p>
    </div>
  )
}
