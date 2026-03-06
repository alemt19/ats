import { BriefcaseBusiness, MapPin, Tag, Wallet } from "lucide-react"

import { Button } from "../../../react/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../react/components/ui/card"
import Link from "next/link"

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
    <section id="ofertas" className="bg-muted/30 py-10 sm:py-12 lg:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-800 sm:text-4xl">
            Ultimas ofertas laborales
          </h2>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {latestOffers.map((oferta) => (
            <Card key={oferta.id} className="gap-3 rounded-2xl py-4 shadow-none">
              <CardHeader className="pb-0">
                <CardTitle className="text-xl text-neutral-800">{oferta.title}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-2">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Tag className="size-4" />
                  <span>{oferta.category}</span>
                </p>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="size-4" />
                  <span>
                    {oferta.city}, {oferta.state}
                  </span>
                </p>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BriefcaseBusiness className="size-4" />
                  <span>{oferta.position}</span>
                </p>
                <p className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
                  <Wallet className="size-4" />
                  <span>${oferta.salary} / mes</span>
                </p>

                <Button className="mt-4 w-full bg-blue-700 hover:bg-blue-800">
                  Ver más
                </Button>
              </CardContent>
            </Card>
          ))}

          {latestOffers.length === 0 ? (
            <p className="text-muted-foreground md:col-span-2 lg:col-span-3 text-center">
              No hay ofertas publicadas por el momento.
            </p>
          ) : null}
        </div>

        <div className="mt-8 flex justify-center">
          <Button variant="outline" className="cursor-pointer px-8" >
            
            <Link href="/ofertas">Buscar mas ofertas</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
