import type { LucideIcon } from "lucide-react"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

export function SectionEmpty({
  icon: Icon,
  title,
  description,
  compact = false,
}: {
  icon: LucideIcon
  title: string
  description: string
  compact?: boolean
}) {
  return (
    <Empty
      className={
        compact
          ? "min-h-[180px] border border-dashed border-border bg-card"
          : "min-h-[280px] border border-dashed border-border bg-card"
      }
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
