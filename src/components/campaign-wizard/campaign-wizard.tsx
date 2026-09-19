"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import type { WizardClonedVoice, WizardContact, WizardGroup, WizardVoiceMessage } from "@/server/campaigns/get-wizard-options"
import {
  canProceedFromStep,
  canSelectReachedStep,
  defaultWizardDraft,
  mergeAudience,
  readinessChecks,
  wizardSteps,
  type WizardDraft,
  type WizardStepId,
} from "@/server/campaigns/wizard-draft"
import { applyCampaignTemplate, applyNamedTemplate, getNamedTemplate } from "@/config/campaign-templates"
import { campaignTypeLabels } from "@/server/campaigns/wizard-draft"
import { submitCampaignAction } from "@/app/(app)/campaigns/new/actions"
import { StepAudience } from "@/components/campaign-wizard/step-audience"
import { StepDetails } from "@/components/campaign-wizard/step-details"
import { StepMessage } from "@/components/campaign-wizard/step-message"
import { StepReview } from "@/components/campaign-wizard/step-review"
import { StepRules } from "@/components/campaign-wizard/step-rules"
import { StepSchedule } from "@/components/campaign-wizard/step-schedule"
import { WizardStepper } from "@/components/campaign-wizard/wizard-stepper"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { isValidNigerianE164 } from "@/lib/phone"

export function CampaignWizard({
  groups,
  contacts,
  voiceMessages,
  clonedVoices,
  twilioConnected,
  initialTemplateId,
}: {
  groups: WizardGroup[]
  contacts: WizardContact[]
  voiceMessages: WizardVoiceMessage[]
  clonedVoices: WizardClonedVoice[]
  twilioConnected: boolean
  initialTemplateId?: string
}) {
  const router = useRouter()
  const [step, setStep] = useState<WizardStepId>("details")
  const [highestStep, setHighestStep] = useState(0)
  const [draft, setDraft] = useState<WizardDraft>(() => {
    const initial = defaultWizardDraft()
    if (initialTemplateId) {
      return { ...initial, ...applyNamedTemplate(initial, initialTemplateId) }
    }
    return {
      ...initial,
      ...applyCampaignTemplate(initial, "SUNDAY_SERVICE_REMINDER"),
    }
  })
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState<"draft" | "launch" | null>(null)

  const recipients = useMemo(() => {
    const groupMembers = groups
      .filter((group) => draft.selectedGroupIds.includes(group.id))
      .flatMap((group) =>
        group.members.map((member) => ({ ...member, source: group.name })),
      )
    return mergeAudience({
      groupMembers,
      selectedContacts: contacts.filter((contact) =>
        draft.selectedContactIds.includes(contact.id),
      ),
      uploadedRecipients: draft.uploadedRecipients,
    })
  }, [contacts, draft.selectedContactIds, draft.selectedGroupIds, draft.uploadedRecipients, groups])

  const phonesValid =
    recipients.length > 0 && recipients.every((row) => isValidNigerianE164(row.phoneE164))
  const checks = readinessChecks(draft, {
    recipientCount: recipients.length,
    phonesValid,
    twilioConnected,
  })
  const launchReady = checks.every((check) => check.ok)

  function patch(next: Partial<WizardDraft>) {
    setDraft((current) => ({ ...current, ...next }))
  }

  const stepIndex = wizardSteps.findIndex((item) => item.id === step)
  const canContinue =
    step === "audience"
      ? recipients.length > 0
      : canProceedFromStep(step, draft)

  function goNext() {
    const next = wizardSteps[stepIndex + 1]
    if (next && canContinue) {
      setStep(next.id)
      setHighestStep((current) => Math.max(current, stepIndex + 1))
    }
  }

  function goBack() {
    const previous = wizardSteps[stepIndex - 1]
    if (previous) {
      setStep(previous.id)
    }
  }

  async function submit(intent: "draft" | "launch") {
    setSubmitting(intent)
    try {
      const payload: WizardDraft = {
        ...draft,
        recording: draft.recording
          ? {
              fileName: draft.recording.fileName,
              durationSeconds: draft.recording.durationSeconds,
              sizeBytes: draft.recording.sizeBytes,
            }
          : null,
      }
      const formData = new FormData()
      formData.set("intent", intent)
      formData.set("draft", JSON.stringify(payload))
      if (audioFile) {
        formData.set("audio", audioFile)
      }
      const result = await submitCampaignAction(formData)
      toast.success(intent === "launch" ? "Campaign launched" : "Draft saved")
      router.push(`/campaigns/${result.campaignId}`)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error && error.message.length < 160
          ? error.message
          : "Unable to save campaign",
      )
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          New campaign
        </p>
        <h1 className="text-xl font-medium tracking-tight">Launch a voice campaign</h1>
        <p className="text-sm text-muted-foreground">
          Configure audience, message, and calling rules before anything goes on the wire.
        </p>
      </header>

      <WizardStepper
        current={step}
        onSelect={(next) => {
          const nextIndex = wizardSteps.findIndex((item) => item.id === next)
          if (canSelectReachedStep(nextIndex, highestStep)) {
            setStep(next)
          }
        }}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-w-0 rounded-md border border-border bg-card p-5 md:p-6">
          {step === "details" ? <StepDetails draft={draft} onChange={patch} /> : null}
          {step === "audience" ? (
            <StepAudience
              draft={draft}
              groups={groups}
              contacts={contacts}
              onChange={patch}
            />
          ) : null}
          {step === "message" ? (
            <StepMessage
              draft={draft}
              library={voiceMessages}
              clonedVoices={clonedVoices}
              onChange={patch}
              onAudioFile={setAudioFile}
            />
          ) : null}
          {step === "rules" ? <StepRules draft={draft} onChange={patch} /> : null}
          {step === "schedule" ? <StepSchedule draft={draft} onChange={patch} /> : null}
          {step === "review" ? (
            <StepReview
              draft={draft}
              recipientCount={recipients.length}
              checks={checks}
              clonedVoices={clonedVoices}
            />
          ) : null}
        </section>

        <aside className="h-fit rounded-md border border-border bg-card p-4 xl:sticky xl:top-24">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Campaign brief
          </p>
          <p className="mt-3 text-sm font-medium text-foreground">
            {draft.name.trim() || "Untitled campaign"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {draft.type ? campaignTypeLabels[draft.type] : "Choose a type"}
          </p>
          {getNamedTemplate(draft.templateId)?.event ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {getNamedTemplate(draft.templateId)?.event?.datesLabel} ·{" "}
              {getNamedTemplate(draft.templateId)?.event?.location}
            </p>
          ) : null}
          <dl className="mt-4 flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Recipients</dt>
              <dd className="tabular-nums">{recipients.length.toLocaleString()}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Message</dt>
              <dd>{draft.messageKind === "TTS" ? "Spoken text" : "Recording"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Attempts</dt>
              <dd className="tabular-nums">{draft.maxAttempts}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Schedule</dt>
              <dd>{draft.scheduleMode === "immediate" ? "Immediate" : "Scheduled"}</dd>
            </div>
          </dl>
        </aside>
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <Button type="button" variant="ghost" onClick={goBack} disabled={stepIndex === 0 || submitting !== null}>
          Back
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {step === "review" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => void submit("draft")}
                disabled={draft.name.trim().length === 0 || submitting !== null}
              >
                {submitting === "draft" ? <Spinner data-icon="inline-start" /> : null}
                Save as Draft
              </Button>
              <Button
                type="button"
                onClick={() => void submit("launch")}
                disabled={!launchReady || submitting !== null}
              >
                {submitting === "launch" ? <Spinner data-icon="inline-start" /> : null}
                Launch Campaign
              </Button>
            </>
          ) : (
            <Button type="button" onClick={goNext} disabled={!canContinue}>
              Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
