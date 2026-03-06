import { Card, CardContent, CardHeader } from "react/components/ui/card"
import { Separator } from "react/components/ui/separator"
import { Skeleton } from "react/components/ui/skeleton"

export default function NosotrosLoading() {
  return (
    <section className="mx-auto w-full max-w-5xl space-y-6 px-4 py-10 sm:px-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-52" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-full" />
          </div>

          <Separator />

          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>

          <Skeleton className="h-5 w-40" />
        </CardContent>
      </Card>
    </section>
  )
}
