"use client"

import { useEffect } from "react"

import { DashboardErrorState } from "@/components/dashboard/dashboard-error"
import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Dashboard render failed", error)
  }, [error])

  return (
    <div className="flex flex-col gap-4">
      <DashboardErrorState message="The operations dashboard failed to render. Retry after checking the server logs." />
      <div>
        <Button type="button" variant="outline" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  )
}
