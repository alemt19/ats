import Link from "next/link"
import path from "node:path"
import { readFile } from "node:fs/promises"
import { headers } from "next/headers"
import { CheckCircle2, CircleX, Send, Star, UserRoundPlus } from "lucide-react"
import { Badge } from "react/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "react/components/ui/card"
import { Button } from "react/components/ui/button"
import { Input } from "react/components/ui/input"
import { Progress } from "react/components/ui/progress"
import TopOffersChart from "react/components/admin/top-offers-chart"

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
        const stats = payload && typeof payload === "object" && "data" in payload ? payload.data : payload
        return stats ?? { employer: null, candidate: null }
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
                { technical_name: "contacted", label: "Contactados", count: 0 },
                { technical_name: "hired", label: "Contratados", count: 0 },
                { technical_name: "rejected", label: "Rechazados", count: 0 },
            ],
            topOffers: [],
        }
    }
}

function FeedbackStatRow({ label, value }: { label: string; value: number | null | undefined }) {
    const rating = value ?? 0
    const pct = Math.round((rating / 5) * 100)
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
                <span className="text-foreground/70">{label}</span>
                <span className="font-medium tabular-nums">{rating > 0 ? `${rating.toFixed(1)} / 5` : "—"}</span>
            </div>
            <Progress value={pct} className="h-1.5" />
        </div>
    )
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

    const maxProgressCount = Math.max(...candidateProgress.map((item) => item.count), 1)
    const maxTopOfferCandidates = Math.max(...data.topOffers.map((item) => item.candidates), 1)

    const progressIcons = {
        applied: UserRoundPlus,
        pre_screening: Send,
        hired: CheckCircle2,
        rejected: CircleX,
    } as const

    return (
        <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2 lg:max-w-2xl">
                <Badge variant="outline" className="w-fit rounded-full border-primary/35 bg-primary/10 text-primary">
                    Panel de reclutamiento
                </Badge>
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Panel de control de reclutamiento</h1>
                    <p className="text-sm text-foreground/70">Resumen operativo y estado del funnel.</p>
                </div>
            </div>

            <form
                className="w-full max-w-2xl grid grid-cols-1 items-end gap-3 rounded-2xl border border-border/70 bg-card/80 p-3 shadow-soft sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]"
                method="GET"
            >
                <div className="space-y-1">
                    <label htmlFor="from" className="text-xs font-medium text-foreground/70">Fecha inicial</label>
                    <Input id="from" name="from" type="date" defaultValue={from} />
                </div>
                <div className="space-y-1">
                    <label htmlFor="to" className="text-xs font-medium text-foreground/70">Fecha final</label>
                    <Input id="to" name="to" type="date" defaultValue={to} />
                </div>
                <div className="flex gap-2">
                    <Button type="submit" className="rounded-full">Aplicar</Button>
                    <Button
                        variant="outline"
                        asChild
                        className="rounded-full border-border/70 bg-background/70 text-foreground/80 hover:border-primary/40"
                    >
                        <Link href="/admin/dashboard">Limpiar</Link>
                    </Button>
                </div>
            </form>
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

        <div className="space-y-4">
            <Card className="gradient-border rounded-2xl bg-card/90 shadow-soft">
                <CardHeader>
                    <CardTitle>Progreso de candidatos</CardTitle>
                </CardHeader>
                <CardContent className="w-full space-y-4">
                    {candidateProgress.map((item) => {
                        const value = (item.count / maxProgressCount) * 100
                        const Icon = progressIcons[item.technical_name as keyof typeof progressIcons] ?? UserRoundPlus
                        return (
                            <div key={item.technical_name} className="rounded-xl border border-border/70 bg-background/85 p-4">
                                <div className="grid grid-cols-[1fr_auto] items-center gap-4 text-sm">
                                    <span className="flex items-center gap-2 text-foreground/80">
                                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/70">
                                            <Icon aria-hidden="true" className="size-4" />
                                        </span>
                                        {item.label}
                                    </span>
                                    <span className="text-foreground/70 tabular-nums">{item.count}</span>
                                </div>
                                <Progress value={value} className="mt-3 h-2" />
                            </div>
                        )
                    })}
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
                    {!feedbackStats.employer && !feedbackStats.candidate ? (
                        <p className="text-sm text-foreground/60">
                            Aún no hay calificaciones registradas. Aparecerán aquí cuando empleadores y candidatos completen sus evaluaciones post-contratación.
                        </p>
                    ) : (
                        <div className="grid gap-6 sm:grid-cols-2">
                            {feedbackStats.employer && (
                                <div className="space-y-4 rounded-xl border border-border/70 bg-background/85 p-5">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                                            <Star aria-hidden="true" className="size-4 text-primary" />
                                        </span>
                                        <div>
                                            <p className="text-sm font-semibold">Empleadores</p>
                                            <p className="text-xs text-foreground/60">{feedbackStats.employer.count} evaluaciones</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <FeedbackStatRow label="Satisfacción general" value={feedbackStats.employer.avg_overall} />
                                        <FeedbackStatRow label="Precisión del matching IA" value={feedbackStats.employer.avg_match_accuracy} />
                                        <FeedbackStatRow label="Eficiencia del proceso" value={feedbackStats.employer.avg_process} />
                                    </div>
                                </div>
                            )}
                            {feedbackStats.candidate && (
                                <div className="space-y-4 rounded-xl border border-border/70 bg-background/85 p-5">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10">
                                            <Star aria-hidden="true" className="size-4 text-amber-500" />
                                        </span>
                                        <div>
                                            <p className="text-sm font-semibold">Candidatos</p>
                                            <p className="text-xs text-foreground/60">{feedbackStats.candidate.count} evaluaciones</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <FeedbackStatRow label="Satisfacción general" value={feedbackStats.candidate.avg_overall} />
                                        <FeedbackStatRow label="Transparencia del proceso" value={feedbackStats.candidate.avg_process} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
