import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"

export default function VoiceMessageNotFound() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Message not found"
        description="This voice message is missing or was removed from the studio."
        actions={
          <Button asChild>
            <Link href="/voice/messages">Back to library</Link>
          </Button>
        }
      />
    </div>
  )
}
