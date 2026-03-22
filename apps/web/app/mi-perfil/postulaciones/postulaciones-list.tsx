"use client"

import * as React from "react"
import { BriefcaseBusiness, MapPin, Sparkles, Tag, Wallet } from "lucide-react"
import Link from "next/link"

import { Badge } from "react/components/ui/badge"
import { Button } from "react/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "react/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "react/components/ui/select"
import { usePostulacionesFilters } from "./postulaciones-shell"

export type ApplicationStatus = string

export type ApplicationStatusCatalogItem = {
  technical_name: ApplicationStatus
  display_name: string
}

export type JobApplication = {
  id: number
  offer_id: number
  title: string
  category: string
  city: string
  state: string
  position: string
  salary: number
  status: ApplicationStatus
  evaluation_status?: "pending" | "processing" | "completed" | "failed" | null
  applied_at?: string | null
}

type SimilarJob = {
  id: number
  rank: number
  similarity_score: number
  overall_score: number | null
  jobs: {
    id: number
    title: string
    city: string | null
    state: string | null
    position: string | null
    salary: string | null
  } | null
}

type PostulacionesListProps = {
  applications: JobApplication[]
  statusCatalog: ApplicationStatusCatalogItem[]
}

function getStatusBadgeVariant(status: ApplicationStatus) {
  switch (status) {
    case "rejected":
      return "destructive"
    case "applied":
      return "outline"
    case "contacted":
      return "default"
    default:
      return "outline"
  }
}

export default function PostulacionesList({
  applications,
  statusCatalog,
}: PostulacionesListProps) {
  const {
    query,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
  } = usePostulacionesFilters()

  const categories = React.useMemo(() => {
    const unique = new Set(applications.map((item) => item.category))
    return ["all", ...Array.from(unique).sort()]
  }, [applications])

  const filteredApplications = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return applications.filter((application) => {
      const matchesQuery = normalizedQuery
        ? application.title.toLowerCase().includes(normalizedQuery)
        : true
      const matchesStatus =
        statusFilter === "all" ? true : application.status === statusFilter
      const matchesCategory =
        categoryFilter === "all" ? true : application.category === categoryFilter

      return matchesQuery && matchesStatus && matchesCategory
    })
  }, [applications, categoryFilter, query, statusFilter])

  const statusLabelMap = React.useMemo(
    () =>
      new Map(
        statusCatalog.map((statusItem) => [
          statusItem.technical_name,
          statusItem.display_name,
        ])
      ),
    [statusCatalog]
  )

  const [expandedApplicationId, setExpandedApplicationId] = React.useState<number | null>(null)
  const [similarJobsByApplicationId, setSimilarJobsByApplicationId] = React.useState<
    Record<number, SimilarJob[]>
  >({})
  const [loadingSimilarByApplicationId, setLoadingSimilarByApplicationId] = React.useState<
    Record<number, boolean>
  >({})
  const [similarErrorByApplicationId, setSimilarErrorByApplicationId] = React.useState<
    Record<number, string | null>
  >({})

  const loadSimilarJobs = React.useCallback(async (applicationId: number) => {
    setLoadingSimilarByApplicationId((prev) => ({ ...prev, [applicationId]: true }))
    setSimilarErrorByApplicationId((prev) => ({ ...prev, [applicationId]: null }))

    try {
      const response = await fetch(`/api/applications/${applicationId}/similar-jobs`, {
        method: "GET",
        cache: "no-store",
      })

      const payload = (await response.json().catch(() => null)) as
        | SimilarJob[]
        | { message?: string }
        | null

      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && !Array.isArray(payload)
            ? (payload.message ?? "No se pudieron cargar ofertas similares")
            : "No se pudieron cargar ofertas similares"

        setSimilarErrorByApplicationId((prev) => ({ ...prev, [applicationId]: message }))
        return
      }

      setSimilarJobsByApplicationId((prev) => ({
        ...prev,
        [applicationId]: Array.isArray(payload) ? payload.slice(0, 3) : [],
      }))
    } catch {
      setSimilarErrorByApplicationId((prev) => ({
        ...prev,
        [applicationId]: "No se pudieron cargar ofertas similares",
      }))
    } finally {
      setLoadingSimilarByApplicationId((prev) => ({ ...prev, [applicationId]: false }))
    }
  }, [])

  const handleToggleSimilar = React.useCallback(
    async (application: JobApplication) => {
      const nextExpanded = expandedApplicationId === application.id ? null : application.id
      setExpandedApplicationId(nextExpanded)

      if (
        nextExpanded &&
        similarJobsByApplicationId[nextExpanded] === undefined &&
        !loadingSimilarByApplicationId[nextExpanded]
      ) {
        await loadSimilarJobs(nextExpanded)
      }
    },
    [expandedApplicationId, loadSimilarJobs, loadingSimilarByApplicationId, similarJobsByApplicationId]
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="min-w-45 border-border/70 bg-background/70">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category === "all" ? "Todas las categorías" : category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="min-w-45 border-border/70 bg-background/70">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {statusCatalog.map((statusItem) => (
              <SelectItem key={statusItem.technical_name} value={statusItem.technical_name}>
                {statusItem.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filteredApplications.length === 0 ? (
          <Card className="gradient-border col-span-full rounded-3xl bg-card/90 shadow-soft">
            <CardContent className="py-10 text-center text-sm text-foreground/70">
              No se encontraron postulaciones con los filtros actuales.
            </CardContent>
          </Card>
        ) : (
          filteredApplications.map((application) => (
            <Card
              key={application.id}
              className="gradient-border gap-3 rounded-3xl bg-card/90 py-4 shadow-soft"
            >
              <CardHeader className="space-y-1 pb-0">
                <h2 className="text-xl font-semibold text-foreground">
                  {application.title}
                </h2>
              </CardHeader>

              <CardContent className="space-y-2">
                <p className="flex items-center gap-2 text-sm text-foreground/70">
                  <Tag className="size-4" />
                  <span>{application.category}</span>
                </p>
                <p className="flex items-center gap-2 text-sm text-foreground/70">
                  <MapPin className="size-4" />
                  <span>
                    {application.city}, {application.state}
                  </span>
                </p>
                <p className="flex items-center gap-2 text-sm text-foreground/70">
                  <BriefcaseBusiness className="size-4" />
                  <span>{application.position}</span>
                </p>
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Wallet className="size-4" />
                  <span>${application.salary} / mes</span>
                </p>
              </CardContent>

              <CardFooter className="items-center justify-between gap-3 pt-2">
                <Badge
                  variant={getStatusBadgeVariant(application.status)}
                >
                  {statusLabelMap.get(application.status) ?? application.status}
                </Badge>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full border-border/70 bg-background/70"
                    onClick={() => void handleToggleSimilar(application)}
                  >
                    <Sparkles className="size-4" />
                    {expandedApplicationId === application.id ? "Ocultar similares" : "Ver similares"}
                  </Button>

                  <Button asChild size="sm" variant="outline" className="rounded-full border-border/70 bg-background/70">
                    <Link href={`/ofertas/${application.offer_id}`}>Ver más</Link>
                  </Button>
                </div>
              </CardFooter>

              {expandedApplicationId === application.id ? (
                <CardContent className="space-y-3 border-t border-border/60 pt-4">
                  <p className="text-sm font-medium text-foreground">3 ofertas similares para esta postulación</p>

                  {loadingSimilarByApplicationId[application.id] ? (
                    <p className="text-sm text-foreground/70">Buscando ofertas similares...</p>
                  ) : null}

                  {!loadingSimilarByApplicationId[application.id] &&
                  similarErrorByApplicationId[application.id] ? (
                    <p className="text-sm text-destructive">{similarErrorByApplicationId[application.id]}</p>
                  ) : null}

                  {!loadingSimilarByApplicationId[application.id] &&
                  !similarErrorByApplicationId[application.id] &&
                  (similarJobsByApplicationId[application.id]?.length ?? 0) === 0 ? (
                    <p className="text-sm text-foreground/70">
                      {application.evaluation_status === "pending" ||
                      application.evaluation_status === "processing"
                        ? "La evaluación sigue en proceso. Las ofertas similares aparecerán aquí en unos momentos."
                        : "Todavía no hay ofertas similares para esta postulación."}
                    </p>
                  ) : null}

                  {!loadingSimilarByApplicationId[application.id] &&
                  !similarErrorByApplicationId[application.id] &&
                  (similarJobsByApplicationId[application.id]?.length ?? 0) > 0 ? (
                    <div className="space-y-2">
                      {(similarJobsByApplicationId[application.id] ?? []).map((similarJob) => (
                        <div
                          key={similarJob.id}
                          className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/60 p-3 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-foreground">
                              #{similarJob.rank} {similarJob.jobs?.title ?? "Oferta similar"}
                            </p>
                            <p className="text-xs text-foreground/70">
                              Similitud: {(similarJob.similarity_score * 100).toFixed(1)}%
                              {typeof similarJob.overall_score === "number"
                                ? ` · Match total: ${(similarJob.overall_score * 100).toFixed(1)}%`
                                : ""}
                            </p>
                          </div>

                          {similarJob.jobs?.id ? (
                            <Button asChild size="sm" variant="secondary" className="rounded-full">
                              <Link href={`/ofertas/${similarJob.jobs.id}`}>Ver oferta</Link>
                            </Button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              ) : null}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
