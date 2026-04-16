import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "react/components/ui/card"
import { Separator } from "react/components/ui/separator"

type CompanyRecord = {
  name?: string | null
  logo_url?: string | null
  contact_email?: string | null
  country?: string | null
  state?: string | null
  city?: string | null
  address?: string | null
  description?: string | null
  mision?: string | null
}

type BackendEnvelope<T> = {
  success?: boolean
  data?: T
}

type CompanyAboutData = {
  logo: string
  name: string
  contact_email: string
  country: string
  state: string
  city: string
  address: string
  description: string
  mision: string
}

function normalizeLogo(logoUrl: string | null | undefined, backendApiUrl: string): string {
  const value = (logoUrl ?? "").trim()

  if (!value) {
    return ""
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("blob:") ||
    value.startsWith("data:")
  ) {
    return value
  }

  if (value.startsWith("/")) {
    return `${backendApiUrl}${value}`
  }

  if (value.startsWith("uploads/")) {
    return `${backendApiUrl}/${value}`
  }

  return value
}

function toCompanyAboutData(company: CompanyRecord | null, backendApiUrl: string): CompanyAboutData {
  return {
    logo: normalizeLogo(company?.logo_url, backendApiUrl),
    name: (company?.name ?? "Empresa").trim() || "Empresa",
    contact_email: (company?.contact_email ?? "No disponible").trim() || "No disponible",
    country: (company?.country ?? "No disponible").trim() || "No disponible",
    state: (company?.state ?? "No disponible").trim() || "No disponible",
    city: (company?.city ?? "No disponible").trim() || "No disponible",
    address: (company?.address ?? "No disponible").trim() || "No disponible",
    description: (company?.description ?? "No disponible").trim() || "No disponible",
    mision: (company?.mision ?? "No disponible").trim() || "No disponible",
  }
}

async function fetchCompanyForAboutPage(): Promise<CompanyAboutData> {
  const backendApiUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"
  const endpoints = [
    `${backendApiUrl}/api/companies?skip=0&take=1`,
    `${backendApiUrl}/companies?skip=0&take=1`,
  ]

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        cache: "no-store",
      })

      if (!response.ok) {
        continue
      }

      const payload = (await response.json().catch(() => null)) as
        | CompanyRecord[]
        | BackendEnvelope<CompanyRecord[]>
        | null

      const companies = Array.isArray(payload)
        ? payload
        : payload && typeof payload === "object" && Array.isArray(payload.data)
          ? payload.data
          : []

      return toCompanyAboutData(companies[0] ?? null, backendApiUrl)
    } catch {
      // Try next endpoint variant.
    }
  }

  return toCompanyAboutData(null, backendApiUrl)
}

export default async function NosotrosPage() {
  const company = await fetchCompanyForAboutPage()

  return (
    <section className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10 sm:px-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold sm:text-4xl">Nosotros</h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Conoce más sobre {company.name} y nuestra propuesta para conectar talento con oportunidades.
        </p>
      </div>

      <Card className="gradient-border rounded-3xl bg-card/94 shadow-soft">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-4">
            {company.logo ? (
              <img
                src={company.logo}
                alt={`Logo de ${company.name}`}
                className="h-14 w-14 rounded-xl border border-border/70 object-contain"
              />
            ) : (
              <div className="bg-primary text-primary-foreground flex h-14 w-14 items-center justify-center rounded-xl text-sm font-semibold">
                {company.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <CardTitle>{company.name}</CardTitle>
              <p className="text-sm text-muted-foreground">Correo: {company.contact_email}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">País</p>
              <p className="font-medium">{company.country}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <p className="font-medium">{company.state}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ciudad</p>
              <p className="font-medium">{company.city}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Dirección</p>
            <p className="font-medium">{company.address}</p>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Descripción</p>
            <p className="whitespace-pre-line text-sm leading-relaxed">{company.description}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Misión</p>
            <p className="whitespace-pre-line text-sm leading-relaxed">{company.mision}</p>
          </div>

          <div>
            <Link
              href="/ofertas"
              className="inline-flex rounded-full border border-primary/35 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors duration-[240ms] hover:border-primary/45 hover:bg-muted/90"
            >
              Ver ofertas laborales
            </Link>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
