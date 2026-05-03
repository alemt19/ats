import { Card, CardContent, CardHeader } from "react/components/ui/card"
import { Skeleton } from "react/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-44" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="sm:col-span-2 xl:col-span-2">
          <Card>
            <CardHeader className="gap-2 pb-0">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-12 w-16" />
            </CardHeader>
          </Card>
        </div>
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="gap-2 pb-0">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-8 w-16" />
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-4 border-t border-border/40 pt-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5 shrink-0">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-72" />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-44" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-44" />
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
            <Skeleton className="h-9 w-20 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-full" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-6 w-56" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 4 }).map((__, innerIndex) => (
                <div key={innerIndex} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
