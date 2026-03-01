import { Card, CardContent, CardHeader } from "react/components/ui/card"
import { Skeleton } from "react/components/ui/skeleton"

export default function CategoriasLoading() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-10 w-52" />
      </div>

      <Card className="gap-4">
        <CardHeader>
          <Skeleton className="h-10 w-full max-w-xl" />
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={`categories-row-${index}`} className="h-12 w-full" />
            ))}
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-9 w-72" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
