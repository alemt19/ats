import Link from "next/link"
import { AlertCircle, Clock } from "lucide-react"
import { Card, CardContent } from "react/components/ui/card"

type ActionStripProps = {
  pendingReview: number
  atRiskOffers: number
}

export default function ActionStrip({ pendingReview, atRiskOffers }: ActionStripProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* A1: Postulaciones esperando revisión */}
      <Link href="/admin/aplicaciones" className="group">
        <Card className="h-full rounded-2xl border border-border/40 bg-card/80 shadow-soft transition-all duration-200 group-hover:border-primary/30 group-hover:shadow-elevated">
          <CardContent className="flex flex-col gap-3 p-8">
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Clock className="size-4 text-primary" aria-hidden />
              </span>
              {pendingReview > 0 && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  Requieren atención
                </span>
              )}
            </div>
            <div>
              <p className="font-display text-[3.5rem] font-semibold leading-none tabular-nums text-foreground">
                {pendingReview}
              </p>
              <p className="mt-2 text-sm text-foreground/60">Postulaciones esperando revisión</p>
            </div>
            {pendingReview === 0 ? (
              <p className="text-xs text-foreground/40">Todos los candidatos han sido revisados — buen trabajo.</p>
            ) : (
              <p className="text-xs text-primary/70 underline-offset-2 group-hover:underline">Ver postulaciones →</p>
            )}
          </CardContent>
        </Card>
      </Link>

      {/* A2: Ofertas en riesgo */}
      <Link href="/admin/ofertas" className="group">
        <Card className="h-full rounded-2xl border border-border/40 bg-card/80 shadow-soft transition-all duration-200 group-hover:border-destructive/30 group-hover:shadow-elevated">
          <CardContent className="flex flex-col gap-3 p-8">
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10">
                <AlertCircle className="size-4 text-destructive" aria-hidden />
              </span>
              {atRiskOffers > 0 && (
                <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
                  Sin actividad reciente
                </span>
              )}
            </div>
            <div>
              <p className="font-display text-[3.5rem] font-semibold leading-none tabular-nums text-foreground">
                {atRiskOffers}
              </p>
              <p className="mt-2 text-sm text-foreground/60">Ofertas en riesgo</p>
            </div>
            {atRiskOffers === 0 ? (
              <p className="text-xs text-foreground/40">Ninguna oferta requiere atención hoy.</p>
            ) : (
              <p className="text-xs text-destructive/70 underline-offset-2 group-hover:underline">Ver ofertas →</p>
            )}
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}
