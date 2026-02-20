import { Card, CardContent, CardHeader } from "react/components/ui/card"
import { Skeleton } from "react/components/ui/skeleton"

export default function PreferenciasCulturalesLoading() {
  const sections = Array.from({ length: 3 })
  const options = Array.from({ length: 4 })

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {sections.map((_, index) => (
        <Card key={`section-${index}`}>
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {options.map((__, optionIndex) => (
                <div key={`option-${index}-${optionIndex}`} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-4 rounded-full" />
                  </div>
                  <Skeleton className="mt-3 h-3 w-full" />
                  <Skeleton className="mt-2 h-3 w-5/6" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Skeleton className="h-9 w-32" />
      </div>
    </section>
  )
}
