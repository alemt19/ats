"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import {
  ChevronLeft,
  ChevronRight,
  Check,
  ChevronsUpDown,
  Eye,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Badge } from "react/components/ui/badge"
import { Button } from "react/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "react/components/ui/card"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "react/components/ui/command"
import { Input } from "react/components/ui/input"
import { Label } from "react/components/ui/label"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "react/components/ui/pagination"
import { Popover, PopoverContent, PopoverTrigger } from "react/components/ui/popover"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "react/components/ui/table"
import { cn } from "react/lib/utils"

import {
  type AdminOffer,
  type AdminOffersCatalogsResponse,
  type AdminOffersQueryParams,
  type AdminOffersResponse,
  normalizeAdminOffersQuery,
} from "./offers-admin-types"

type AdminOfertasClientProps = {
  initialQuery: AdminOffersQueryParams
  initialData: AdminOffersResponse
  initialCatalogs: AdminOffersCatalogsResponse
}

const PAGE_SIZE = 10

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function statusLabel(status: string) {
  switch (status) {
    case "published":
      return "Activa"
    case "draft":
      return "Pausada"
    case "closed":
      return "Cerrada"
    case "archived":
      return "Archivada"
    default:
      return status
  }
}

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "published":
      return "default"
    case "draft":
      return "secondary"
    case "closed":
      return "destructive"
    case "archived":
      return "outline"
    default:
      return "outline"
  }
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: PAGE_SIZE }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  )
}

function TableRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <TableRow key={`row-skeleton-${index}`}>
          <TableCell>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-36" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-10" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-16" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="ml-auto h-8 w-8" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

function FiltersPanel({
  query,
  catalogs,
  onCategoryChange,
  onWorkplaceTypeChange,
  onEmploymentTypeChange,
  onCityChange,
  onStatusChange,
  compact = false,
}: {
  query: AdminOffersQueryParams
  catalogs: AdminOffersCatalogsResponse
  onCategoryChange: (value: string) => void
  onWorkplaceTypeChange: (value: string) => void
  onEmploymentTypeChange: (value: string) => void
  onCityChange: (value: string) => void
  onStatusChange: (value: string) => void
  compact?: boolean
}) {
  const [cityOpen, setCityOpen] = React.useState(false)

  return (
    <div className={cn("grid gap-3", compact ? "grid-cols-2 xl:grid-cols-5" : "grid-cols-1 sm:grid-cols-2")}>
      <div className="space-y-1.5">
        <Label>Categoría</Label>
        <Select value={query.category} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {catalogs.categories.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Modalidad</Label>
        <Select value={query.workplace_type} onValueChange={onWorkplaceTypeChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Modalidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {catalogs.workplace_types.map((option) => (
              <SelectItem key={option.technical_name} value={option.technical_name}>
                {option.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Tipo de empleo</Label>
        <Select value={query.employment_type} onValueChange={onEmploymentTypeChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Tipo de empleo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {catalogs.employment_types.map((option) => (
              <SelectItem key={option.technical_name} value={option.technical_name}>
                {option.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Ciudad</Label>
        <Popover open={cityOpen} onOpenChange={setCityOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              {query.city === "all" ? "Todas" : query.city}
              <ChevronsUpDown className="size-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar ciudad..." />
              <CommandList>
                <CommandEmpty>Sin resultados</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all"
                    onSelect={() => {
                      onCityChange("all")
                      setCityOpen(false)
                    }}
                  >
                    <Check className={cn("mr-2 size-4", query.city === "all" ? "opacity-100" : "opacity-0")} />
                    Todas
                  </CommandItem>
                  {catalogs.cities.map((city) => (
                    <CommandItem
                      key={city}
                      value={city}
                      onSelect={() => {
                        onCityChange(city)
                        setCityOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 size-4",
                          query.city === city ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {city}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-1.5">
        <Label>Estado</Label>
        <Select value={query.status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {catalogs.statuses.map((option) => (
              <SelectItem key={option.technical_name} value={option.technical_name}>
                {option.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

export default function OfertasAdminClient({
  initialQuery,
  initialData,
  initialCatalogs,
}: AdminOfertasClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const query = React.useMemo(
    () =>
      normalizeAdminOffersQuery({
        title: searchParams.get("title") ?? initialQuery.title,
        category: searchParams.get("category") ?? initialQuery.category,
        workplace_type: searchParams.get("workplace_type") ?? initialQuery.workplace_type,
        employment_type: searchParams.get("employment_type") ?? initialQuery.employment_type,
        city: searchParams.get("city") ?? initialQuery.city,
        state: "all",
        status: searchParams.get("status") ?? initialQuery.status,
        page: searchParams.get("page") ?? String(initialQuery.page),
        pageSize: searchParams.get("pageSize") ?? String(initialQuery.pageSize),
      }),
    [initialQuery, searchParams]
  )

  const [titleInput, setTitleInput] = React.useState(query.title)

  React.useEffect(() => {
    setTitleInput(query.title)
  }, [query.title])

  const updateUrl = React.useCallback(
    (updates: Partial<AdminOffersQueryParams>, resetPage = false) => {
      const next = normalizeAdminOffersQuery({
        title: updates.title ?? query.title,
        category: updates.category ?? query.category,
        workplace_type: updates.workplace_type ?? query.workplace_type,
        employment_type: updates.employment_type ?? query.employment_type,
        city: updates.city ?? query.city,
        state: "all",
        status: updates.status ?? query.status,
        page: resetPage ? "1" : String(updates.page ?? query.page),
        pageSize: String(updates.pageSize ?? query.pageSize),
      })

      const nextParams = new URLSearchParams()
      if (next.title) nextParams.set("title", next.title)
      if (next.category !== "all") nextParams.set("category", next.category)
      if (next.workplace_type !== "all") nextParams.set("workplace_type", next.workplace_type)
      if (next.employment_type !== "all") nextParams.set("employment_type", next.employment_type)
      if (next.city !== "all") nextParams.set("city", next.city)
      if (next.status !== "all") nextParams.set("status", next.status)
      if (next.page !== 1) nextParams.set("page", String(next.page))
      if (next.pageSize !== PAGE_SIZE) nextParams.set("pageSize", String(next.pageSize))

      const queryString = nextParams.toString()
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
    },
    [pathname, query, router]
  )

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (titleInput !== query.title) {
        updateUrl({ title: titleInput }, true)
      }
    }, 400)

    return () => clearTimeout(timeout)
  }, [query.title, titleInput, updateUrl])

  const queryKey = React.useMemo(
    () => [
      "admin-offers",
      query.title,
      query.category,
      query.workplace_type,
      query.employment_type,
      query.city,
      query.status,
      query.page,
      query.pageSize,
    ],
    [query]
  )

  const { data, isFetching } = useQuery<AdminOffersResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams()
      if (query.title) params.set("title", query.title)
      if (query.category !== "all") params.set("category", query.category)
      if (query.workplace_type !== "all") params.set("workplace_type", query.workplace_type)
      if (query.employment_type !== "all") params.set("employment_type", query.employment_type)
      if (query.city !== "all") params.set("city", query.city)
      if (query.status !== "all") params.set("status", query.status)
      params.set("page", String(query.page))
      params.set("pageSize", String(query.pageSize))

      const response = await fetch(`/api/admin/ofertas?${params.toString()}`)
      if (!response.ok) {
        throw new Error("No se pudieron cargar las ofertas")
      }

      return (await response.json()) as AdminOffersResponse
    },
    initialData,
    placeholderData: (previous) => previous,
  })

  const { data: catalogsData } = useQuery<AdminOffersCatalogsResponse>({
    queryKey: ["admin-offers-catalogs"],
    queryFn: async () => {
      const response = await fetch("/api/admin/ofertas/catalogos")
      if (!response.ok) {
        throw new Error("No se pudieron cargar los catálogos")
      }
      return (await response.json()) as AdminOffersCatalogsResponse
    },
    initialData: initialCatalogs,
    staleTime: 5 * 60 * 1000,
  })

  const offers = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize))

  const startItem = total === 0 ? 0 : (query.page - 1) * query.pageSize + 1
  const endItem = Math.min(query.page * query.pageSize, total)

  const catalogs = catalogsData ?? initialCatalogs

  const onPageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === query.page) {
      return
    }

    updateUrl({ page: nextPage })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Ofertas de Empleo</h1>
        <Button asChild className="sm:w-auto">
          <Link href="/admin/ofertas/crear">
            <Plus className="mr-2 size-4" />
            Crear Nueva Oferta
          </Link>
        </Button>
      </div>

      <Card className="container mx-auto gap-4 @container">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 @[1151px]:flex-row @[1151px]:items-start @[1151px]:gap-4">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                placeholder="Buscar ofertas por título o palabra clave"
                className="pl-9"
                value={titleInput}
                onChange={(event) => setTitleInput(event.target.value)}
              />
            </div>

            <div className="hidden @[1151px]:block @[1151px]:min-w-190">
              <FiltersPanel
                compact
                query={query}
                catalogs={catalogs}
                onCategoryChange={(value) => updateUrl({ category: value }, true)}
                onWorkplaceTypeChange={(value) => updateUrl({ workplace_type: value }, true)}
                onEmploymentTypeChange={(value) => updateUrl({ employment_type: value }, true)}
                onCityChange={(value) => updateUrl({ city: value }, true)}
                onStatusChange={(value) => updateUrl({ status: value }, true)}
              />
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="@[1151px]:hidden">
                  <SlidersHorizontal className="mr-2 size-4" />
                  Filtros
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full max-w-sm">
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                  <SheetDescription>Filtra las ofertas en función de tus criterios.</SheetDescription>
                </SheetHeader>
                <div className="mt-6 p-4">
                  <FiltersPanel
                    query={query}
                    catalogs={catalogs}
                    onCategoryChange={(value) => updateUrl({ category: value }, true)}
                    onWorkplaceTypeChange={(value) => updateUrl({ workplace_type: value }, true)}
                    onEmploymentTypeChange={(value) => updateUrl({ employment_type: value }, true)}
                    onCityChange={(value) => updateUrl({ city: value }, true)}
                    onStatusChange={(value) => updateUrl({ status: value }, true)}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isFetching && !offers.length ? <TableSkeleton /> : null}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título del cargo</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Candidatos</TableHead>
                <TableHead>Fecha de creación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-20 text-right">Ver</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isFetching ? <TableRowsSkeleton rows={Math.min(query.pageSize, 8)} /> : null}

              {!isFetching &&
                offers.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell>
                      <div className="font-medium">{offer.title}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {offer.city}, {offer.state}
                    </TableCell>
                    <TableCell className="text-primary font-medium">{offer.candidateCount}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(offer.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(offer.status)}>{statusLabel(offer.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/ofertas/${offer.id}`} aria-label={`Ver oferta ${offer.title}`}>
                          <Eye className="size-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

              {!isFetching && !offers.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                    No se encontraron ofertas con los filtros seleccionados.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm">
              Mostrando {startItem} a {endItem} de {total} resultados
            </p>

            <Pagination className="mx-0 w-auto justify-start sm:justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationLink
                    href="#"
                    size="default"
                    onClick={(event) => {
                      event.preventDefault()
                      onPageChange(query.page - 1)
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
                          onPageChange(pageNumber)
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
                      onPageChange(query.page + 1)
                    }}
                    className={cn("gap-1 px-2.5", query.page >= totalPages ? "pointer-events-none opacity-50" : "")}
                  >
                    <span>Siguiente</span>
                    <ChevronRight className="size-4" />
                  </PaginationLink>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>

          {isFetching && offers.length ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Cargando nuevas filas...
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
