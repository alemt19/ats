import { Skeleton } from "../../../react/components/ui/skeleton"

const skeletonTone = "bg-muted-foreground/20"

export default function LatestOffersSectionSkeleton() {
  return (
    <section id="ofertas" className="bg-muted/30 py-10 sm:py-12 lg:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Skeleton className={`mx-auto h-10 w-80 max-w-full ${skeletonTone}`} />
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-3 rounded-2xl border p-6">
              <Skeleton className={`h-7 w-3/4 ${skeletonTone}`} />
              <Skeleton className={`h-4 w-2/3 ${skeletonTone}`} />
              <Skeleton className={`h-4 w-4/5 ${skeletonTone}`} />
              <Skeleton className={`h-4 w-1/2 ${skeletonTone}`} />
              <Skeleton className={`h-10 w-full ${skeletonTone}`} />
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Skeleton className={`h-10 w-44 ${skeletonTone}`} />
        </div>
      </div>
    </section>
  )
}
