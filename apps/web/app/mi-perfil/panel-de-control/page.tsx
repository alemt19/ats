import path from "node:path"
import { readFile } from "node:fs/promises"
import { headers } from "next/headers"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "react/components/ui/card"
import InfoTooltip from "react/components/ui/info-tooltip"
import StatusBarsChart from "./status-bars-chart"
import StatusMonthlyChart from "./status-monthly-chart"

type JobApplication = {
  id: number
  status?: string | null
  applied_at?: string | null
  overall_score?: number | null
  match_technical_score?: number | null
  match_soft_score?: number | null
  match_culture_score?: number | null
}

type RawStatusCatalogItem = {
  technical_name?: string
  techical_name?: string
  display_name: string
}

type StatusCatalogItem = {
  technical_name: string
  display_name: string
}

async function readJsonFile<T>(relativePath: string): Promise<T> {
  const fullPath = path.join(process.cwd(), "public", "data", relativePath)
  const fileContents = await readFile(fullPath, "utf-8")
  return JSON.parse(fileContents) as T
}

function normalizeStatusCatalog(rawCatalog: RawStatusCatalogItem[]): StatusCatalogItem[] {
  return rawCatalog
    .map((item) => ({
      technical_name: item.technical_name ?? item.techical_name ?? "",
      display_name: item.display_name,
    }))
    .filter((item) => item.technical_name.length > 0)
}

async function fetchApplicationsServer(cookie: string): Promise<JobApplication[]> {
  const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"
  const endpoints = [`${apiBaseUrl}/api/applications/me`, `${apiBaseUrl}/applications/me`]

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: { cookie },
        cache: "no-store",
      })

      if (!response.ok) {
        continue
      }

      const payload = (await response.json().catch(() => null)) as
        | { data?: JobApplication[] }
        | JobApplication[]
        | null

      if (Array.isArray(payload)) {
        return payload
      }

      if (Array.isArray(payload?.data)) {
        return payload.data
      }
    } catch {
      // Try next endpoint variant.
    }
  }

  return []
}

function averagePercentage(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === "number" && !Number.isNaN(value))
  if (valid.length === 0) {
    return null
  }

  const average = valid.reduce((accumulator, current) => accumulator + current, 0) / valid.length
  return Math.max(0, Math.min(100, average * 100))
}

function formatPercent(value: number | null) {
  if (value === null) {
    return "-"
  }

  return `${value.toFixed(1)}%`
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-"
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return "-"
  }

  return parsed.toLocaleDateString("es-ES", { dateStyle: "medium" })
}

export default async function PanelDeControlPage() {
  const cookie = (await headers()).get("cookie") ?? ""

  const [applications, statusCatalogRaw] = await Promise.all([
    fetchApplicationsServer(cookie),
    readJsonFile<RawStatusCatalogItem[]>("application_status.json"),
  ])

  const statusCatalog = normalizeStatusCatalog(statusCatalogRaw)
  const totalApplications = applications.length
  const evaluatedApplications = applications.filter(
    (item) => typeof item.overall_score === "number" && !Number.isNaN(item.overall_score)
  ).length

  const statusCounts = new Map<string, number>()
  for (const application of applications) {
    const status = String(application.status ?? "").trim()
    if (!status) {
      continue
    }

    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1)
  }

  const knownStatuses = new Set(statusCatalog.map((item) => item.technical_name))
  const unknownStatusRows = Array.from(statusCounts.entries())
    .filter(([technicalName]) => !knownStatuses.has(technicalName))
    .map(([technical_name, count]) => ({
      technical_name,
      display_name: technical_name,
      count,
    }))

  const statusRows = statusCatalog
    .map((statusItem) => ({
      ...statusItem,
      count: statusCounts.get(statusItem.technical_name) ?? 0,
    }))
    .concat(unknownStatusRows)

  // Build year -> [12 months] counts map from application dates
  const yearlyCounts: Record<string, number[]> = {}
  for (const app of applications) {
    if (!app.applied_at) continue
    const parsed = new Date(app.applied_at)
    if (Number.isNaN(parsed.getTime())) continue
    const year = String(parsed.getFullYear())
    const monthIndex = parsed.getMonth() // 0..11
    const yearCounts = yearlyCounts[year] ?? Array.from({ length: 12 }, () => 0)
    yearCounts[monthIndex] = (yearCounts[monthIndex] ?? 0) + 1
    yearlyCounts[year] = yearCounts
  }

  const currentYear = new Date().getFullYear()
  const dataYearsSet = new Set(Object.keys(yearlyCounts).map((y) => Number(y)))
  // Ensure current year is selectable (even if no data)
  dataYearsSet.add(currentYear)
  const years = Array.from(dataYearsSet).sort((a, b) => b - a)

  const overallAverage = averagePercentage(applications.map((item) => item.overall_score))
  const technicalAverage = averagePercentage(applications.map((item) => item.match_technical_score))
  const softAverage = averagePercentage(applications.map((item) => item.match_soft_score))
  const cultureAverage = averagePercentage(applications.map((item) => item.match_culture_score))

  const bestApplication = applications
    .filter((item): item is JobApplication & { overall_score: number } =>
      typeof item.overall_score === "number" && !Number.isNaN(item.overall_score)
    )
    .sort((left, right) => right.overall_score - left.overall_score)[0]

  const latestApplicationDate = applications
    .map((item) => item.applied_at)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((left, right) => right.getTime() - left.getTime())[0]

  return (
    <section className="mx-auto w-full max-w-6xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Panel de control</h1>
        <p className="text-sm text-foreground/70">
          Resumen de tus postulaciones, estados y resultados de compatibilidad.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border-border/70 bg-card/90">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <span>Total de postulaciones</span>
              <InfoTooltip text="Cantidad total de postulaciones registradas en tu cuenta." />
            </CardDescription>
            <CardTitle className="text-3xl">{totalApplications}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="rounded-2xl border-border/70 bg-card/90">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <span>Aplicaciones evaluadas</span>
              <InfoTooltip text="Postulaciones que ya tienen un resultado de evaluación calculado." />
            </CardDescription>
            <CardTitle className="text-3xl">{evaluatedApplications}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="rounded-2xl border-border/70 bg-card/90">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <span>Promedio de compatibilidad</span>
              <InfoTooltip text="Promedio de la puntuacion general de tus postulaciones evaluadas, expresado en porcentaje." />
            </CardDescription>
            <CardTitle className="text-3xl">{formatPercent(overallAverage)}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="rounded-2xl border-border/70 bg-card/90">
          <CardHeader className="pb-2">
            <CardDescription>Última postulación</CardDescription>
            <CardTitle className="text-lg">
              {latestApplicationDate
                ? latestApplicationDate.toLocaleDateString("es-ES", { dateStyle: "medium" })
                : "-"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="rounded-2xl border-border/70 bg-card/90 xl:col-span-2">
          <CardHeader>
            <CardTitle>Estado de las postulaciones</CardTitle>
            <CardDescription>
              Cantidad de aplicaciones por estado actual.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StatusBarsChart
              data={statusRows.map((statusRow) => ({
                name: statusRow.display_name,
                total: statusRow.count,
              }))}
            />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 bg-card/90">
          <CardHeader>
            <CardTitle>Mejor resultado</CardTitle>
            <CardDescription>
              Tu compatibilidad más alta en una postulación evaluada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-foreground/70">Overall</span>
              <span className="font-semibold">
                {bestApplication ? formatPercent(bestApplication.overall_score * 100) : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground/70">Fecha</span>
              <span className="font-medium">{formatDate(bestApplication?.applied_at)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/70 bg-card/90">
        <CardHeader>
          <CardTitle>Postulaciones por mes</CardTitle>
          <CardDescription>
            Selecciona año para ver la cantidad de postulaciones por mes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StatusMonthlyChart yearlyData={yearlyCounts} years={years} initialYear={currentYear} />
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/70 bg-card/90">
        <CardHeader>
          <CardTitle>Desglose de compatibilidad</CardTitle>
          <CardDescription>
            Promedios de encaje técnico, blando y cultural sobre tus postulaciones evaluadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-foreground/60">Técnica</p>
              <p className="mt-1 text-2xl font-semibold">{formatPercent(technicalAverage)}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-foreground/60">Blanda</p>
              <p className="mt-1 text-2xl font-semibold">{formatPercent(softAverage)}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-foreground/60">Cultura</p>
              <p className="mt-1 text-2xl font-semibold">{formatPercent(cultureAverage)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
