import Link from "next/link"
import { CheckCircle2, CircleX, Send, UserRoundPlus } from "lucide-react"
import { Badge } from "react/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "react/components/ui/card"
import { Button } from "react/components/ui/button"
import { Input } from "react/components/ui/input"
import { Progress } from "react/components/ui/progress"
import TopOffersChart from "react/components/admin/top-offers-chart"

type DashboardData = {
    metrics: {
        activeOffers: number
        newCandidates: number
        newApplications: number
        culturalAlignment: number
    }
    candidateProgress: {
        label: string
        count: number
    }[]
    topOffers: {
        name: string
        candidates: number
    }[]
}

function getDateRangeMultiplier(from?: string, to?: string) {
    if (!from || !to) {
        return 1
    }

    const start = new Date(from)
    const end = new Date(to)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
        return 1
    }

    const millisecondsDiff = end.getTime() - start.getTime()
    const daysDiff = Math.floor(millisecondsDiff / (1000 * 60 * 60 * 24)) + 1

    if (daysDiff <= 7) {
        return 0.7
    }

    if (daysDiff <= 30) {
        return 1
    }

    if (daysDiff <= 90) {
        return 1.25
    }

    return 1.4
}

async function getDashboardData(from?: string, to?: string): Promise<DashboardData> {
    try {
        const multiplier = getDateRangeMultiplier(from, to)
        const [usersResponse, productsResponse, postsResponse] = await Promise.all([
            fetch("https://dummyjson.com/users?limit=40", { cache: "no-store" }),
            fetch("https://dummyjson.com/products?limit=10", { cache: "no-store" }),
            fetch("https://dummyjson.com/posts?limit=30", { cache: "no-store" }),
        ])

        if (!usersResponse.ok || !productsResponse.ok || !postsResponse.ok) {
            throw new Error("No se pudieron obtener métricas")
        }

        const usersData = (await usersResponse.json()) as {
            users: Array<{ age: number }>
        }
        const productsData = (await productsResponse.json()) as {
            total: number
            products: Array<{ title: string; stock: number; rating: number }>
        }
        const postsData = (await postsResponse.json()) as {
            posts: Array<{ id: number; reactions?: { likes?: number } | number }>
        }

        const activeOffers = Math.max(8, Math.round((productsData.total / 6) * multiplier))
        const newCandidates = Math.max(
            10,
            Math.round(usersData.users.filter((user) => user.age <= 35).length * multiplier)
        )
        const newApplications = Math.max(12, Math.round(postsData.posts.length * 0.9 * multiplier))
        const culturalAlignment = Math.min(98, 70 + (newCandidates % 21))

        const postulados = Math.max(40, Math.round(newCandidates * (1.6 + 0.2 * multiplier)))
        const contactados = Math.round(postulados * 0.63)
        const contratados = Math.round(postulados * 0.22)
        const rechazados = Math.max(1, postulados - contactados - contratados)

        const topOffers = productsData.products.slice(0, 5).map((offer) => ({
            name: offer.title,
            candidates: Math.max(6, Math.round((offer.stock * 0.7 + offer.rating * 10) * multiplier)),
        }))

        return {
            metrics: {
                activeOffers,
                newCandidates,
                newApplications,
                culturalAlignment,
            },
            candidateProgress: [
                { label: "Postulados", count: postulados },
                { label: "Contactados", count: contactados },
                { label: "Contratados", count: contratados },
                { label: "Rechazados", count: rechazados },
            ],
            topOffers,
        }
    } catch {
        return {
            metrics: {
                activeOffers: 12,
                newCandidates: 85,
                newApplications: 31,
                culturalAlignment: 88,
            },
            candidateProgress: [
                { label: "Postulados", count: 125 },
                { label: "Contactados", count: 62 },
                { label: "Contratados", count: 25 },
                { label: "Rechazados", count: 18 },
            ],
            topOffers: [
                { name: "Desarrollador Fullstack", candidates: 18 },
                { name: "Diseñador UX/UI", candidates: 15 },
                { name: "Especialista en Marketing", candidates: 12 },
                { name: "Ejecutivo de Ventas", candidates: 9 },
                { name: "Analista de RRHH", candidates: 7 },
            ],
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

    const data = await getDashboardData(from, to)
    const maxProgressCount = Math.max(...data.candidateProgress.map((item) => item.count), 1)
    const maxTopOfferCandidates = Math.max(...data.topOffers.map((item) => item.candidates), 1)

    const progressIcons = {
        Postulados: UserRoundPlus,
        Contactados: Send,
        Contratados: CheckCircle2,
        Rechazados: CircleX,
    } as const

    return (
        <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2 lg:max-w-2xl">
                <Badge variant="outline" className="w-fit rounded-full border-primary/35 bg-primary/10 text-primary">
                    Panel de reclutamiento
                </Badge>
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Dashboard de Reclutamiento</h1>
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
            <Card className="gradient-border min-h-[120px] rounded-2xl bg-card/90 shadow-soft">
                <CardHeader className="gap-2 pb-2">
                    <CardDescription className="text-xs text-foreground/60">Ofertas nuevas</CardDescription>
                    <CardTitle className="text-3xl font-semibold">{data.metrics.activeOffers}</CardTitle>
                </CardHeader>
            </Card>

            <Card className="gradient-border min-h-[120px] rounded-2xl bg-card/90 shadow-soft">
                <CardHeader className="gap-2 pb-2">
                    <CardDescription className="text-xs text-foreground/60">Nuevos candidatos</CardDescription>
                    <CardTitle className="text-3xl font-semibold">{data.metrics.newCandidates}</CardTitle>
                </CardHeader>
            </Card>

            <Card className="gradient-border min-h-[120px] rounded-2xl bg-card/90 shadow-soft">
                <CardHeader className="gap-2 pb-2">
                    <CardDescription className="text-xs text-foreground/60">Nuevas postulaciones</CardDescription>
                    <CardTitle className="text-3xl font-semibold">{data.metrics.newApplications}</CardTitle>
                </CardHeader>
            </Card>

            <Card className="gradient-border min-h-[120px] rounded-2xl bg-card/90 shadow-soft">
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
                    {data.candidateProgress.map((item) => {
                        const value = (item.count / maxProgressCount) * 100
                        const Icon = progressIcons[item.label as keyof typeof progressIcons] ?? UserRoundPlus
                        return (
                            <div key={item.label} className="rounded-xl border border-border/70 bg-background/85 p-4">
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
        </div>
    )
}
