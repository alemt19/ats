
"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  RefreshCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

import CrearOfertaForm, {
  type CrearOfertaCatalogs,
  type CrearOfertaFormValues,
} from "../crear/crear-oferta-form"
import { buildOfferCandidatesReportPdf } from "./offer-candidates-report"
import { useSetBreadcrumbTitle } from "react/contexts/breadcrumb-title-context"
import {
  type AdminOfferCandidatesQueryParams,
  type AdminOfferCandidatesResponse,
  type AdminOfferDetail,
  type CandidateStatusOption,
  normalizeAdminOfferCandidatesQuery,
} from "./offer-detail-admin-types"
import { Badge } from "react/components/ui/badge"
import { Button } from "react/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "react/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "react/components/ui/dialog"
import { Input } from "react/components/ui/input"
import { Label } from "react/components/ui/label"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "react/components/ui/pagination"
import { Progress } from "react/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "react/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "react/components/ui/sheet"
import { Skeleton } from "react/components/ui/skeleton"
import { Slider } from "react/components/ui/slider"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "react/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "react/components/ui/tabs"
import { cn } from "react/lib/utils"

type CompanyConfigBranding = {
  name: string
  logo: string
}

type OfertaAdminDetalleClientProps = {
  offerId: number
  offer: AdminOfferDetail
  statusDisplayName: string
  formCatalogs: CrearOfertaCatalogs
  candidateStatusOptions: CandidateStatusOption[]
  initialCandidatesQuery: AdminOfferCandidatesQueryParams
  initialCandidatesData: AdminOfferCandidatesResponse
  companyConfig: CompanyConfigBranding
}

function offerStatusBadgeVariant(status: string): "outline" | "success" | "destructive" | "secondary" {
  switch (status) {
    case "published":
      return "success"
    case "closed":
      return "destructive"
    case "archived":
      return "secondary"
    case "draft":
    default:
      return "outline"
  }
}

function candidateStatusBadgeVariant(status: string): "outline" | "success" | "destructive" | "secondary" {
  switch (status) {
    case "hired":
      return "success"
    case "rejected":
      return "destructive"
    case "contacted":
      return "secondary"
    case "applied":
    default:
      return "outline"
  }
}

function formatPublishedDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible"
  }

  return new Intl.DateTimeFormat("es-VE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}

function CandidateRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <TableRow key={`candidate-row-skeleton-${index}`}>
          <TableCell>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-2 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-2 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-2 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-2 w-32" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="ml-auto h-8 w-8" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

function getProgressColorClass(value: number) {
  if (value <= 50) {
    return "[&_[data-slot=progress-indicator]]:bg-red-500"
  }

  if (value <= 75) {
    return "[&_[data-slot=progress-indicator]]:bg-yellow-500"
  }

  return "[&_[data-slot=progress-indicator]]:bg-green-500"
}

type ScoreRange = [number, number]

type ReportScoreFilters = {
  technical: ScoreRange
  soft: ScoreRange
  culture: ScoreRange
  final: ScoreRange
}

function buildReportScoreFiltersFromQuery(query: AdminOfferCandidatesQueryParams): ReportScoreFilters {
  return {
    technical: [query.technical_min, query.technical_max],
    soft: [query.soft_min, query.soft_max],
    culture: [query.culture_min, query.culture_max],
    final: [query.final_min, query.final_max],
  }
}

function formatScoreRange(range: ScoreRange) {
  return `${range[0]}% - ${range[1]}%`
}

function ScoreRangeControls({
  technicalRange,
  softRange,
  cultureRange,
  finalRange,
  onTechnicalRangeChange,
  onSoftRangeChange,
  onCultureRangeChange,
  onFinalRangeChange,
}: {
  technicalRange: ScoreRange
  softRange: ScoreRange
  cultureRange: ScoreRange
  finalRange: ScoreRange
  onTechnicalRangeChange: (range: ScoreRange) => void
  onSoftRangeChange: (range: ScoreRange) => void
  onCultureRangeChange: (range: ScoreRange) => void
  onFinalRangeChange: (range: ScoreRange) => void
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Puntuación técnica</Label>
        <Slider
          min={0}
          max={100}
          step={1}
          value={technicalRange}
          onValueChange={(value) => onTechnicalRangeChange([value[0] ?? 0, value[1] ?? 100])}
          onValueCommit={(value) => onTechnicalRangeChange([value[0] ?? 0, value[1] ?? 100])}
        />
        <div className="text-muted-foreground flex justify-between text-sm">
          <span>{technicalRange[0]}%</span>
          <span>{technicalRange[1]}%</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Puntuación de habilidades blandas</Label>
        <Slider
          min={0}
          max={100}
          step={1}
          value={softRange}
          onValueChange={(value) => onSoftRangeChange([value[0] ?? 0, value[1] ?? 100])}
          onValueCommit={(value) => onSoftRangeChange([value[0] ?? 0, value[1] ?? 100])}
        />
        <div className="text-muted-foreground flex justify-between text-sm">
          <span>{softRange[0]}%</span>
          <span>{softRange[1]}%</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Puntuación de alineación cultural</Label>
        <Slider
          min={0}
          max={100}
          step={1}
          value={cultureRange}
          onValueChange={(value) => onCultureRangeChange([value[0] ?? 0, value[1] ?? 100])}
          onValueCommit={(value) => onCultureRangeChange([value[0] ?? 0, value[1] ?? 100])}
        />
        <div className="text-muted-foreground flex justify-between text-sm">
          <span>{cultureRange[0]}%</span>
          <span>{cultureRange[1]}%</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Puntuación final</Label>
        <Slider
          min={0}
          max={100}
          step={1}
          value={finalRange}
          onValueChange={(value) => onFinalRangeChange([value[0] ?? 0, value[1] ?? 100])}
          onValueCommit={(value) => onFinalRangeChange([value[0] ?? 0, value[1] ?? 100])}
        />
        <div className="text-muted-foreground flex justify-between text-sm">
          <span>{finalRange[0]}%</span>
          <span>{finalRange[1]}%</span>
        </div>
      </div>
    </div>
  )
}

function ScoreFilterPanel({
  query,
  statusOptions,
  onTechnicalRangeChange,
  onSoftRangeChange,
  onCultureRangeChange,
  onFinalRangeChange,
  onStatusChange,
  onClear,
}: {
  query: AdminOfferCandidatesQueryParams
  statusOptions: CandidateStatusOption[]
  onTechnicalRangeChange: (range: [number, number]) => void
  onSoftRangeChange: (range: [number, number]) => void
  onCultureRangeChange: (range: [number, number]) => void
  onFinalRangeChange: (range: [number, number]) => void
  onStatusChange: (value: string) => void
  onClear: () => void
}) {
  const [technicalRange, setTechnicalRange] = React.useState<ScoreRange>([
    query.technical_min,
    query.technical_max,
  ])
  const [softRange, setSoftRange] = React.useState<ScoreRange>([query.soft_min, query.soft_max])
  const [cultureRange, setCultureRange] = React.useState<ScoreRange>([
    query.culture_min,
    query.culture_max,
  ])
  const [finalRange, setFinalRange] = React.useState<ScoreRange>([query.final_min, query.final_max])

  React.useEffect(() => {
    setTechnicalRange([query.technical_min, query.technical_max])
  }, [query.technical_max, query.technical_min])

  React.useEffect(() => {
    setSoftRange([query.soft_min, query.soft_max])
  }, [query.soft_max, query.soft_min])

  React.useEffect(() => {
    setCultureRange([query.culture_min, query.culture_max])
  }, [query.culture_max, query.culture_min])

  React.useEffect(() => {
    setFinalRange([query.final_min, query.final_max])
  }, [query.final_max, query.final_min])

  return (
    <div className="space-y-5">
      <ScoreRangeControls
        technicalRange={technicalRange}
        softRange={softRange}
        cultureRange={cultureRange}
        finalRange={finalRange}
        onTechnicalRangeChange={(range) => {
          setTechnicalRange(range)
          onTechnicalRangeChange(range)
        }}
        onSoftRangeChange={(range) => {
          setSoftRange(range)
          onSoftRangeChange(range)
        }}
        onCultureRangeChange={(range) => {
          setCultureRange(range)
          onCultureRangeChange(range)
        }}
        onFinalRangeChange={(range) => {
          setFinalRange(range)
          onFinalRangeChange(range)
        }}
      />

      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Estado</Label>
        <Select value={query.status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full border-border/70 bg-background/70">
            <SelectValue placeholder="Selecciona estado" />
          </SelectTrigger>
          <SelectContent className="border-border/70 bg-popover/95">
            <SelectItem value="all">Todos</SelectItem>
            {statusOptions.map((option) => (
              <SelectItem key={option.technical_name} value={option.technical_name}>
                {option.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button variant="outline" onClick={onClear} className="w-full rounded-full border-border/70 bg-background/70">
        Limpiar filtros
      </Button>
    </div>
  )
}

export default function OfertaAdminDetalleClient({
  offerId,
  offer,
  statusDisplayName,
  formCatalogs,
  candidateStatusOptions,
  initialCandidatesQuery,
  initialCandidatesData,
  companyConfig,
}: OfertaAdminDetalleClientProps) {
  useSetBreadcrumbTitle(`offer-${offerId}`, offer.title)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const query = React.useMemo(
    () =>
      normalizeAdminOfferCandidatesQuery({
        search: searchParams.get("search") ?? initialCandidatesQuery.search,
        technical_min: searchParams.get("technical_min") ?? initialCandidatesQuery.technical_min,
        technical_max: searchParams.get("technical_max") ?? initialCandidatesQuery.technical_max,
        soft_min: searchParams.get("soft_min") ?? initialCandidatesQuery.soft_min,
        soft_max: searchParams.get("soft_max") ?? initialCandidatesQuery.soft_max,
        culture_min: searchParams.get("culture_min") ?? initialCandidatesQuery.culture_min,
        culture_max: searchParams.get("culture_max") ?? initialCandidatesQuery.culture_max,
        final_min: searchParams.get("final_min") ?? initialCandidatesQuery.final_min,
        final_max: searchParams.get("final_max") ?? initialCandidatesQuery.final_max,
        status: searchParams.get("status") ?? initialCandidatesQuery.status,
        page: searchParams.get("page") ?? String(initialCandidatesQuery.page),
        pageSize: searchParams.get("pageSize") ?? String(initialCandidatesQuery.pageSize),
      }),
    [initialCandidatesQuery, searchParams]
  )

  const [searchInput, setSearchInput] = React.useState(query.search)
  const [reportDialogOpen, setReportDialogOpen] = React.useState(false)
  const [reportMode, setReportMode] = React.useState<"preset" | "custom">("preset")
  const [reportPresetCount, setReportPresetCount] = React.useState<10 | 15 | 20 | "all">(10)
  const [customReportCount, setCustomReportCount] = React.useState("")
  const [reportFilters, setReportFilters] = React.useState<ReportScoreFilters>(() =>
    buildReportScoreFiltersFromQuery(query)
  )
  const [isGeneratingReport, setIsGeneratingReport] = React.useState(false)

  React.useEffect(() => {
    setSearchInput(query.search)
  }, [query.search])

  const updateUrl = React.useCallback(
    (updates: Partial<AdminOfferCandidatesQueryParams>, resetPage = false) => {
      const next = normalizeAdminOfferCandidatesQuery({
        search: updates.search ?? query.search,
        technical_min: updates.technical_min ?? query.technical_min,
        technical_max: updates.technical_max ?? query.technical_max,
        soft_min: updates.soft_min ?? query.soft_min,
        soft_max: updates.soft_max ?? query.soft_max,
        culture_min: updates.culture_min ?? query.culture_min,
        culture_max: updates.culture_max ?? query.culture_max,
        final_min: updates.final_min ?? query.final_min,
        final_max: updates.final_max ?? query.final_max,
        status: updates.status ?? query.status,
        page: resetPage ? 1 : (updates.page ?? query.page),
        pageSize: updates.pageSize ?? query.pageSize,
      })

      const nextParams = new URLSearchParams()
      if (next.search) nextParams.set("search", next.search)
      if (next.technical_min !== 0) nextParams.set("technical_min", String(next.technical_min))
      if (next.technical_max !== 100) nextParams.set("technical_max", String(next.technical_max))
      if (next.soft_min !== 0) nextParams.set("soft_min", String(next.soft_min))
      if (next.soft_max !== 100) nextParams.set("soft_max", String(next.soft_max))
      if (next.culture_min !== 0) nextParams.set("culture_min", String(next.culture_min))
      if (next.culture_max !== 100) nextParams.set("culture_max", String(next.culture_max))
      if (next.final_min !== 0) nextParams.set("final_min", String(next.final_min))
      if (next.final_max !== 100) nextParams.set("final_max", String(next.final_max))
      if (next.status !== "all") nextParams.set("status", next.status)
      if (next.page !== 1) nextParams.set("page", String(next.page))
      if (next.pageSize !== initialCandidatesQuery.pageSize) {
        nextParams.set("pageSize", String(next.pageSize))
      }

      const queryString = nextParams.toString()
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
    },
    [initialCandidatesQuery.pageSize, pathname, query, router]
  )

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchInput !== query.search) {
        updateUrl({ search: searchInput }, true)
      }
    }, 400)

    return () => clearTimeout(timeout)
  }, [query.search, searchInput, updateUrl])

  const queryKey = React.useMemo(
    () => [
      "admin-offer-candidates",
      offerId,
      query.search,
      query.technical_min,
      query.technical_max,
      query.soft_min,
      query.soft_max,
      query.culture_min,
      query.culture_max,
      query.final_min,
      query.final_max,
      query.status,
      query.page,
      query.pageSize,
    ],
    [offerId, query]
  )

  const { data, isFetching } = useQuery<AdminOfferCandidatesResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams()
      if (query.search) params.set("search", query.search)
      params.set("technical_min", String(query.technical_min))
      params.set("technical_max", String(query.technical_max))
      params.set("soft_min", String(query.soft_min))
      params.set("soft_max", String(query.soft_max))
      params.set("culture_min", String(query.culture_min))
      params.set("culture_max", String(query.culture_max))
      params.set("final_min", String(query.final_min))
      params.set("final_max", String(query.final_max))
      if (query.status !== "all") params.set("status", query.status)
      params.set("page", String(query.page))
      params.set("pageSize", String(query.pageSize))

      const response = await fetch(`/api/admin/ofertas/${offerId}/candidatos?${params.toString()}`)
      if (!response.ok) {
        throw new Error("No se pudieron cargar los candidatos")
      }

      return (await response.json()) as AdminOfferCandidatesResponse
    },
    initialData: initialCandidatesData,
    placeholderData: (previous) => previous,
  })

  const reportTotalCandidates = offer.candidates_count
  const presetReportCounts = [10, 15, 20] as const

  const resolveReportCount = () => {
    if (reportMode === "custom") {
      const parsedCount = Number(customReportCount)
      return Number.isFinite(parsedCount) ? parsedCount : NaN
    }

    if (reportPresetCount === "all") {
      return reportTotalCandidates
    }

    return reportPresetCount
  }

  const openReportDialog = () => {
    setReportMode("preset")
    setReportPresetCount(10)
    setCustomReportCount("")
    setReportFilters(buildReportScoreFiltersFromQuery(query))
    setReportDialogOpen(true)
  }

  const handleGenerateReport = async () => {
    const requestedCount = resolveReportCount()

    if (!Number.isFinite(requestedCount) || requestedCount <= 0) {
      toast.error("Selecciona una cantidad válida")
      return
    }

    if (reportMode === "custom" && requestedCount > reportTotalCandidates) {
      toast.error(`La cantidad máxima es ${reportTotalCandidates}`)
      return
    }

    try {
      setIsGeneratingReport(true)
      await buildOfferCandidatesReportPdf({
        offerId,
        count: requestedCount,
        company: companyConfig,
        offer,
        statusDisplayName,
        candidateStatusOptions,
        reportFilters,
      })
      toast.success("Reporte PDF generado")
      setReportDialogOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo generar el reporte"
      toast.error(message)
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        search: query.search,
        technical_min: query.technical_min,
        technical_max: query.technical_max,
        soft_min: query.soft_min,
        soft_max: query.soft_max,
        culture_min: query.culture_min,
        culture_max: query.culture_max,
        final_min: query.final_min,
        final_max: query.final_max,
        status: query.status,
        page: query.page,
        pageSize: query.pageSize,
      }

      const response = await fetch(`/api/admin/ofertas/${offerId}/candidatos/refrescar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error("No se pudo refrescar el análisis")
      }

      return (await response.json()) as AdminOfferCandidatesResponse
    },
    onSuccess: (payload) => {
      queryClient.setQueryData(queryKey, payload)
    },
  })

  const candidates = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize))
  const startItem = total === 0 ? 0 : (query.page - 1) * query.pageSize + 1
  const endItem = Math.min(query.page * query.pageSize, total)

  const workplaceTypeLabel = React.useMemo(
    () =>
      formCatalogs.workplaceTypes.find((option) => option.technical_name === offer.workplace_type)
        ?.display_name ?? offer.workplace_type,
    [formCatalogs.workplaceTypes, offer.workplace_type]
  )

  const employmentTypeLabel = React.useMemo(
    () =>
      formCatalogs.employmentTypes.find((option) => option.technical_name === offer.employment_type)
        ?.display_name ?? offer.employment_type,
    [formCatalogs.employmentTypes, offer.employment_type]
  )

  const locationLabel = [offer.city, offer.state].filter((value) => Boolean(value)).join(", ")
  const metaChips = [
    locationLabel,
    offer.position,
    workplaceTypeLabel,
    employmentTypeLabel,
  ].filter((value) => Boolean(value))

  const statusMap = React.useMemo(
    () => new Map(candidateStatusOptions.map((item) => [item.technical_name, item.display_name])),
    [candidateStatusOptions]
  )

  const tableLoading = isFetching || refreshMutation.isPending

  const initialFormValues: Partial<CrearOfertaFormValues> = React.useMemo(
    () => ({
      title: offer.title,
      description: offer.description,
      status: offer.status,
      city: offer.city,
      state: offer.state,
      address: offer.address,
      workplace_type: offer.workplace_type,
      employment_type: offer.employment_type,
      position: offer.position,
      salary: String(offer.salary),
      weight_technical: String(offer.weight_technical),
      weight_soft: String(offer.weight_soft),
      weight_culture: String(offer.weight_culture),
      category: String(offer.category_id),
      technical_skills: offer.technical_skills ?? [],
      soft_skills: offer.soft_skills ?? [],
      credentials: offer.credentials ?? [],
      mandatory_technical_skills: (offer.technical_skill_items ?? [])
        .filter((item) => item.is_mandatory)
        .map((item) => item.name),
      mandatory_soft_skills: (offer.soft_skill_items ?? [])
        .filter((item) => item.is_mandatory)
        .map((item) => item.name),
      min_years_required: offer.min_years_required != null ? String(offer.min_years_required) : "",
    }),
    [offer]
  )

  return (
    <section className="mx-auto w-full space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-linear-to-br from-card/95 via-card/90 to-muted/40 p-6 shadow-soft">
        <div className="absolute -right-10 -top-10 hidden size-40 rounded-full bg-primary/10 blur-3xl md:block" />
        <div className="relative min-w-0 space-y-3">
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={offerStatusBadgeVariant(offer.status)}>{statusDisplayName}</Badge>
            <span>Creado {formatPublishedDate(offer.published_at)}</span>
            <span className="hidden h-1 w-1 rounded-full bg-muted-foreground/60 sm:inline-block" />
            <span>{offer.candidates_count} candidatos</span>
          </div>
          <h1 className="wrap-break-word text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
            {offer.title}
          </h1>
          {metaChips.length ? (
            <div className="flex flex-wrap gap-2">
              {metaChips.map((chip) => (
                <Badge
                  key={String(chip)}
                  variant="secondary"
                  className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-sm font-medium"
                >
                  {chip}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <Tabs defaultValue="detalles" className="space-y-6">
        <TabsList
          variant="default"
          className="mx-auto w-fit max-w-full justify-center gap-1.5 rounded-full border border-border/70 bg-muted/50 p-1.5 shadow-soft"
        >
          <TabsTrigger
            value="detalles"
            className="h-9 rounded-full px-4 text-sm font-medium text-muted-foreground transition hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Detalles de la Oferta
          </TabsTrigger>
          <TabsTrigger
            value="candidatos"
            className="h-9 gap-2 rounded-full px-4 text-sm font-medium text-muted-foreground transition hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Candidatos postulados
            <Badge
              variant="secondary"
              className="rounded-full border border-border/60 bg-background/70 px-2.5 py-0.5 text-xs"
            >
              {offer.candidates_count}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="detalles" className="space-y-4">
          <CrearOfertaForm
            catalogs={formCatalogs}
            initialValues={initialFormValues}
            mode="edit"
            showPageHeader={false}
            offerCardTitle="Editar oferta de empleo"
            submitLabel="Guardar cambios"
            onSubmitValues={async (values) => {
              const payload = {
                title: values.title.trim(),
                description: values.description.trim(),
                status: values.status,
                city: values.city.trim(),
                address: values.address.trim(),
                state: values.state.trim(),
                workplace_type: values.workplace_type,
                employment_type: values.employment_type,
                position: values.position.trim(),
                salary: values.salary.trim(),
                weight_technical: Number(values.weight_technical),
                weight_soft: Number(values.weight_soft),
                weight_culture: Number(values.weight_culture),
                category_id: Number(values.category),
                technical_skills: values.technical_skills,
                soft_skills: values.soft_skills,
                credentials: values.credentials ?? [],
                technical_skill_items: values.technical_skills.map((name) => ({
                  name,
                  is_mandatory: values.mandatory_technical_skills.some(
                    (mandatoryValue) => mandatoryValue.trim().toLowerCase() === name.trim().toLowerCase()
                  ),
                })),
                soft_skill_items: values.soft_skills.map((name) => ({
                  name,
                  is_mandatory: values.mandatory_soft_skills.some(
                    (mandatoryValue) => mandatoryValue.trim().toLowerCase() === name.trim().toLowerCase()
                  ),
                })),
                min_years_required: values.min_years_required ? parseInt(values.min_years_required) : null,
              }

              const response = await fetch(`/api/admin/ofertas/${offerId}`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
              })

              const responsePayload = (await response.json().catch(() => null)) as
                | { message?: string }
                | null

              if (!response.ok) {
                throw new Error(responsePayload?.message ?? "No se pudo guardar la oferta")
              }

              toast.success("Oferta actualizada")
              router.refresh()
            }}
          />
        </TabsContent>

        <TabsContent value="candidatos" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[310px_1fr]">
            <Card className="gradient-border sticky top-6 hidden h-fit rounded-2xl border border-border/70 bg-card/90 shadow-soft lg:block">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">Filtros avanzados</CardTitle>
                <p className="text-muted-foreground text-sm">Ajusta rangos y estado de candidatos.</p>
              </CardHeader>
              <CardContent>
                <ScoreFilterPanel
                  query={query}
                  statusOptions={candidateStatusOptions}
                  onTechnicalRangeChange={(range) =>
                    updateUrl({ technical_min: range[0], technical_max: range[1] }, true)
                  }
                  onSoftRangeChange={(range) =>
                    updateUrl({ soft_min: range[0], soft_max: range[1] }, true)
                  }
                  onCultureRangeChange={(range) =>
                    updateUrl({ culture_min: range[0], culture_max: range[1] }, true)
                  }
                  onFinalRangeChange={(range) =>
                    updateUrl({ final_min: range[0], final_max: range[1] }, true)
                  }
                  onStatusChange={(value) => updateUrl({ status: value }, true)}
                  onClear={() =>
                    updateUrl(
                      {
                        technical_min: 0,
                        technical_max: 100,
                        soft_min: 0,
                        soft_max: 100,
                        culture_min: 0,
                        culture_max: 100,
                        final_min: 0,
                        final_max: 100,
                        status: "all",
                        search: "",
                      },
                      true
                    )
                  }
                />
              </CardContent>
            </Card>

            <Card className="min-w-0 rounded-2xl border border-border/70 bg-card/90 shadow-soft">
              <CardHeader className="space-y-3 border-b border-border/70 pb-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="relative flex-1">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      placeholder="Buscar candidato por nombre y apellido"
                      className="rounded-full border-border/70 bg-background/70 pl-9"
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full border-border/70 bg-background/70"
                      onClick={openReportDialog}
                      disabled={reportTotalCandidates === 0}
                    >
                      Generar reporte PDF
                    </Button>

                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline" className="rounded-full border-border/70 bg-background/70 lg:hidden">
                          <SlidersHorizontal className="mr-2 size-4" />
                          Filtros
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="left" className="w-full max-w-xs border-border/70 bg-card/95">
                        <SheetHeader>
                          <SheetTitle>Filtros avanzados</SheetTitle>
                          <SheetDescription>Ajusta rangos y estado de candidatos.</SheetDescription>
                        </SheetHeader>
                        <div className="p-4">
                          <ScoreFilterPanel
                            query={query}
                            statusOptions={candidateStatusOptions}
                            onTechnicalRangeChange={(range) =>
                              updateUrl({ technical_min: range[0], technical_max: range[1] }, true)
                            }
                            onSoftRangeChange={(range) =>
                              updateUrl({ soft_min: range[0], soft_max: range[1] }, true)
                            }
                            onCultureRangeChange={(range) =>
                              updateUrl({ culture_min: range[0], culture_max: range[1] }, true)
                            }
                            onFinalRangeChange={(range) =>
                              updateUrl({ final_min: range[0], final_max: range[1] }, true)
                            }
                            onStatusChange={(value) => updateUrl({ status: value }, true)}
                            onClear={() =>
                              updateUrl(
                                {
                                  technical_min: 0,
                                  technical_max: 100,
                                  soft_min: 0,
                                  soft_max: 100,
                                  culture_min: 0,
                                  culture_max: 100,
                                  final_min: 0,
                                  final_max: 100,
                                  status: "all",
                                  search: "",
                                },
                                true
                              )
                            }
                          />
                        </div>
                      </SheetContent>
                    </Sheet>

                    {/* <Button onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending}>
                      {refreshMutation.isPending ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <RefreshCcw className="mr-2 size-4" />
                      )}
                      Refrescar análisis
                    </Button> */}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-4">
                <div className="w-full overflow-x-auto">
                  <div className="min-w-280 overflow-hidden rounded-2xl border border-border/70 bg-background/80 shadow-sm">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="text-sm font-semibold text-muted-foreground">Candidato</TableHead>
                          <TableHead className="text-sm font-semibold text-muted-foreground">Puntuación técnica</TableHead>
                          <TableHead className="text-sm font-semibold text-muted-foreground">Puntuación blanda</TableHead>
                          <TableHead className="text-sm font-semibold text-muted-foreground">Alineación cultural</TableHead>
                          <TableHead className="text-sm font-semibold text-muted-foreground">Puntuación final</TableHead>
                          <TableHead className="text-sm font-semibold text-muted-foreground">Estado</TableHead>
                          <TableHead className="w-20 text-right text-sm font-semibold text-muted-foreground">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tableLoading ? <CandidateRowsSkeleton rows={Math.min(query.pageSize, 8)} /> : null}

                        {!tableLoading &&
                          candidates.map((candidate) => {
                            const fullName = `${candidate.first_name} ${candidate.last_name}`
                            const statusLabel = statusMap.get(candidate.status) ?? candidate.status

                            return (
                              <TableRow key={candidate.application_id} className="transition-colors hover:bg-muted/60">
                                <TableCell>
                                  <div className="font-medium">{fullName}</div>
                                </TableCell>
                                <TableCell className="space-y-1.5">
                                  <Progress
                                    value={candidate.technical_score}
                                    className={cn("h-2 w-36", getProgressColorClass(candidate.technical_score))}
                                  />
                                  <p className="text-muted-foreground text-xs">{candidate.technical_score}%</p>
                                </TableCell>
                                <TableCell className="space-y-1.5">
                                  <Progress
                                    value={candidate.soft_score}
                                    className={cn("h-2 w-36", getProgressColorClass(candidate.soft_score))}
                                  />
                                  <p className="text-muted-foreground text-xs">{candidate.soft_score}%</p>
                                </TableCell>
                                <TableCell className="space-y-1.5">
                                  <Progress
                                    value={candidate.culture_score}
                                    className={cn("h-2 w-36", getProgressColorClass(candidate.culture_score))}
                                  />
                                  <p className="text-muted-foreground text-xs">{candidate.culture_score}%</p>
                                </TableCell>
                                <TableCell className="space-y-1.5">
                                  <Progress
                                    value={candidate.final_score}
                                    className={cn("h-2 w-36", getProgressColorClass(candidate.final_score))}
                                  />
                                  <p className="text-muted-foreground text-xs">{candidate.final_score}%</p>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={candidateStatusBadgeVariant(candidate.status)}>
                                    {statusLabel}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="icon" asChild className="rounded-full">
                                    <Link
                                      href={`/admin/ofertas/${offerId}/candidatos/${candidate.application_id}`}
                                      aria-label={`Ver aplicación de ${fullName}`}
                                    >
                                      <Eye className="size-4" />
                                    </Link>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })}

                        {!tableLoading && !candidates.length ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-muted-foreground py-10 text-center">
                              No se encontraron candidatos con los filtros seleccionados.
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-muted-foreground text-sm">
                    Mostrando {startItem} a {endItem} de {total} candidatos
                  </p>

                  <Pagination className="mx-0 w-auto justify-start sm:justify-end">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationLink
                          href="#"
                          size="default"
                          onClick={(event) => {
                            event.preventDefault()
                            if (query.page > 1) {
                              updateUrl({ page: query.page - 1 })
                            }
                          }}
                          className={cn(
                            "gap-1 rounded-full border border-border/60 bg-background/70 px-2.5 hover:bg-muted/80",
                            query.page <= 1 ? "pointer-events-none opacity-50" : ""
                          )}
                        >
                          <ChevronLeft className="size-4" />
                          <span>Anterior</span>
                        </PaginationLink>
                      </PaginationItem>

                      {Array.from({ length: totalPages }).slice(0, 5).map((_, index) => {
                        const pageNumber = index + 1

                        return (
                          <PaginationItem key={pageNumber}>
                            <PaginationLink
                              href="#"
                              isActive={pageNumber === query.page}
                              onClick={(event) => {
                                event.preventDefault()
                                updateUrl({ page: pageNumber })
                              }}
                              className="rounded-full border border-border/60 bg-background/70 hover:bg-muted/80"
                            >
                              {pageNumber}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      })}

                      <PaginationItem>
                        <PaginationLink
                          href="#"
                          size="default"
                          onClick={(event) => {
                            event.preventDefault()
                            if (query.page < totalPages) {
                              updateUrl({ page: query.page + 1 })
                            }
                          }}
                          className={cn(
                            "gap-1 rounded-full border border-border/60 bg-background/70 px-2.5 hover:bg-muted/80",
                            query.page >= totalPages ? "pointer-events-none opacity-50" : ""
                          )}
                        >
                          <span>Siguiente</span>
                          <ChevronRight className="size-4" />
                        </PaginationLink>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-8/9 overflow-auto">
          <DialogHeader>
            <DialogTitle>Generar reporte PDF</DialogTitle>
            <DialogDescription>
              El reporte se generará con las postulaciones mejor puntuadas de la oferta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium">Selecciona una cantidad</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {presetReportCounts.map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant={reportMode === "preset" && reportPresetCount === preset ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() => {
                      setReportMode("preset")
                      setReportPresetCount(preset)
                    }}
                  >
                    Top {preset}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant={reportMode === "preset" && reportPresetCount === "all" ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => {
                    setReportMode("preset")
                    setReportPresetCount("all")
                  }}
                >
                  Todos
                </Button>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant={reportMode === "custom" ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setReportMode("custom")}
                >
                  Personalizado
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-report-count">Cantidad personalizada</Label>
              <Input
                id="custom-report-count"
                type="number"
                min={1}
                max={reportTotalCandidates}
                value={customReportCount}
                onChange={(event) => {
                  setReportMode("custom")
                  setCustomReportCount(event.target.value)
                }}
                placeholder={`Máximo ${reportTotalCandidates}`}
              />
              <p className="text-sm text-muted-foreground">
                Puedes elegir hasta {reportTotalCandidates} postulaciones.
              </p>
            </div>
            <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Filtros de puntuación para el reporte</p>
                <p className="text-sm text-muted-foreground">
                  El top seleccionado se calculará solo entre los candidatos que entren en estos rangos.
                </p>
              </div>

              <ScoreRangeControls
                technicalRange={reportFilters.technical}
                softRange={reportFilters.soft}
                cultureRange={reportFilters.culture}
                finalRange={reportFilters.final}
                onTechnicalRangeChange={(range) =>
                  setReportFilters((current) => ({ ...current, technical: range }))
                }
                onSoftRangeChange={(range) => setReportFilters((current) => ({ ...current, soft: range }))}
                onCultureRangeChange={(range) =>
                  setReportFilters((current) => ({ ...current, culture: range }))
                }
                onFinalRangeChange={(range) => setReportFilters((current) => ({ ...current, final: range }))}
              />
            </div>


          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleGenerateReport} disabled={isGeneratingReport}>
              {isGeneratingReport ? "Generando..." : "Generar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
