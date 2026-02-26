import { Card, CardContent, CardHeader } from "react/components/ui/card"
import { Skeleton } from "react/components/ui/skeleton"

export default function CategoriaDetalleLoading() {
  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>

      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>

          <div className="flex justify-end gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-36" />
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
