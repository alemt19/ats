import Link from "next/link"
import { CheckCircle2, CircleX, Send, UserRoundPlus } from "lucide-react"
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
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Dashboard de Reclutamiento</h1>
                    <p className="text-sm text-muted-foreground">Bienvenido, Reclutador</p>
                </div>

                <form className="grid grid-cols-1 items-end gap-2 sm:grid-cols-2 lg:grid-cols-[auto_auto_auto]" method="GET">
                    <div className="space-y-1">
                        <label htmlFor="from" className="text-xs text-muted-foreground">Fecha inicial</label>
                        <Input id="from" name="from" type="date" defaultValue={from} />
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="to" className="text-xs text-muted-foreground">Fecha final</label>
                        <Input id="to" name="to" type="date" defaultValue={to} />
                    </div>
                    <div className="flex gap-2">
                        <Button type="submit">Aplicar</Button>
                        <Button variant="outline" asChild>
                            <Link href="/admin/dashboard">Limpiar</Link>
                        </Button>
                    </div>
                </form>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card>
                    <CardHeader className="gap-1 pb-0">
                        <CardDescription>Ofertas activas</CardDescription>
                        <CardTitle className="text-3xl">{data.metrics.activeOffers}</CardTitle>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="gap-1 pb-0">
                        <CardDescription>Nuevos candidatos</CardDescription>
                        <CardTitle className="text-3xl">{data.metrics.newCandidates}</CardTitle>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="gap-1 pb-0">
                        <CardDescription>Cantidad nueva de postulaciones</CardDescription>
                        <CardTitle className="text-3xl">{data.metrics.newApplications}</CardTitle>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="gap-1 pb-0">
                        <CardDescription>Tasa de alineación cultural promedio</CardDescription>
                        <CardTitle className="text-3xl">{data.metrics.culturalAlignment}%</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <div className="gap-4 mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>Progreso de Candidatos</CardTitle>
                    </CardHeader>
                    <CardContent className="w-full  space-y-4">
                        {data.candidateProgress.map((item) => {
                            const value = (item.count / maxProgressCount) * 100
                            const Icon = progressIcons[item.label as keyof typeof progressIcons] ?? UserRoundPlus
                            return (
                                <div key={item.label} className="space-y-1.5">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2">
                                            <span className="bg-muted flex h-6 w-6 items-center justify-center rounded-md">
                                                <Icon className="size-4" />
                                            </span>
                                            {item.label}
                                        </span>
                                        <span className="text-muted-foreground">{item.count}</span>
                                    </div>
                                    <Progress value={value} />
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>


            </div>
            <Card>
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