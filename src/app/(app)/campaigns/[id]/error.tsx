"use client"

import { useEffect } from "react"

import { DashboardErrorState } from "@/components/dashboard/dashboard-error"
import { Button } from "@/components/ui/button"

export default function CampaignCommandError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Campaign command center failed", error)
  }, [error])

  return (
    <div className="flex flex-col gap-4">
      <DashboardErrorState message="This campaign could not be displayed. Try again." />
      <div>
        <Button type="button" variant="outline" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  )
}
