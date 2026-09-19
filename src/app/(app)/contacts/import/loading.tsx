import { Skeleton } from "@/components/ui/skeleton"

export default function ImportContactsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-80 w-full rounded-md" />
    </div>
  )
}
