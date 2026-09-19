"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { MicIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { saveVoiceMessageAction } from "@/app/(app)/voice/messages/actions"
import {
  estimateSpokenSeconds,
  previewVoiceScript,
  spokenCharacterCount,
  studioWaveform,
} from "@/server/voice/script"
import {
  formatDuration,
  formatFileSize,
  wizardLanguages,
} from "@/server/campaigns/wizard-draft"
import { parseCloneVoiceValue } from "@/server/voice/clone"
import { VoiceSelect, type ClonedVoiceOption } from "@/components/voice-studio/voice-select"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { RecordingStage } from "@/components/voice-studio/recording-stage"
import { extractWaveformPeaks } from "@/components/voice-studio/waveform"

export type VoiceComposerModel = {
  id?: string
  name: string
  kind: "TTS" | "RECORDING"
  ttsText: string
  voice: string
  language: string
  durationSeconds: number | null
  mediaUrl: string | null
  fileSizeBytes: number | null
}

export function VoiceMessageComposer({
  message,
  clonedVoices,
}: {
  message?: VoiceComposerModel
  clonedVoices: ClonedVoiceOption[]
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState(message?.name ?? "")
  const [kind, setKind] = useState<"TTS" | "RECORDING">(message?.kind ?? "TTS")
  const [ttsText, setTtsText] = useState(
    message?.ttsText ?? "Good evening, {{firstName}}. This is a reminder that Sunday service holds this week.",
  )
  const [voice, setVoice] = useState(message?.voice ?? "en-NG-female")
  const [language, setLanguage] = useState(message?.language ?? "en-NG")
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(
    message?.kind === "RECORDING" ? message.durationSeconds ?? 0 : 0,
  )
  const [fileSizeBytes, setFileSizeBytes] = useState(
    message?.kind === "RECORDING" ? message.fileSizeBytes ?? 0 : 0,
  )
  const [fileName, setFileName] = useState<string | null>(null)
  const [peaks, setPeaks] = useState<number[]>(
    studioWaveform(message?.id ?? "new-recording", 64),
  )

  const spokenPreview = useMemo(() => previewVoiceScript(ttsText), [ttsText])
  const characterCount = spokenCharacterCount(ttsText)
  const estimatedSeconds = estimateSpokenSeconds(ttsText)
  const recordingSrc = objectUrl ?? message?.mediaUrl ?? null
  const hasRecording = Boolean(audioFile || message?.mediaUrl)
  const clonedProfileId = parseCloneVoiceValue(voice)
  const clonedPreviewUrl = clonedProfileId ? message?.mediaUrl : null

  async function handleAudio(file: File) {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
    }
    const url = URL.createObjectURL(file)
    const duration = await readDuration(file)
    const nextPeaks = await extractWaveformPeaks(file)
    setAudioFile(file)
    setObjectUrl(url)
    setFileName(file.name)
    setFileSizeBytes(file.size)
    setRecordingDuration(duration)
    setPeaks(nextPeaks)
  }

  function insertFirstName() {
    const token = "{{firstName}}"
    const el = textareaRef.current
    if (!el) {
      setTtsText((current) => `${current}${token}`)
      return
    }
    const start = el.selectionStart
    const end = el.selectionEnd
    const next = `${ttsText.slice(0, start)}${token}${ttsText.slice(end)}`
    setTtsText(next)
    requestAnimationFrame(() => {
      el.focus()
      const cursor = start + token.length
      el.setSelectionRange(cursor, cursor)
    })
  }

  function previewSpeech() {
    if (clonedProfileId) {
      return
    }
    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast.error("Voice preview is not available in this browser")
      return
    }
    const utterance = new SpeechSynthesisUtterance(spokenPreview)
    utterance.lang = language
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    if (audioFile) {
      formData.set("audio", audioFile)
    }
    startTransition(async () => {
      try {
        await saveVoiceMessageAction(formData)
      } catch (error) {
        if (isNextRedirect(error)) {
          throw error
        }
        toast.error(error instanceof Error ? error.message : "Unable to save message")
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <input type="hidden" name="id" value={message?.id ?? ""} />
      <input type="hidden" name="kind" value={kind} />
      <input
        type="hidden"
        name="durationSeconds"
        value={String(kind === "RECORDING" ? recordingDuration || "" : "")}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Voice content studio
          </p>
          <h1 className="mt-1 text-xl font-medium tracking-tight">
            {message?.id ? "Edit message" : "Create message"}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Compose spoken copy once, preview how it sounds, then reuse it across campaigns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" asChild>
            <Link href="/voice/messages">Back to library</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {message?.id ? "Save message" : "Save to library"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="flex flex-col gap-6 rounded-xl border border-border bg-card p-5">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="message-name">Message name</FieldLabel>
              <Input
                id="message-name"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Evening greeting"
                required
              />
            </Field>
            <Field>
              <FieldLabel>Message type</FieldLabel>
              <ToggleGroup
                type="single"
                value={kind}
                onValueChange={(value) => {
                  if (value === "TTS" || value === "RECORDING") {
                    setKind(value)
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
            </Field>
          </FieldGroup>

          {kind === "TTS" ? (
            <FieldGroup>
              <Field>
                <div className="flex items-center justify-between gap-3">
                  <FieldLabel htmlFor="tts-text">Spoken script</FieldLabel>
                  <Button type="button" size="sm" variant="outline" onClick={insertFirstName}>
                    Insert {"{{firstName}}"}
                  </Button>
                </div>
                <Textarea
                  ref={textareaRef}
                  id="tts-text"
                  name="ttsText"
                  rows={14}
                  className="min-h-64 font-[inherit] text-base leading-relaxed"
                  value={ttsText}
                  onChange={(event) => setTtsText(event.target.value)}
                  placeholder="Good evening, {{firstName}}. This is a reminder that Sunday service holds this week."
                />
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground tabular-nums">
                  <span>{characterCount.toLocaleString()} characters</span>
                  <span>Estimated duration {formatDuration(estimatedSeconds)}</span>
                </div>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Voice</FieldLabel>
                  <VoiceSelect
                    value={voice}
                    clonedVoices={clonedVoices}
                    onChange={(value, language) => {
                      setVoice(value)
                      if (language) {
                        setLanguage(language)
                      }
                    }}
                  />
                  <input type="hidden" name="voice" value={voice} />
                  <FieldDescription>
                    Cloned voices generate MP3 audio when you save. Catalog voices are spoken by Twilio.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel>Language</FieldLabel>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {wizardLanguages.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="language" value={language} />
                </Field>
              </div>
            </FieldGroup>
          ) : (
            <FieldGroup>
              <input type="hidden" name="ttsText" value="" />
              <input type="hidden" name="voice" value={voice} />
              <input type="hidden" name="language" value={language} />
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
              {hasRecording && recordingSrc ? (
                <div className="flex flex-col gap-3">
                  <RecordingStage
                    src={recordingSrc}
                    peaks={peaks}
                    durationSeconds={recordingDuration}
                    fileName={fileName ?? "Uploaded recording"}
                    fileSizeBytes={fileSizeBytes}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileRef.current?.click()}
                    >
                      Replace recording
                    </Button>
                    {audioFile ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remove audio"
                        onClick={() => {
                          if (objectUrl) {
                            URL.revokeObjectURL(objectUrl)
                          }
                          setAudioFile(null)
                          setObjectUrl(null)
                          setFileName(null)
                          setFileSizeBytes(message?.kind === "RECORDING" ? message.fileSizeBytes ?? 0 : 0)
                          setRecordingDuration(
                            message?.kind === "RECORDING" ? message.durationSeconds ?? 0 : 0,
                          )
                          setPeaks(studioWaveform(message?.id ?? "new-recording", 64))
                          if (fileRef.current) {
                            fileRef.current.value = ""
                          }
                        }}
                      >
                        <Trash2Icon />
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex min-h-52 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center"
                >
                  <MicIcon className="size-6 text-muted-foreground" />
                  <span className="text-sm font-medium">Upload recording</span>
                  <span className="max-w-xs text-xs text-muted-foreground">
                    MP3, WAV, or M4A. Keep messages under four minutes. Waveform and playback appear after upload.
                  </span>
                </button>
              )}
            </FieldGroup>
          )}
        </div>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-6">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Studio monitor
              </p>
              <p className="mt-1 text-sm font-medium">
                {kind === "TTS" ? "Live spoken preview" : "Recording desk"}
              </p>
            </div>
            <div className="flex flex-col gap-4 p-5">
              {kind === "TTS" ? (
                <>
                  <div className="rounded-xl bg-muted/50 p-4">
                    <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      Example preview
                    </p>
                    <p className="mt-2 text-sm leading-relaxed">
                      {spokenPreview || "Your spoken message will appear here."}
                    </p>
                  </div>
                  <FieldDescription>
                    {"{{firstName}}"} becomes a first name at call time. Sample listener: John.
                  </FieldDescription>
                  <Button
                    type="button"
                    onClick={previewSpeech}
                    disabled={!ttsText.trim() || Boolean(clonedProfileId)}
                  >
                    Preview
                  </Button>
                  {clonedProfileId ? (
                    clonedPreviewUrl ? (
                      <audio controls src={clonedPreviewUrl} className="w-full" />
                    ) : (
                      <FieldDescription>
                        Save this message to generate cloned audio. Personalized scripts generate a file for each recipient when the campaign dials.
                      </FieldDescription>
                    )
                  ) : null}
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Characters</dt>
                      <dd className="mt-0.5 tabular-nums">{characterCount.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Estimated duration</dt>
                      <dd className="mt-0.5 tabular-nums">{formatDuration(estimatedSeconds)}</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Upload a pastoral recording to inspect waveform, duration, and file size before it enters the library.
                  </p>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Duration</dt>
                      <dd className="mt-0.5 tabular-nums">
                        {recordingDuration ? formatDuration(recordingDuration) : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">File size</dt>
                      <dd className="mt-0.5 tabular-nums">
                        {fileSizeBytes ? formatFileSize(fileSizeBytes) : "—"}
                      </dd>
                    </div>
                  </dl>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </form>
  )
}

function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const audio = document.createElement("audio")
    audio.preload = "metadata"
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? Math.round(audio.duration) : 0
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

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")
  )
}
