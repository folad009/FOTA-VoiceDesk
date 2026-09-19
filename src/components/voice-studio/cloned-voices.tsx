"use client"

import { useRef, useState, useTransition } from "react"
import Link from "next/link"
import { AudioLinesIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import {
  archiveVoiceProfileAction,
  createVoiceProfileAction,
} from "@/app/(app)/voice/voices/actions"
import { PageHeader } from "@/components/page-header"
import { SectionEmpty } from "@/components/section-empty"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

export type ClonedVoiceRow = {
  id: string
  name: string
  sampleMediaUrl: string | null
  createdLabel: string
}

export function ClonedVoicesStudio({
  items,
  mocked,
}: {
  items: ClonedVoiceRow[]
  mocked: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState("")
  const [sample, setSample] = useState<File | null>(null)

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData()
    formData.set("name", name)
    if (sample) {
      formData.set("sample", sample)
    }
    startTransition(async () => {
      try {
        await createVoiceProfileAction(formData)
        setName("")
        setSample(null)
        if (fileRef.current) {
          fileRef.current.value = ""
        }
      } catch (error) {
        if (isNextRedirect(error)) {
          throw error
        }
        toast.error(error instanceof Error ? error.message : "Unable to clone this voice")
      }
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Cloned voices"
        description="Import a sample of a speaker. Campaign text-to-speech can then speak in that voice."
        actions={
          <Button variant="outline" asChild>
            <Link href="/voice/messages">Back to messages</Link>
          </Button>
        }
      />

      {mocked ? (
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          ElevenLabs is not connected. Samples are stored, and speech uses a local mock until you add
          ELEVENLABS_API_KEY.
        </p>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-border bg-card p-5"
      >
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Import a voice
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Use 30 seconds to a few minutes of clean, one-speaker audio. Nigerian English comes from
          the sample, not from a catalog accent.
        </p>
        <FieldGroup className="mt-4">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:items-end">
            <Field>
              <FieldLabel htmlFor="clone-name">Voice name</FieldLabel>
              <Input
                id="clone-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Pastor Ada"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="clone-sample">Audio sample</FieldLabel>
              <Input
                id="clone-sample"
                ref={fileRef}
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/mp4,audio/x-m4a"
                required
                onChange={(event) => setSample(event.target.files?.[0] ?? null)}
              />
              <FieldDescription>
                {sample ? sample.name : "MP3, WAV, or M4A. Keep it under 25 MB."}
              </FieldDescription>
            </Field>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
              Clone voice
            </Button>
          </div>
        </FieldGroup>
      </form>

      {items.length === 0 ? (
        <SectionEmpty
          icon={AudioLinesIcon}
          title="No cloned voices yet"
          description="Import a sample here, then choose that voice in Voice Message Studio or the campaign wizard."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((profile) => (
            <article
              key={profile.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium">{profile.name}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Added {profile.createdLabel}
                  </p>
                </div>
                <form
                  action={async () => {
                    const formData = new FormData()
                    formData.set("id", profile.id)
                    try {
                      await archiveVoiceProfileAction(formData)
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : "Unable to archive this voice",
                      )
                    }
                  }}
                >
                  <Button type="submit" variant="ghost" size="sm">
                    Archive
                  </Button>
                </form>
              </div>
              {profile.sampleMediaUrl ? (
                <audio controls src={profile.sampleMediaUrl} className="w-full" />
              ) : (
                <p className="text-sm text-muted-foreground">Sample file is unavailable.</p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")
  )
}
