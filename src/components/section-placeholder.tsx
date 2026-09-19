import type { LucideIcon } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { SectionEmpty } from "@/components/section-empty"

export function SectionPlaceholder({
  title,
  description,
  emptyTitle,
  emptyDescription,
  icon,
}: {
  title: string
  description: string
  emptyTitle: string
  emptyDescription: string
  icon: LucideIcon
}) {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={title} description={description} />
      <SectionEmpty icon={icon} title={emptyTitle} description={emptyDescription} />
    </div>
  )
}
