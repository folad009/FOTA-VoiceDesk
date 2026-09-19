import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="px-4 py-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2 h-6 w-12" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-48 w-full rounded-md" />
      </div>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-56 w-full rounded-md" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-56 w-full rounded-md" />
        </div>
      </div>
    </div>
  )
}
