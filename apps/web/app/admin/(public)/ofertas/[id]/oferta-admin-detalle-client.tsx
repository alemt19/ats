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

import CrearOfertaForm, {
  type CrearOfertaCatalogs,
  type CrearOfertaFormValues,
} from "../crear/crear-oferta-form"
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

type OfertaAdminDetalleClientProps = {
  offerId: number
  offer: AdminOfferDetail
  statusDisplayName: string
  formCatalogs: CrearOfertaCatalogs
  candidateStatusOptions: CandidateStatusOption[]
  initialCandidatesQuery: AdminOfferCandidatesQueryParams
  initialCandidatesData: AdminOfferCandidatesResponse
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

function ScoreFilterPanel({
  query,
  statusOptions,
  onTechnicalRangeChange,
  onSoftRangeChange,
  onCultureRangeChange,
  onStatusChange,
  onClear,
}: {
  query: AdminOfferCandidatesQueryParams
  statusOptions: CandidateStatusOption[]
  onTechnicalRangeChange: (range: [number, number]) => void
  onSoftRangeChange: (range: [number, number]) => void
  onCultureRangeChange: (range: [number, number]) => void
  onStatusChange: (value: string) => void
  onClear: () => void
}) {
  const [technicalRange, setTechnicalRange] = React.useState<[number, number]>([
    query.technical_min,
    query.technical_max,
  ])
  const [softRange, setSoftRange] = React.useState<[number, number]>([query.soft_min, query.soft_max])
  const [cultureRange, setCultureRange] = React.useState<[number, number]>([
    query.culture_min,
    query.culture_max,
  ])

  React.useEffect(() => {
    setTechnicalRange([query.technical_min, query.technical_max])
  }, [query.technical_max, query.technical_min])

  React.useEffect(() => {
    setSoftRange([query.soft_min, query.soft_max])
  }, [query.soft_max, query.soft_min])

  React.useEffect(() => {
    setCultureRange([query.culture_min, query.culture_max])
  }, [query.culture_max, query.culture_min])

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Puntuación de habilidades técnicas</Label>
        <Slider
          min={0}
          max={100}
          step={1}
          value={technicalRange}
          onValueChange={(value) => setTechnicalRange([value[0] ?? 0, value[1] ?? 100])}
          onValueCommit={(value) => onTechnicalRangeChange([value[0] ?? 0, value[1] ?? 100])}
        />
        <div className="text-muted-foreground flex justify-between text-xs">
          <span>{technicalRange[0]}%</span>
          <span>{technicalRange[1]}%</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Puntuación de habilidades blandas</Label>
        <Slider
          min={0}
          max={100}
          step={1}
          value={softRange}
          onValueChange={(value) => setSoftRange([value[0] ?? 0, value[1] ?? 100])}
          onValueCommit={(value) => onSoftRangeChange([value[0] ?? 0, value[1] ?? 100])}
        />
        <div className="text-muted-foreground flex justify-between text-xs">
          <span>{softRange[0]}%</span>
          <span>{softRange[1]}%</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Puntuación de alineación cultural</Label>
        <Slider
          min={0}
          max={100}
          step={1}
          value={cultureRange}
          onValueChange={(value) => setCultureRange([value[0] ?? 0, value[1] ?? 100])}
          onValueCommit={(value) => onCultureRangeChange([value[0] ?? 0, value[1] ?? 100])}
        />
        <div className="text-muted-foreground flex justify-between text-xs">
          <span>{cultureRange[0]}%</span>
          <span>{cultureRange[1]}%</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Estado</Label>
        <Select value={query.status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecciona estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {statusOptions.map((option) => (
              <SelectItem key={option.technical_name} value={option.technical_name}>
                {option.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button variant="outline" onClick={onClear} className="w-full">
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
}: OfertaAdminDetalleClientProps) {
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
        status: searchParams.get("status") ?? initialCandidatesQuery.status,
        page: searchParams.get("page") ?? String(initialCandidatesQuery.page),
        pageSize: searchParams.get("pageSize") ?? String(initialCandidatesQuery.pageSize),
      }),
    [initialCandidatesQuery, searchParams]
  )

  const [searchInput, setSearchInput] = React.useState(query.search)

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
      category: offer.category,
      technical_skills: offer.technical_skills,
      soft_skills: offer.soft_skills,
    }),
    [offer]
  )

  return (
    <section className="mx-auto w-full space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">{offer.title}</h1>
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
          <Badge variant={offerStatusBadgeVariant(offer.status)}>{statusDisplayName}</Badge>
          <span>Publicada hace {formatPublishedDate(offer.published_at)}</span>
        </div>
      </div>

      <Tabs defaultValue="detalles" className="space-y-6">
        <TabsList variant="line" className="w-full justify-start border-b px-0 pb-0">
          <TabsTrigger value="detalles">Detalles de la Oferta</TabsTrigger>
          <TabsTrigger value="candidatos" className="gap-2">
            Candidatos Postulados
            <Badge variant="secondary">{offer.candidates_count}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="detalles" className="space-y-4">
          <CrearOfertaForm
            catalogs={formCatalogs}
            initialValues={initialFormValues}
            showPageHeader={false}
            offerCardTitle="Editar Oferta de Empleo"
            submitLabel="Guardar cambios"
            onSubmitValues={(values) => {
              console.log("Payload editar oferta:", {
                ...values,
                salary: Number(values.salary),
                weight_technical: Number(values.weight_technical),
                weight_soft: Number(values.weight_soft),
                weight_culture: Number(values.weight_culture),
              })
            }}
          />
        </TabsContent>

        <TabsContent value="candidatos" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
            <Card className="hidden h-fit lg:block">
              <CardHeader>
                <CardTitle className="text-base">Filtros avanzados</CardTitle>
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
                        status: "all",
                        search: "",
                      },
                      true
                    )
                  }
                />
              </CardContent>
            </Card>

            <Card className="min-w-0 gap-3">
              <CardHeader className="space-y-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="relative flex-1">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      placeholder="Buscar candidato por nombre y apellido"
                      className="pl-9"
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline" className="lg:hidden">
                          <SlidersHorizontal className="mr-2 size-4" />
                          Filtros
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="left" className="w-full max-w-xs">
                        <SheetHeader>
                          <SheetTitle>Filtros avanzados</SheetTitle>
                          <SheetDescription>Ajusta rangos y status de candidatos.</SheetDescription>
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

                    <Button onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending}>
                      {refreshMutation.isPending ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <RefreshCcw className="mr-2 size-4" />
                      )}
                      Refrescar análisis
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="w-full overflow-x-auto">
                  <Table className="min-w-245">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Candidato</TableHead>
                        <TableHead>Puntuación técnica</TableHead>
                        <TableHead>Puntuación blanda</TableHead>
                        <TableHead>Alineación cultural</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="w-20 text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableLoading ? <CandidateRowsSkeleton rows={Math.min(query.pageSize, 8)} /> : null}

                      {!tableLoading &&
                        candidates.map((candidate) => {
                          const fullName = `${candidate.first_name} ${candidate.last_name}`
                          const statusLabel = statusMap.get(candidate.status) ?? candidate.status

                          return (
                            <TableRow key={candidate.application_id}>
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
                              <TableCell>
                                <Badge variant={candidateStatusBadgeVariant(candidate.status)}>
                                  {statusLabel}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" asChild>
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
                          <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                            No se encontraron candidatos con los filtros seleccionados.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
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
                          className={cn("gap-1 px-2.5", query.page <= 1 ? "pointer-events-none opacity-50" : "")}
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
                            "gap-1 px-2.5",
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
    </section>
  )
}
