import { Skeleton } from "react/components/ui/skeleton"

export default function CompetenciasValoresLoading() {
  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="space-y-6">
        <div className="space-y-4 rounded-xl border p-6">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-80 max-w-full" />
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-150 w-full" />
        </div>

        <div className="space-y-4 rounded-xl border p-6">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-96 max-w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-10 w-60" />
        </div>

        <div className="space-y-4 rounded-xl border p-6">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-96 max-w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>

        <div className="flex justify-end">
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
    </section>
  )
}
