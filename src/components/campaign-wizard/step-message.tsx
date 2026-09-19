"use client"

import { useRef } from "react"
import Link from "next/link"
import { MicIcon, Trash2Icon } from "lucide-react"

import {
  formatDuration,
  formatFileSize,
  personalizePreview,
  wizardLanguages,
  type WizardDraft,
} from "@/server/campaigns/wizard-draft"
import type { WizardClonedVoice, WizardVoiceMessage } from "@/server/campaigns/get-wizard-options"
import { VoiceSelect } from "@/components/voice-studio/voice-select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export function StepMessage({
  draft,
  library,
  clonedVoices,
  onChange,
  onAudioFile,
}: {
  draft: WizardDraft
  library: WizardVoiceMessage[]
  clonedVoices: WizardClonedVoice[]
  onChange: (patch: Partial<WizardDraft>) => void
  onAudioFile: (file: File | null) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  function previewSpeech() {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return
    }
    const utterance = new SpeechSynthesisUtterance(
      personalizePreview(draft.ttsText, draft.includeRecipientName),
    )
    utterance.lang = draft.language
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  async function handleAudio(file: File) {
    const durationSeconds = await readDuration(file)
    const dataUrl = URL.createObjectURL(file)
    onAudioFile(file)
    onChange({
      recording: {
        fileName: file.name,
        durationSeconds,
        sizeBytes: file.size,
        dataUrl,
      },
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {library.length > 0 ? (
        <Field>
          <FieldLabel>Saved voice messages</FieldLabel>
          <Select
            value={draft.libraryMessageId || "new"}
            onValueChange={(value) => {
              if (value === "new") {
                onChange({ libraryMessageId: "" })
                return
              }
              const selected = library.find((item) => item.id === value)
              if (!selected) {
                return
              }
              onAudioFile(null)
              onChange({
                libraryMessageId: selected.id,
                messageKind: selected.kind,
                ttsText: selected.ttsText ?? "",
                voice: selected.voice ?? draft.voice,
                language: selected.language ?? draft.language,
                includeRecipientName: selected.includeRecipientName,
                recording:
                  selected.kind === "RECORDING"
                    ? {
                        fileName: selected.title,
                        durationSeconds: selected.durationSeconds ?? 0,
                        sizeBytes: 0,
                        dataUrl: selected.mediaUrl ?? undefined,
                      }
                    : null,
              })
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Write a new message" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="new">Write a new message</SelectItem>
                {library.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.title}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>
            Reuse a message from Voice Messages, or write a new one for this campaign.
          </FieldDescription>
        </Field>
      ) : null}

      <ToggleGroup
        type="single"
        value={draft.messageKind}
        onValueChange={(value) => {
          if (value === "TTS" || value === "RECORDING") {
            onChange({ messageKind: value, libraryMessageId: "" })
          }
        }}
        variant="outline"
        spacing={0}
        className="w-full"
      >
        <ToggleGroupItem value="TTS" className="min-w-0 flex-1">
          Text to speech
        </ToggleGroupItem>
        <ToggleGroupItem value="RECORDING" className="min-w-0 flex-1">
          Recorded audio
        </ToggleGroupItem>
      </ToggleGroup>

      {draft.messageKind === "TTS" ? (
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="tts-text">Message</FieldLabel>
            <Textarea
              id="tts-text"
              rows={7}
              value={draft.ttsText}
              onChange={(event) => onChange({ ttsText: event.target.value, libraryMessageId: "" })}
              placeholder="Good day. This is a reminder that Sunday service holds this week."
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Voice</FieldLabel>
              <VoiceSelect
                value={draft.voice}
                clonedVoices={clonedVoices}
                onChange={(value, language) =>
                  onChange({
                    voice: value,
                    ...(language ? { language } : {}),
                    libraryMessageId: "",
                  })
                }
              />
              <FieldDescription>
                Import a speaker sample in{" "}
                <Link href="/voice/voices" className="underline underline-offset-2">
                  Cloned voices
                </Link>
                .
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel>Language</FieldLabel>
              <Select
                value={draft.language}
                onValueChange={(value) => onChange({ language: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {wizardLanguages.map((language) => (
                      <SelectItem key={language.id} value={language.id}>
                        {language.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field orientation="horizontal">
            <Checkbox
              id="use-first-name"
              checked={draft.includeRecipientName}
              onCheckedChange={(value) =>
                onChange({ includeRecipientName: value === true })
              }
            />
            <FieldLabel htmlFor="use-first-name" className="font-normal">
              Use recipient&apos;s first name
            </FieldLabel>
          </Field>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={previewSpeech}>
              Preview
            </Button>
            <FieldDescription>Plays a local preview. Twilio voices are used when the campaign launches.</FieldDescription>
          </div>
          <div className="rounded-md border border-border bg-card p-4">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Message preview
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground">
              {personalizePreview(draft.ttsText, draft.includeRecipientName) ||
                "Your spoken message will appear here."}
            </p>
          </div>
        </FieldGroup>
      ) : (
        <FieldGroup>
          <input
            ref={fileRef}
            type="file"
            accept="audio/mpeg,audio/mp3,audio/wav,audio/mp4,audio/x-m4a"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                void handleAudio(file)
              }
            }}
          />
          {draft.recording ? (
            <div className="flex flex-col gap-4 rounded-md border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{draft.recording.fileName}</p>
                  <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                    {formatDuration(draft.recording.durationSeconds)} ·{" "}
                    {formatFileSize(draft.recording.sizeBytes)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                  >
                    Replace
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove audio"
                    onClick={() => {
                      onAudioFile(null)
                      onChange({ recording: null })
                      if (fileRef.current) {
                        fileRef.current.value = ""
                      }
                    }}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </div>
              {draft.recording.dataUrl ? (
                <audio controls src={draft.recording.dataUrl} className="w-full" />
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-card px-4 py-8 text-center"
            >
              <MicIcon className="size-5 text-muted-foreground" />
              <span className="text-sm font-medium">Upload recorded audio</span>
              <span className="text-xs text-muted-foreground">MP3, WAV, or M4A. Keep messages under four minutes.</span>
            </button>
          )}
        </FieldGroup>
      )}
    </div>
  )
}

function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const audio = document.createElement("audio")
    audio.preload = "metadata"
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0
      URL.revokeObjectURL(url)
      resolve(duration)
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(0)
    }
    audio.src = url
  })
}
