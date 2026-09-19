import { getNamedTemplate } from "@/config/campaign-templates"
import type { WizardDraft } from "@/server/campaigns/wizard-draft"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export function StepSchedule({
  draft,
  onChange,
}: {
  draft: WizardDraft
  onChange: (patch: Partial<WizardDraft>) => void
}) {
  const scheduleGuidance = getNamedTemplate(draft.templateId)?.scheduleGuidance

  return (
    <FieldGroup>
      <Field>
        <FieldLabel>When should calling begin?</FieldLabel>
        <ToggleGroup
          type="single"
          value={draft.scheduleMode}
          onValueChange={(value) => {
            if (value === "immediate" || value === "later") {
              onChange({ scheduleMode: value })
            }
          }}
          variant="outline"
          spacing={0}
          className="w-full"
        >
          <ToggleGroupItem value="immediate" className="min-w-0 flex-1">
            Start immediately
          </ToggleGroupItem>
          <ToggleGroupItem value="later" className="min-w-0 flex-1">
            Schedule for later
          </ToggleGroupItem>
        </ToggleGroup>
      </Field>
      {draft.scheduleMode === "later" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="schedule-date">Date</FieldLabel>
            <Input
              id="schedule-date"
              type="date"
              value={draft.scheduledDate}
              onChange={(event) => onChange({ scheduledDate: event.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="schedule-time">Time</FieldLabel>
            <Input
              id="schedule-time"
              type="time"
              value={draft.scheduledTime}
              onChange={(event) => onChange({ scheduledTime: event.target.value })}
            />
          </Field>
          <Field className="sm:col-span-2">
            <FieldDescription>
              {scheduleGuidance ??
                `Scheduled in ${draft.timezone} (West Africa Time if Africa/Lagos). Dates use day-month-year.`}
            </FieldDescription>
          </Field>
        </div>
      ) : (
        <FieldDescription>
          VoiceDesk will queue the campaign now and begin placing calls within the allowed hours.
        </FieldDescription>
      )}
    </FieldGroup>
  )
}
