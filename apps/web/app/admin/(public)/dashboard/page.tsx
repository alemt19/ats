import path from "node:path"
import { readFile } from "node:fs/promises"
import { headers } from "next/headers"
import { Badge } from "react/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "react/components/ui/card"
import DashboardDateFilters from "./dashboard-date-filters"
import TopOffersChart from "react/components/admin/top-offers-chart"
import CandidateProgressChart from "react/components/admin/candidate-progress-chart"
import MatchOfTheWeek from "react/components/admin/dashboard/match-of-the-week"
import FeedbackStatsCard from "react/components/admin/dashboard/feedback-stats-card"

type FeedbackStats = {
    employer: {
        avg_overall: number
        avg_process: number
        avg_match_accuracy: number
        count: number
    } | null
    candidate: {
        avg_overall: number
        avg_process: number
        count: number
    } | null
}

type MatchOfTheWeekData = {
    candidateName: string
    jobTitle: string
    overallScore: number
    technicalScore: number
    softScore: number
    cultureScore: number
    weightTechnical: number
    weightSoft: number
    weightCulture: number
    createdAt: string
} | null

type DashboardData = {
    metrics: {
        activeOffers: number
        newCandidates: number
        newApplications: number
        culturalAlignment: number
    }
    candidateProgress: {
        technical_name?: string
        label: string
        count: number
    }[]
    topOffers: {
        name: string
        candidates: number
    }[]
    matchOfTheWeek?: MatchOfTheWeekData
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

async function getFeedbackStats(cookie: string): Promise<FeedbackStats> {
    const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

    try {
        const response = await fetch(`${apiBaseUrl}/api/applications/admin/feedback-stats`, {
            method: "GET",
            headers: cookie ? { cookie } : undefined,
            cache: "no-store",
        })

        if (!response.ok) return { employer: null, candidate: null }

        const payload = (await response.json().catch(() => null)) as
            | FeedbackStats
            | { data?: FeedbackStats }
            | null

        if (payload && typeof payload === "object" && "data" in payload) {
            return payload.data ?? { employer: null, candidate: null }
        }

        if (payload && typeof payload === "object" && "employer" in payload && "candidate" in payload) {
            return payload as FeedbackStats
        }

        return { employer: null, candidate: null }
    } catch {
        return { employer: null, candidate: null }
    }
}

async function getDashboardData(from?: string, to?: string): Promise<DashboardData> {
    const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"
    const cookie = (await headers()).get("cookie") ?? ""

    const params = new URLSearchParams()
    if (from) params.set("from", from)
    if (to) params.set("to", to)

    const endpoint = `${apiBaseUrl}/api/admin/dashboard${params.toString() ? `?${params.toString()}` : ""}`

    try {
        const response = await fetch(endpoint, {
            method: "GET",
            headers: {
                ...(cookie ? { cookie } : {}),
            },
            cache: "no-store",
        })

        if (!response.ok) {
            throw new Error("No se pudo obtener el dashboard")
        }

        const payload = (await response.json().catch(() => null)) as
            | DashboardData
            | { data?: DashboardData }
            | null

        const data = payload && typeof payload === "object" && "data" in payload ? payload.data : payload

        if (!data) {
            throw new Error("Payload inválido")
        }

        return data as DashboardData
    } catch {
        return {
            metrics: {
                activeOffers: 0,
                newCandidates: 0,
                newApplications: 0,
                culturalAlignment: 0,
            },
            candidateProgress: [
                { technical_name: "applied", label: "Postulados", count: 0 },
                { technical_name: "pre_screening", label: "Preseleccionados", count: 0 },
                { technical_name: "hired", label: "Contratados", count: 0 },
                { technical_name: "rejected", label: "Rechazados", count: 0 },
            ],
            topOffers: [],
            matchOfTheWeek: null,
        }
    }
}

type DashboardPageProps = {
    searchParams?: Promise<{
        from?: string | string[]
        to?: string | string[]
    }>
}

export default async function AdminDashboardPage({ searchParams }: DashboardPageProps) {
    const params = await searchParams
    const from = Array.isArray(params?.from) ? params?.from[0] : params?.from
    const to = Array.isArray(params?.to) ? params?.to[0] : params?.to
    const cookie = (await headers()).get("cookie") ?? ""

    const [data, statusCatalogRaw, feedbackStats] = await Promise.all([
        getDashboardData(from, to),
        readJsonFile<RawStatusCatalogItem[]>("application_status.json").catch(() => []),
        getFeedbackStats(cookie),
    ])

    const normalizedStatusCatalog = normalizeStatusCatalog(statusCatalogRaw)
    const progressCountByStatus = new Map(
        data.candidateProgress.map((item) => [item.technical_name ?? "", item.count])
    )

    const candidateProgress = normalizedStatusCatalog.map((status) => ({
        technical_name: status.technical_name,
        label: status.display_name,
        count: progressCountByStatus.get(status.technical_name) ?? 0,
    }))

    const maxTopOfferCandidates = Math.max(...data.topOffers.map((item) => item.candidates), 1)

    return (
        <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2 lg:max-w-2xl">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Panel de control de reclutamiento</h1>
                    <p className="text-sm text-foreground/70">Resumen operativo.</p>
                </div>
            </div>

            <DashboardDateFilters initialFrom={from} initialTo={to} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="gradient-border min-h-30 rounded-2xl bg-card/90 shadow-soft">
                <CardHeader className="gap-2 pb-2">
                    <CardDescription className="text-xs text-foreground/60">Ofertas nuevas</CardDescription>
                    <CardTitle className="text-3xl font-semibold">{data.metrics.activeOffers}</CardTitle>
                </CardHeader>
            </Card>

            <Card className="gradient-border min-h-30 rounded-2xl bg-card/90 shadow-soft">
                <CardHeader className="gap-2 pb-2">
                    <CardDescription className="text-xs text-foreground/60">Nuevos candidatos</CardDescription>
                    <CardTitle className="text-3xl font-semibold">{data.metrics.newCandidates}</CardTitle>
                </CardHeader>
            </Card>

            <Card className="gradient-border min-h-30 rounded-2xl bg-card/90 shadow-soft">
                <CardHeader className="gap-2 pb-2">
                    <CardDescription className="text-xs text-foreground/60">Nuevas postulaciones</CardDescription>
                    <CardTitle className="text-3xl font-semibold">{data.metrics.newApplications}</CardTitle>
                </CardHeader>
            </Card>

            <Card className="gradient-border min-h-30 rounded-2xl bg-card/90 shadow-soft">
                <CardHeader className="gap-2 pb-2">
                    <CardDescription className="line-clamp-2 text-xs text-foreground/60">
                        Tasa de alineación cultural promedio
                    </CardDescription>
                    <CardTitle className="text-3xl font-semibold">{data.metrics.culturalAlignment}%</CardTitle>
                </CardHeader>
            </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
            <Card className="gradient-border rounded-2xl bg-card/90 shadow-soft lg:col-span-2">
                <CardHeader>
                    <CardTitle>Progreso de candidatos</CardTitle>
                </CardHeader>
                <CardContent>
                    <CandidateProgressChart data={candidateProgress} />
                </CardContent>
            </Card>

            <Card className="gradient-border rounded-2xl bg-card/90 shadow-soft">
                <CardHeader>
                    <CardTitle>Mejor aplicación de la semana</CardTitle>
                    <CardDescription className="text-xs text-foreground/60">
                        Candidato con mayor puntuación en los últimos 7 días
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <MatchOfTheWeek data={data.matchOfTheWeek ?? null} />
                </CardContent>
            </Card>
        </div>

            <Card className="gradient-border rounded-2xl bg-card/90 shadow-soft">
                <CardHeader>
                    <CardTitle>Top 5 de ofertas laborales con más candidatos</CardTitle>
                </CardHeader>
                <CardContent>
                    <TopOffersChart data={data.topOffers} maxCandidates={maxTopOfferCandidates} />
                </CardContent>
            </Card>

            <Card className="gradient-border rounded-2xl bg-card/90 shadow-soft">
                <CardHeader>
                    <CardTitle>Satisfacción del proceso de selección</CardTitle>
                    <CardDescription className="text-xs text-foreground/60">
                        Promedio de calificaciones post-contratación recopiladas de empleadores y candidatos
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <FeedbackStatsCard feedbackStats={feedbackStats} />
                </CardContent>
            </Card>
        </div>
    )
}
