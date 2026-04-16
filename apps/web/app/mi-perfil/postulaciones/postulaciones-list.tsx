"use client"

import * as React from "react"
import { BriefcaseBusiness, Info, Loader2, MapPin, Sparkles, Tag, Wallet } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "react/components/ui/badge"
import { Button } from "react/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "react/components/ui/card"
import { Skeleton } from "react/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "react/components/ui/select"
import { StarRating } from "react/components/ui/star-rating"
import { Textarea } from "react/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "react/components/ui/tooltip"
import { trackUxEvent } from "react/lib/analytics-events"
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
  overall_score?: number | null
  match_technical_score?: number | null
  match_soft_score?: number | null
  match_culture_score?: number | null
}

type SimilarJob = {
  id: number
  rank: number
  similarity_score: number
  match_technical_score?: number | null
  match_soft_score?: number | null
  match_culture_score?: number | null
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

function getEvaluationLabel(status: JobApplication["evaluation_status"]) {
  switch (status) {
    case "completed":
      return "Evaluación completada"
    case "processing":
      return "Evaluación en proceso"
    case "failed":
      return "Evaluación con error"
    case "pending":
    default:
      return "Evaluación pendiente"
  }
}

function canOpenSimilarJobs(status: JobApplication["evaluation_status"]) {
  return status === "completed" || status === "failed"
}

function getSimilarJobsCtaHint(status: JobApplication["evaluation_status"]) {
  if (status === "pending") {
    return "Tus recomendaciones se habilitan cuando termine el análisis inicial."
  }

  if (status === "processing") {
    return "Estamos procesando tu evaluación. Podrás ver similares al completar este paso."
  }

  if (status === "failed") {
    return "Ocurrió un problema temporal con el análisis. Puedes reintentar cargar similares."
  }

  return null
}

function formatRatioScore(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-"
  }

  return `${Math.max(0, Math.min(100, value * 100)).toFixed(1)}%`
}

function buildRecommendationReasons(application: JobApplication, similarJob: SimilarJob) {
  const reasons: string[] = []

  if (typeof similarJob.overall_score === "number" && similarJob.overall_score >= 0.75) {
    reasons.push("Alto encaje general con tu perfil")
  }

  if (
    typeof similarJob.match_technical_score === "number" &&
    similarJob.match_technical_score >= 0.7
  ) {
    reasons.push("Buena afinidad tecnica")
  }

  if (
    typeof similarJob.match_culture_score === "number" &&
    similarJob.match_culture_score >= 0.7
  ) {
    reasons.push("Buena afinidad cultural")
  }

  if (
    similarJob.jobs?.city &&
    similarJob.jobs?.state &&
    similarJob.jobs.city.toLowerCase() === application.city.toLowerCase() &&
    similarJob.jobs.state.toLowerCase() === application.state.toLowerCase()
  ) {
    reasons.push("Misma ubicación que tu postulación actual")
  }

  if (reasons.length === 0) {
    reasons.push("Relación semántica con la oferta a la que aplicaste")
  }

  return reasons.slice(0, 3)
}

type CandidateFeedbackSectionProps = {
  applicationId: number
}

function CandidateFeedbackSection({ applicationId }: CandidateFeedbackSectionProps) {
  const [overallRating, setOverallRating] = React.useState(0)
  const [processRating, setProcessRating] = React.useState(0)
  const [comments, setComments] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)

  React.useEffect(() => {
    fetch(`/api/applications/${applicationId}/feedback`)
      .then((res) => res.json())
      .then((data: { candidate?: { overall_rating: number } | null }) => {
        if (data?.candidate) {
          setSubmitted(true)
        }
      })
      .catch(() => null)
  }, [applicationId])

  const handleSubmit = async () => {
    if (overallRating === 0) {
      toast.error("La calificación general es obligatoria")
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch(`/api/applications/${applicationId}/feedback`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          overall_rating: overallRating,
          process_rating: processRating > 0 ? processRating : undefined,
          comments: comments.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(payload?.message ?? "No se pudo guardar el feedback")
      }

      setSubmitted(true)
      toast.success("¡Gracias por tu feedback!")
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar el feedback"
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-border/60 bg-background/60 p-3 text-sm text-foreground/70">
        ¡Gracias por compartir tu experiencia!
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-background/60 p-3">
      <p className="text-sm font-medium">¿Cómo fue tu experiencia en este proceso?</p>
      <StarRating
        label="Experiencia general *"
        value={overallRating}
        onChange={setOverallRating}
        size="sm"
      />
      <StarRating
        label="Transparencia del proceso"
        value={processRating}
        onChange={setProcessRating}
        size="sm"
      />
      <Textarea
        placeholder="Comentarios opcionales..."
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        maxLength={1000}
        rows={2}
        className="text-sm"
      />
      <Button
        size="sm"
        className="w-full rounded-full"
        onClick={handleSubmit}
        disabled={isSaving || overallRating === 0}
      >
        {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
        Enviar feedback
      </Button>
    </div>
  )
}

function SimilarJobsSkeleton() {
  const items = Array.from({ length: 3 })

  return (
    <div className="space-y-2">
      {items.map((_, index) => (
        <div
          key={`similar-skeleton-${index}`}
          className="rounded-xl border border-border/60 bg-background/60 p-3"
        >
          <Skeleton className="h-4 w-44" />
          <Skeleton className="mt-2 h-3 w-56" />
          <div className="mt-2 flex gap-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-28" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function PostulacionesList({
  applications,
  statusCatalog,
}: PostulacionesListProps) {
  const searchParams = useSearchParams()
  const {
    query,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
  } = usePostulacionesFilters()

  const categories = React.useMemo(() => {
    const normalizedCategories = applications
      .map((item) => String(item.category ?? "").trim())
      .filter((value) => value.length > 0)

    const unique = new Set(normalizedCategories)
    return ["all", ...Array.from(unique).sort()]
  }, [applications])

  const safeStatusCatalog = React.useMemo(
    () =>
      statusCatalog.filter(
        (statusItem) => String(statusItem.technical_name ?? "").trim().length > 0
      ),
    [statusCatalog]
  )

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
      if (!canOpenSimilarJobs(application.evaluation_status)) {
        return
      }

      const nextExpanded = expandedApplicationId === application.id ? null : application.id
      setExpandedApplicationId(nextExpanded)

      if (
        nextExpanded &&
        similarJobsByApplicationId[nextExpanded] === undefined &&
        !loadingSimilarByApplicationId[nextExpanded]
      ) {
        trackUxEvent("open_similar_block", {
          applicationId: nextExpanded,
          evaluationStatus: application.evaluation_status ?? null,
        })
        await loadSimilarJobs(nextExpanded)
      }
    },
    [expandedApplicationId, loadSimilarJobs, loadingSimilarByApplicationId, similarJobsByApplicationId]
  )

  React.useEffect(() => {
    const openSimilarParam = searchParams.get("openSimilar")
    const parsed = Number(openSimilarParam)

    if (!openSimilarParam || !Number.isFinite(parsed) || parsed <= 0) {
      return
    }

    if (!applications.some((application) => application.id === parsed)) {
      return
    }

    const targetApplication = applications.find((application) => application.id === parsed)
    if (!targetApplication || !canOpenSimilarJobs(targetApplication.evaluation_status)) {
      return
    }

    setExpandedApplicationId(parsed)

    if (
      similarJobsByApplicationId[parsed] === undefined &&
      !loadingSimilarByApplicationId[parsed]
    ) {
      void loadSimilarJobs(parsed)
    }
  }, [
    applications,
    loadSimilarJobs,
    loadingSimilarByApplicationId,
    searchParams,
    similarJobsByApplicationId,
  ])

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
            {safeStatusCatalog.map((statusItem) => (
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
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="text-muted-foreground transition-colors hover:text-foreground"
                          aria-label="Informacion del salario"
                        >
                          <Info className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Salario referencial calculado a la tasa del BCV.</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </p>

                <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                  <p className="text-xs text-foreground/70">{getEvaluationLabel(application.evaluation_status)}</p>
                  <p className="text-sm font-semibold text-foreground">
                    Compatibilidad general: {formatRatioScore(application.overall_score)}
                  </p>
                </div>
              </CardContent>

              <CardFooter className="items-center justify-between gap-3 pt-2">
                <Badge
                  variant={getStatusBadgeVariant(application.status)}
                >
                  {statusLabelMap.get(application.status) ?? application.status}
                </Badge>

                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full border-border/70 bg-background/70"
                      onClick={() => void handleToggleSimilar(application)}
                      disabled={!canOpenSimilarJobs(application.evaluation_status)}
                      title={getSimilarJobsCtaHint(application.evaluation_status) ?? undefined}
                    >
                      <Sparkles className="size-4" />
                      {expandedApplicationId === application.id ? "Ocultar similares" : "Ver similares"}
                    </Button>

                    <Button asChild size="sm" variant="outline" className="rounded-full border-border/70 bg-background/70">
                      <Link href={`/ofertas/${application.offer_id}`}>Ver más</Link>
                    </Button>
                  </div>

                  {getSimilarJobsCtaHint(application.evaluation_status) ? (
                    <p className="max-w-65 text-right text-xs text-foreground/60">
                      {getSimilarJobsCtaHint(application.evaluation_status)}
                    </p>
                  ) : null}
                </div>
              </CardFooter>

              {application.status === "hired" && (
                <CardContent className="border-t border-border/60 pt-4">
                  <CandidateFeedbackSection applicationId={application.id} />
                </CardContent>
              )}

              {expandedApplicationId === application.id ? (
                <CardContent className="space-y-3 border-t border-border/60 pt-4">
                  <p className="text-sm font-medium text-foreground">3 ofertas similares para esta postulación</p>

                  {loadingSimilarByApplicationId[application.id] ? (
                    <SimilarJobsSkeleton />
                  ) : null}

                  {!loadingSimilarByApplicationId[application.id] &&
                  similarErrorByApplicationId[application.id] ? (
                    <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                      <p className="text-sm text-destructive">{similarErrorByApplicationId[application.id]}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => {
                          trackUxEvent("retry_similar_load", {
                            applicationId: application.id,
                          })
                          void loadSimilarJobs(application.id)
                        }}
                      >
                        Reintentar
                      </Button>
                    </div>
                  ) : null}

                  {!loadingSimilarByApplicationId[application.id] &&
                  !similarErrorByApplicationId[application.id] &&
                  (similarJobsByApplicationId[application.id]?.length ?? 0) === 0 ? (
                    <div className="space-y-2 rounded-xl border border-border/60 bg-background/60 p-3">
                      <p className="text-sm text-foreground/70">
                        {application.evaluation_status === "pending" ||
                        application.evaluation_status === "processing"
                          ? "La evaluación sigue en proceso. Las ofertas similares aparecerán aquí en unos momentos."
                          : "Todavía no hay ofertas similares para esta postulación."}
                      </p>
                      {application.evaluation_status === "completed" ? (
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="outline" className="rounded-full">
                            <Link href="/mi-perfil/competencias-valores">Mejorar mi perfil</Link>
                          </Button>
                          <Button asChild size="sm" variant="outline" className="rounded-full">
                            <Link href="/ofertas">Explorar ofertas recientes</Link>
                          </Button>
                        </div>
                      ) : null}
                    </div>
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
                              Similitud entre ofertas: {(similarJob.similarity_score * 100).toFixed(1)}%
                              {typeof similarJob.overall_score === "number"
                                ? ` · Compatibilidad con tu perfil: ${(similarJob.overall_score * 100).toFixed(1)}%`
                                : ""}
                            </p>

                            <div className="flex flex-wrap gap-1 pt-1">
                              {buildRecommendationReasons(application, similarJob).map((reason) => (
                                <Badge key={`${similarJob.id}-${reason}`} variant="outline" className="text-[11px]">
                                  {reason}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {similarJob.jobs?.id ? (
                            <Button asChild size="sm" variant="secondary" className="rounded-full">
                              <Link
                                href={`/ofertas/${similarJob.jobs.id}?returnTo=postulaciones&openSimilar=${application.id}`}
                                onClick={() => {
                                  trackUxEvent("click_similar_detail", {
                                    applicationId: application.id,
                                    similarJobId: similarJob.id,
                                    offerId: similarJob.jobs?.id ?? null,
                                  })
                                }}
                              >
                                Ver oferta
                              </Link>
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
