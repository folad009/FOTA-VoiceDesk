import { Skeleton } from "@/components/ui/skeleton"

export default function CampaignCommandLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-80 max-w-full" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
        <Skeleton className="h-64 w-full rounded-md" />
        <Skeleton className="h-64 w-full rounded-md" />
      </div>
      <Skeleton className="h-80 w-full rounded-md" />
      <div className="grid gap-3 sm:grid-cols-4">
        <Skeleton className="h-24 rounded-md" />
        <Skeleton className="h-24 rounded-md" />
        <Skeleton className="h-24 rounded-md" />
        <Skeleton className="h-24 rounded-md" />
      </div>
    </div>
  )
}
