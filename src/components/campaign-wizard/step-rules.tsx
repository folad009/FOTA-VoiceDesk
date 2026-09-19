import {
  formatCallingHours,
  minutesToTimeValue,
  timeValueToMinutes,
  type WizardDraft,
} from "@/server/campaigns/wizard-draft"
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
import { Slider } from "@/components/ui/slider"

const timezones = [
  { id: "Africa/Lagos", label: "Africa/Lagos (WAT)" },
  { id: "Africa/Accra", label: "Africa/Accra (GMT)" },
  { id: "UTC", label: "UTC" },
]

export function StepRules({
  draft,
  onChange,
}: {
  draft: WizardDraft
  onChange: (patch: Partial<WizardDraft>) => void
}) {
  return (
    <FieldGroup>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="max-attempts">Maximum attempts</FieldLabel>
          <Input
            id="max-attempts"
            type="number"
            min={1}
            max={5}
            value={draft.maxAttempts}
            onChange={(event) =>
              onChange({ maxAttempts: Number(event.target.value) || 1 })
            }
          />
          <FieldDescription>How many times VoiceDesk should retry an unanswered call.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="retry-delay">Retry delay (minutes)</FieldLabel>
          <Input
            id="retry-delay"
            type="number"
            min={5}
            max={240}
            value={draft.retryDelayMinutes}
            onChange={(event) =>
              onChange({ retryDelayMinutes: Number(event.target.value) || 5 })
            }
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="start-time">Allowed start time</FieldLabel>
          <Input
            id="start-time"
            type="time"
            value={minutesToTimeValue(draft.callingHoursStartMinutes)}
            onChange={(event) =>
              onChange({ callingHoursStartMinutes: timeValueToMinutes(event.target.value) })
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="end-time">Allowed end time</FieldLabel>
          <Input
            id="end-time"
            type="time"
            value={minutesToTimeValue(draft.callingHoursEndMinutes)}
            onChange={(event) =>
              onChange({ callingHoursEndMinutes: timeValueToMinutes(event.target.value) })
            }
          />
        </Field>
      </div>
      <Field>
        <FieldLabel>Timezone</FieldLabel>
        <Select
          value={draft.timezone}
          onValueChange={(value) => onChange({ timezone: value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {timezones.map((zone) => (
                <SelectItem key={zone.id} value={zone.id}>
                  {zone.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <FieldDescription>
          Calling hours: {formatCallingHours(draft.callingHoursStartMinutes, draft.callingHoursEndMinutes)}
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel>Call pacing</FieldLabel>
        <div className="flex items-center gap-4">
          <Slider
            min={1}
            max={10}
            step={1}
            value={[draft.pacingSeconds]}
            onValueChange={(value) =>
              onChange({ pacingSeconds: value[0] ?? draft.pacingSeconds })
            }
            className="flex-1"
          />
          <span className="w-24 text-right text-sm tabular-nums text-muted-foreground">
            {draft.pacingSeconds}s apart
          </span>
        </div>
        <FieldDescription>
          Minimum delay between outbound calls from this campaign.
        </FieldDescription>
      </Field>
    </FieldGroup>
  )
}
