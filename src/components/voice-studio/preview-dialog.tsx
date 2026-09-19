"use client"

import { useState } from "react"
import { PlayIcon } from "lucide-react"

import {
  formatDuration,
  formatFileSize,
  voiceLabel,
} from "@/server/campaigns/wizard-draft"
import { previewVoiceScript } from "@/server/voice/script"
import type { VoiceLibraryItem } from "@/server/voice/library"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RecordingStage } from "@/components/voice-studio/recording-stage"
import { studioWaveform } from "@/server/voice/script"

export function PreviewMessageDialog({
  message,
  open,
  onOpenChange,
}: {
  message: VoiceLibraryItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [playing, setPlaying] = useState(false)

  function playTts() {
    if (!message?.ttsText || typeof window === "undefined" || !window.speechSynthesis) {
      return
    }
    const utterance = new SpeechSynthesisUtterance(previewVoiceScript(message.ttsText))
    utterance.lang = message.language ?? "en-NG"
    utterance.onend = () => setPlaying(false)
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
    setPlaying(true)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && typeof window !== "undefined") {
          window.speechSynthesis?.cancel()
          setPlaying(false)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-lg" showCloseButton>
        {message ? (
          <>
            <DialogHeader>
              <DialogTitle>{message.name}</DialogTitle>
              <DialogDescription>
                {message.typeLabel}
                {message.durationLabel !== "—" ? ` · ${message.durationLabel}` : ""}
                {message.kind === "TTS" && message.voice
                  ? ` · ${voiceLabel(message.voice)}`
                  : ""}
              </DialogDescription>
            </DialogHeader>
            {message.kind === "TTS" && message.mediaUrl ? (
              <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-border bg-muted/40 p-4">
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    Spoken example
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-foreground">
                    {message.ttsText
                      ? previewVoiceScript(message.ttsText)
                      : "No script yet."}
                  </p>
                </div>
                <audio controls src={message.mediaUrl} className="w-full" />
              </div>
            ) : message.kind === "TTS" ? (
              <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-border bg-muted/40 p-4">
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    Spoken example
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-foreground">
                    {message.ttsText
                      ? previewVoiceScript(message.ttsText)
                      : "No script yet."}
                  </p>
                </div>
                <Button type="button" onClick={playTts} disabled={!message.ttsText}>
                  <PlayIcon data-icon="inline-start" />
                  {playing ? "Playing preview" : "Preview voice"}
                </Button>
              </div>
            ) : message.mediaUrl ? (
              <RecordingStage
                src={message.mediaUrl}
                peaks={studioWaveform(message.id, 56)}
                durationSeconds={message.durationSeconds ?? 0}
                fileName={message.name}
                fileSizeBytes={message.fileSizeBytes}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                This recording has no audio file attached.
                {message.fileSizeBytes != null
                  ? ` ${formatFileSize(message.fileSizeBytes)}.`
                  : ""}
                {message.durationSeconds != null
                  ? ` ${formatDuration(message.durationSeconds)}.`
                  : ""}
              </p>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
