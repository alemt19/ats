import Link from "next/link"
import { BriefcaseBusiness, MapPin, Sparkles, Tag, Wallet } from "lucide-react"

import { Badge } from "../../../react/components/ui/badge"
import { Button } from "../../../react/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../react/components/ui/card"

type JobOffer = {
  id: number
  title: string
  category: string
  city: string
  state: string
  position: string
  salary: number
}

type LatestOffersPayload =
  | JobOffer[]
  | {
      data?: JobOffer[]
    }

async function fetchLatestOffersServer(): Promise<JobOffer[]> {
  const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"
  const endpoints = [`${apiBaseUrl}/api/jobs/latest?limit=3`, `${apiBaseUrl}/jobs/latest?limit=3`]

  for (const endpoint of endpoints) {
    const response = await fetch(endpoint, {
      method: "GET",
      cache: "no-store",
    })

    if (!response.ok) {
      continue
    }

    const payload = (await response.json().catch(() => null)) as LatestOffersPayload | null

    if (Array.isArray(payload)) {
      return payload
    }

    if (payload && typeof payload === "object" && "data" in payload && Array.isArray(payload.data)) {
      return payload.data
    }
  }

  return []
}

export default async function LatestOffersSection() {
  const latestOffers = await fetchLatestOffersServer()

  return (
    <section id="ofertas" className="section-space border-t border-border/65 bg-muted/20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4 rounded-full border-primary/35 bg-primary/10 text-primary">
            Vacantes activas
          </Badge>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">Ofertas destacadas esta semana</h2>
          <p className="mt-4 text-base sm:text-lg">
            Encuentra oportunidades activas con requisitos claros y procesos de seleccion transparentes.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {latestOffers.map((offer, index) => (
            <Card
              key={offer.id}
              className="gradient-border animate-fade-up gap-3 rounded-3xl bg-card/92 py-4 shadow-soft interactive-lift hover:interactive-lift-hover"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <CardHeader className="space-y-3 pb-0">
                <Badge className="w-fit rounded-full bg-accent/85 text-accent-foreground">
                  <Sparkles aria-hidden="true" className="size-3.5" />
                  Relevante
                </Badge>
                <CardTitle className="text-xl leading-tight">{offer.title}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-2.5">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Tag aria-hidden="true" className="size-4 text-primary" />
                  <span>{offer.category}</span>
                </p>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin aria-hidden="true" className="size-4 text-primary" />
                  <span>
                    {offer.city}, {offer.state}
                  </span>
                </p>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BriefcaseBusiness aria-hidden="true" className="size-4 text-primary" />
                  <span>{offer.position}</span>
                </p>
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Wallet aria-hidden="true" className="size-4 text-accent" />
                  <span>${offer.salary} / mes</span>
                </p>

                <Button asChild className="mt-4 w-full rounded-full shadow-soft">
                  <Link href={`/ofertas/${offer.id}`}>Ver detalle</Link>
                </Button>
              </CardContent>
            </Card>
          ))}

          {latestOffers.length === 0 ? (
            <p className="text-muted-foreground text-center md:col-span-2 lg:col-span-3">
              No hay ofertas publicadas por el momento.
            </p>
          ) : null}
        </div>

        <div className="mt-8 flex justify-center">
          <Button variant="outline" className="rounded-full border-primary/35 bg-card/65 px-8 hover:border-primary/45 hover:bg-muted/90">
            <Link href="/ofertas">Ver todas las ofertas</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

