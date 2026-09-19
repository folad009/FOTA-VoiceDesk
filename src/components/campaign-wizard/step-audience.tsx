"use client"

import { useMemo, useState } from "react"
import { SearchIcon, UploadIcon } from "lucide-react"

import { maskPhone } from "@/lib/phone"
import type { WizardContact, WizardGroup } from "@/server/campaigns/get-wizard-options"
import {
  mergeAudience,
  parseCsvContacts,
  type WizardDraft,
} from "@/server/campaigns/wizard-draft"
import { SectionEmpty } from "@/components/section-empty"
import {
  DataTableFrame,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function StepAudience({
  draft,
  groups,
  contacts,
  onChange,
}: {
  draft: WizardDraft
  groups: WizardGroup[]
  contacts: WizardContact[]
  onChange: (patch: Partial<WizardDraft>) => void
}) {
  const [query, setQuery] = useState("")
  const [uploadError, setUploadError] = useState<string | null>(null)

  const filteredContacts = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) {
      return contacts.slice(0, 8)
    }
    return contacts
      .filter(
        (contact) =>
          contact.name.toLowerCase().includes(needle) ||
          contact.phoneE164.includes(needle),
      )
      .slice(0, 8)
  }, [contacts, query])

  const groupMembers = groups
    .filter((group) => draft.selectedGroupIds.includes(group.id))
    .flatMap((group) =>
      group.members.map((member) => ({
        ...member,
        source: group.name,
      })),
    )

  const selectedContacts = contacts.filter((contact) =>
    draft.selectedContactIds.includes(contact.id),
  )

  const preview = mergeAudience({
    groupMembers,
    selectedContacts,
    uploadedRecipients: draft.uploadedRecipients,
  })

  async function handleUpload(file: File) {
    setUploadError(null)
    const text = await file.text()
    const rows = parseCsvContacts(text)
    if (rows.length === 0) {
      setUploadError("No valid Nigerian phone numbers found. Use columns name, phone.")
      return
    }
    const existing = new Set(draft.uploadedRecipients.map((row) => row.phoneE164))
    const merged = [...draft.uploadedRecipients]
    for (const row of rows) {
      if (!existing.has(row.phoneE164)) {
        existing.add(row.phoneE164)
        merged.push(row)
      }
    }
    onChange({ uploadedRecipients: merged })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Selected recipients
          </p>
          <p className="text-2xl font-medium tabular-nums tracking-tight">
            {preview.length.toLocaleString()}
          </p>
        </div>
        <FieldDescription>Duplicates across groups and uploads are merged by phone number.</FieldDescription>
      </div>

      <FieldGroup>
        {draft.audienceGuidance ? (
          <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {draft.audienceGuidance}
          </p>
        ) : null}
        <Field>
          <FieldLabel>Existing groups</FieldLabel>
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No groups yet. Upload a contact file below to build this campaign audience.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {groups.map((group) => {
                const checked = draft.selectedGroupIds.includes(group.id)
                return (
                  <label
                    key={group.id}
                    className="flex items-start gap-3 rounded-md border border-border bg-card p-3"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => {
                        onChange({
                          selectedGroupIds: value
                            ? [...draft.selectedGroupIds, group.id]
                            : draft.selectedGroupIds.filter((id) => id !== group.id),
                        })
                      }}
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="text-sm font-medium">{group.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {group.memberCount.toLocaleString()} contacts
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="contact-search">Search individual contacts</FieldLabel>
          <div className="flex items-center gap-2">
            <SearchIcon className="size-4 text-muted-foreground" />
            <Input
              id="contact-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or number"
            />
          </div>
          {filteredContacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matching contacts in the directory.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredContacts.map((contact) => {
                const checked = draft.selectedContactIds.includes(contact.id)
                return (
                  <label
                    key={contact.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                  >
                    <span className="flex items-center gap-3">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => {
                          onChange({
                            selectedContactIds: value
                              ? [...draft.selectedContactIds, contact.id]
                              : draft.selectedContactIds.filter((id) => id !== contact.id),
                          })
                        }}
                      />
                      <span className="text-sm">{contact.name}</span>
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {maskPhone(contact.phoneE164)}
                    </span>
                  </label>
                )
              })}
            </div>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="contact-upload">Upload contacts</FieldLabel>
          <input
            id="contact-upload"
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                void handleUpload(file)
              }
              event.target.value = ""
            }}
          />
          <Button type="button" variant="outline" asChild>
            <label htmlFor="contact-upload">
              <UploadIcon data-icon="inline-start" />
              Upload CSV
            </label>
          </Button>
          <FieldDescription>
            CSV with <code>name,phone</code>. Nigerian numbers in local or E.164 format.
          </FieldDescription>
          {uploadError ? <p className="text-sm text-destructive">{uploadError}</p> : null}
        </Field>
      </FieldGroup>

      {preview.length === 0 ? (
        <SectionEmpty
          compact
          icon={UploadIcon}
          title="No recipients selected"
          description="Choose a group, search the directory, or upload a CSV to populate the calling list."
        />
      ) : (
        <DataTableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.slice(0, 12).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="tabular-nums">{maskPhone(row.phoneE164)}</TableCell>
                  <TableCell>
                    <Badge variant="muted">{row.source}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {preview.length > 12 ? (
            <p className="px-4 py-2 text-xs text-muted-foreground">
              Showing 12 of {preview.length.toLocaleString()} recipients
            </p>
          ) : null}
        </DataTableFrame>
      )}
    </div>
  )
}
