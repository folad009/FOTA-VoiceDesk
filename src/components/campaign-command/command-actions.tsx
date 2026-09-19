"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import type { CampaignActions } from "@/server/campaigns/command-center"
import {
  cancelCampaignAction,
  pauseCampaignAction,
  resumeCampaignAction,
  retryFailedAction,
} from "@/app/(app)/campaigns/[id]/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function CommandActions({
  campaignId,
  actions,
  retryableCount,
}: {
  campaignId: string
  actions: CampaignActions
  retryableCount: number
}) {
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState<"pause" | "resume" | "retry" | "cancel" | null>(null)

  function run(
    key: "pause" | "resume" | "retry" | "cancel",
    action: (formData: FormData) => Promise<void>,
    success: string,
  ) {
    const formData = new FormData()
    formData.set("campaignId", campaignId)
    setBusy(key)
    startTransition(async () => {
      try {
        await action(formData)
        toast.success(success)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to update campaign")
      } finally {
        setBusy(null)
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.canResume ? (
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => run("resume", resumeCampaignAction, "Campaign resumed")}
        >
          {busy === "resume" ? <Spinner data-icon="inline-start" /> : null}
          Resume
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={!actions.canPause || pending}
          onClick={() => run("pause", pauseCampaignAction, "Campaign paused")}
        >
          {busy === "pause" ? <Spinner data-icon="inline-start" /> : null}
          Pause
        </Button>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="outline" disabled={!actions.canCancel || pending}>
            Cancel
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              Remaining queued and in-flight calls will stop. Completed calls are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep running</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => run("cancel", cancelCampaignAction, "Campaign cancelled")}
            >
              {busy === "cancel" ? <Spinner data-icon="inline-start" /> : null}
              Cancel campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="outline" disabled={!actions.canRetryFailed || pending}>
            Retry unanswered
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retry unanswered and failed calls?</AlertDialogTitle>
            <AlertDialogDescription>
              {retryableCount.toLocaleString()} recipient
              {retryableCount === 1 ? "" : "s"} with no answer, busy, or failed outcomes will
              be queued again. Cancelled calls are left unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep as is</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                run("retry", retryFailedAction, "Unanswered and failed calls queued for retry")
              }
            >
              {busy === "retry" ? <Spinner data-icon="inline-start" /> : null}
              Queue retries
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {actions.canExport ? (
        <Button asChild variant="outline">
          <a href={`/campaigns/${campaignId}/report`}>Export Report</a>
        </Button>
      ) : (
        <Button type="button" variant="outline" disabled>
          Export Report
        </Button>
      )}
    </div>
  )
}
