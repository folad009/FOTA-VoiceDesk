import { AlertCircleIcon } from "lucide-react"

export function DashboardErrorState({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3"
    >
      <AlertCircleIcon className="mt-0.5 size-4 text-destructive" />
      <div>
        <p className="text-sm font-medium text-foreground">Operations data unavailable</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}
