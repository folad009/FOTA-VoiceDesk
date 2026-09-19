import { Skeleton } from "@/components/ui/skeleton"

export function PageSkeleton({ tiles = 0 }: { tiles?: number }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      {tiles > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: tiles }).map((_, index) => (
            <div key={index} className="rounded-md border border-border bg-card p-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-7 w-16" />
            </div>
          ))}
        </div>
      ) : null}
      <Skeleton className="h-64 w-full rounded-md" />
    </div>
  )
}
