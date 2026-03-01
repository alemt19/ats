import { Card, CardContent, CardHeader } from "react/components/ui/card"
import { Skeleton } from "react/components/ui/skeleton"

export default function OfertaAdminDetalleLoading() {
  return (
    <section className="mx-auto w-full space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-10 w-3/5" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-52" />
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex gap-6 border-b pb-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-48" />
        </div>

        <Card>
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-80" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Array.from({ length: 10 }).map((_, index) => (
                <Skeleton key={`admin-offer-field-${index}`} className="h-10 w-full" />
              ))}
              <Skeleton className="h-28 w-full md:col-span-2" />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <Card className="hidden h-fit lg:block">
            <CardHeader>
              <Skeleton className="h-6 w-36" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={`filter-skeleton-${index}`} className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="min-w-0 gap-3">
            <CardHeader className="space-y-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <Skeleton className="h-10 w-full md:max-w-md" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-24 lg:hidden" />
                  <Skeleton className="h-10 w-40" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={`table-row-${index}`} className="h-12 w-full" />
                ))}
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                <Skeleton className="h-4 w-60" />
                <Skeleton className="h-9 w-72" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
