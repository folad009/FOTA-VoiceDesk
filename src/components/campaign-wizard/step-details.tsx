import {
  applyCampaignTemplate,
  applyNamedTemplate,
  eventTemplates,
  wizardCampaignTypes,
} from "@/config/campaign-templates"
import {
  campaignTypeLabels,
  type CampaignType,
  type WizardDraft,
} from "@/server/campaigns/wizard-draft"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export function StepDetails({
  draft,
  onChange,
}: {
  draft: WizardDraft
  onChange: (patch: Partial<WizardDraft>) => void
}) {
  return (
    <FieldGroup>
      {eventTemplates.length > 0 ? (
        <Field>
          <FieldLabel>Reusable templates</FieldLabel>
          <div className="grid gap-2">
            {eventTemplates.map((template) => {
              const selected = draft.templateId === template.id
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onChange(applyNamedTemplate(draft, template.id))}
                  className={
                    selected
                      ? "rounded-md border border-primary bg-primary/5 p-3 text-left"
                      : "rounded-md border border-border bg-card p-3 text-left hover:bg-muted/40"
                  }
                >
                  <p className="text-sm font-medium">{template.name}</p>
                  {template.event ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {template.event.title} · {template.event.datesLabel} · {template.event.location}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">{template.objective}</p>
                </button>
              )
            })}
          </div>
          <FieldDescription>
            Templates fill objective, audience guidance, voice copy, calling rules, and schedule.
            Edit any field before launch. The calling engine only plays the saved message.
          </FieldDescription>
        </Field>
      ) : null}
      <Field>
        <FieldLabel htmlFor="campaign-name">Campaign name</FieldLabel>
        <Input
          id="campaign-name"
          value={draft.name}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder="Sunday service reminder"
          autoFocus
        />
        <FieldDescription>
          This name appears on the operations dashboard and in the live calling queue.
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="campaign-description">Campaign objective</FieldLabel>
        <Textarea
          id="campaign-description"
          value={draft.description}
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder="Remind recipients that service holds this Sunday."
          rows={4}
        />
      </Field>
      <Field>
        <FieldLabel>Campaign type</FieldLabel>
        <ToggleGroup
          type="single"
          value={draft.type}
          onValueChange={(value) => {
            if (value) {
              onChange(applyCampaignTemplate(draft, value as CampaignType))
            }
          }}
          variant="outline"
          spacing={2}
          className="grid w-full grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
        >
          {wizardCampaignTypes.map((type) => (
            <ToggleGroupItem
              key={type}
              value={type}
              className="h-auto justify-start px-3 py-3 text-left whitespace-normal data-[state=on]:border-primary data-[state=on]:bg-primary/5 data-[state=on]:text-foreground"
            >
              {campaignTypeLabels[type]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <FieldDescription>
          Type starters load a generic script. Event templates above can reuse the same type with
          different dates and venues.
        </FieldDescription>
      </Field>
    </FieldGroup>
  )
}
