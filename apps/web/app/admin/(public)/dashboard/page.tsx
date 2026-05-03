import path from "node:path"
import { readFile } from "node:fs/promises"
import { headers } from "next/headers"
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "react/components/ui/card"
import InfoTooltip from "react/components/ui/info-tooltip"
import { cn } from "react/lib/utils"
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
        avgMatchScore: number | null
        avgTechnicalScore: number | null
        avgSoftScore: number | null
        avgCultureScore: number | null
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
    actionStrip: {
        pendingReview: number
        atRiskOffers: number
    }
    funnel: {
        stages: { technical_name: string; label: string; count: number; dwell_days: number | null }[]
        avgFirstResponseDays: number | null
    }
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
                avgMatchScore: null,
                avgTechnicalScore: null,
                avgSoftScore: null,
                avgCultureScore: null,
            },
            candidateProgress: [
                { technical_name: "applied", label: "Postulados", count: 0 },
                { technical_name: "pre_screening", label: "Preseleccionados", count: 0 },
                { technical_name: "hired", label: "Contratados", count: 0 },
                { technical_name: "rejected", label: "Rechazados", count: 0 },
            ],
            topOffers: [],
            matchOfTheWeek: null,
            actionStrip: { pendingReview: 0, atRiskOffers: 0 },
            funnel: { stages: [], avgFirstResponseDays: null },
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

    const avgFirstResponseDays = data.funnel?.avgFirstResponseDays ?? null

    const responseDisplay =
        avgFirstResponseDays === null
            ? null
            : avgFirstResponseDays < 1
            ? `${Math.round(avgFirstResponseDays * 24)} h`
            : `${avgFirstResponseDays.toFixed(1)} d`

    const responseLabel =
        avgFirstResponseDays === null ? null
        : avgFirstResponseDays < 2 ? { text: "Excelente", cls: "text-green-600 dark:text-green-400" }
        : avgFirstResponseDays <= 5 ? { text: "Normal", cls: "text-amber-600 dark:text-amber-400" }
        : { text: "Lento", cls: "text-red-600 dark:text-red-400" }

    return (
        <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-semibold tracking-tight">Panel de control de reclutamiento</h1>
            <p className="text-sm text-foreground/70">Resumen operativo.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Link href="/admin/candidatos" className="sm:col-span-2 xl:col-span-2 group">
                <Card className="gradient-border rounded-2xl bg-card/90 shadow-soft h-full transition-shadow group-hover:shadow-md">
                    <CardHeader className="gap-2 pb-2">
                        <CardDescription className="flex items-center gap-1.5 text-xs text-foreground/60">
                            Revisiones pendientes
                            <InfoTooltip text="Postulaciones donde la IA completó su evaluación pero el reclutador aún no ha realizado ninguna acción." />
                        </CardDescription>
                        {data.actionStrip.pendingReview === 0 ? (
                            <div className="flex items-center gap-2 py-1">
                                <CheckCircle2 className="size-5 shrink-0 text-green-500" />
                                <span className="text-base font-medium text-foreground/60">Cola de revisión limpia</span>
                            </div>
                        ) : (
                            <>
                                <CardTitle className={cn(
                                    "text-5xl font-semibold tabular-nums",
                                    data.actionStrip.pendingReview >= 16 ? "text-red-600 dark:text-red-400" :
                                    data.actionStrip.pendingReview >= 6  ? "text-amber-600 dark:text-amber-400" :
                                    ""
                                )}>
                                    {data.actionStrip.pendingReview}
                                </CardTitle>
                                <p className="text-xs text-foreground/60">
                                    postulacion{data.actionStrip.pendingReview !== 1 ? "es" : ""} evaluadas por IA esperando revisión
                                </p>
                            </>
                        )}
                    </CardHeader>
                </Card>
            </Link>

            <Link href="/admin/ofertas?status=published" className="group">
                <Card className="gradient-border rounded-2xl bg-card/90 shadow-soft h-full transition-shadow group-hover:shadow-md">
                    <CardHeader className="gap-2 pb-2">
                        <CardDescription className="flex items-center gap-1.5 text-xs text-foreground/60">
                            Ofertas en riesgo
                            <InfoTooltip text="Ofertas publicadas que llevan más de 14 días sin recibir ninguna postulación." />
                        </CardDescription>
                        <CardTitle className={cn(
                            "text-3xl font-semibold",
                            data.actionStrip.atRiskOffers > 0 ? "text-amber-600 dark:text-amber-400" : ""
                        )}>
                            {data.actionStrip.atRiskOffers}
                        </CardTitle>
                        <p className="text-xs text-foreground/60">
                            {data.actionStrip.atRiskOffers === 0
                                ? "sin riesgo actualmente"
                                : `oferta${data.actionStrip.atRiskOffers !== 1 ? "s" : ""} publicada${data.actionStrip.atRiskOffers !== 1 ? "s" : ""} sin candidatos`
                            }
                        </p>
                    </CardHeader>
                </Card>
            </Link>

            <Card className="gradient-border rounded-2xl bg-card/90 shadow-soft">
                <CardHeader className="gap-2 pb-2">
                    <CardDescription className="flex items-center gap-1.5 text-xs text-foreground/60">
                        Tiempo de respuesta
                        <InfoTooltip text="Promedio de días desde que un candidato postula hasta la primera acción del equipo sobre su aplicación." />
                    </CardDescription>
                    <CardTitle className="text-3xl font-semibold">
                        {responseDisplay ?? "—"}
                    </CardTitle>
                    {responseLabel && (
                        <p className={`text-xs font-medium ${responseLabel.cls}`}>{responseLabel.text}</p>
                    )}
                </CardHeader>
            </Card>

            <Link href="/admin/ofertas?status=published" className="sm:col-span-2 xl:col-span-1 group">
                <Card className="gradient-border rounded-2xl bg-card/90 shadow-soft h-full transition-shadow group-hover:shadow-md">
                    <CardHeader className="gap-2 pb-2">
                        <CardDescription className="flex items-center gap-1.5 text-xs text-foreground/60">
                            Ofertas activas
                            <InfoTooltip text="Número de ofertas de trabajo publicadas actualmente." />
                        </CardDescription>
                        <CardTitle className="text-3xl font-semibold">
                            {data.metrics.activeOffers}
                        </CardTitle>
                        <p className="text-xs text-foreground/60">
                            oferta{data.metrics.activeOffers !== 1 ? "s" : ""} publicada{data.metrics.activeOffers !== 1 ? "s" : ""} en curso
                        </p>
                    </CardHeader>
                </Card>
            </Link>
        </div>

        <div className="flex flex-col gap-4 border-t border-border/40 pt-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="shrink-0">
                <p className="text-sm font-semibold text-foreground/90">Análisis del período</p>
                <p className="text-xs text-foreground/50">Los datos de esta sección responden al rango de fechas seleccionado</p>
            </div>
            <div className="min-w-0">
                <DashboardDateFilters initialFrom={from} initialTo={to} variant="inline" />
            </div>
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
