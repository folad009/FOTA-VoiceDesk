"use client"

import { cloneVoiceValue } from "@/server/voice/clone"
import { wizardVoices } from "@/server/campaigns/wizard-draft"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type ClonedVoiceOption = {
  id: string
  name: string
}

export function VoiceSelect({
  value,
  onChange,
  clonedVoices,
}: {
  value: string
  onChange: (value: string, language?: string) => void
  clonedVoices: ClonedVoiceOption[]
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        const catalog = wizardVoices.find((item) => item.id === next)
        onChange(next, catalog?.lang)
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {clonedVoices.length > 0 ? (
          <SelectGroup>
            <SelectLabel>Cloned voices</SelectLabel>
            {clonedVoices.map((voice) => (
              <SelectItem key={voice.id} value={cloneVoiceValue(voice.id)}>
                {voice.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ) : null}
        <SelectGroup>
          <SelectLabel>Catalog voices</SelectLabel>
          {wizardVoices.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
