import { Card, CardContent, CardHeader } from "react/components/ui/card"
import { Separator } from "react/components/ui/separator"
import { Skeleton } from "react/components/ui/skeleton"

export default function OfertaDetalleLoading() {
  return (
    <section className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-8 w-3/4" />
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-10/12" />
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-3/4 sm:col-span-2" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-44" />
          </div>

          <Separator />

          <Skeleton className="h-9 w-32" />
        </CardContent>
      </Card>
    </section>
  )
}
