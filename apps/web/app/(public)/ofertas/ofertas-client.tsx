"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import {
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Loader2,
  MapPin,
  SlidersHorizontal,
  Search,
  Tag,
  Wallet,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Badge } from "react/components/ui/badge"
import { Button } from "react/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "react/components/ui/card"
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
import { Separator } from "react/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "react/components/ui/sheet"
import { Skeleton } from "react/components/ui/skeleton"
import { cn } from "react/lib/utils"

import {
  type EmploymentType,
  type JobOffer,
  type OffersCatalogsResponse,
  type OffersQueryParams,
  type OffersResponse,
  type WorkplaceType,
  normalizeOffersQuery,
} from "./offers-types"

type OfertasClientProps = {
  initialQuery: OffersQueryParams
  initialData: OffersResponse
  initialCatalogs: OffersCatalogsResponse
}

const PAGE_SIZE = 10

const workplaceLabel: Record<WorkplaceType, string> = {
  remote: "Remoto",
  onsite: "Presencial",
  hybrid: "Híbrido",
}

const employmentLabel: Record<EmploymentType, string> = {
  full_time: "Tiempo completo",
  part_time: "Medio tiempo",
  contract: "Contrato",
  internship: "Pasantía",
}

function workplaceBadgeVariant(type: WorkplaceType) {
  switch (type) {
    case "remote":
      return "default"
    case "hybrid":
      return "outline"
    case "onsite":
      return "secondary"
    default:
      return "outline"
  }
}

function employmentBadgeVariant(type: EmploymentType) {
  switch (type) {
    case "full_time":
      return "default"
    case "part_time":
      return "secondary"
    case "contract":
      return "outline"
    case "internship":
      return "outline"
    default:
      return "outline"
  }
}

function OffersGridSkeleton() {
  const items = Array.from({ length: PAGE_SIZE })

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((_, index) => (
        <Card key={`offer-skeleton-${index}`} className="gap-3 rounded-2xl py-4 shadow-none">
          <CardHeader className="space-y-2 pb-0">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-32" />
            <Separator />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-24" />
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-5 w-24" />
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

function FiltersPanel({
  category,
  workplaceType,
  employmentType,
  city,
  categories,
  cities,
  onCategoryChange,
  onWorkplaceTypeChange,
  onEmploymentTypeChange,
  onCityChange,
}: {
  category: string
  workplaceType: string
  employmentType: string
  city: string
  categories: string[]
  cities: string[]
  onCategoryChange: (value: string) => void
  onWorkplaceTypeChange: (value: string) => void
  onEmploymentTypeChange: (value: string) => void
  onCityChange: (value: string) => void
}) {
  const [cityOpen, setCityOpen] = React.useState(false)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Categoría</Label>
        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((item) => (
              <SelectItem key={item} value={item}>
                {item === "all" ? "Todas las categorías" : item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Modalidad</Label>
        <Select value={workplaceType} onValueChange={onWorkplaceTypeChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="remote">Remoto</SelectItem>
            <SelectItem value="onsite">Presencial</SelectItem>
            <SelectItem value="hybrid">Híbrido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Tipo de empleo</Label>
        <Select value={employmentType} onValueChange={onEmploymentTypeChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="full_time">Tiempo completo</SelectItem>
            <SelectItem value="part_time">Medio tiempo</SelectItem>
            <SelectItem value="contract">Contrato</SelectItem>
            <SelectItem value="internship">Pasantía</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Ciudad</Label>
        <Popover open={cityOpen} onOpenChange={setCityOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" className="w-full justify-between">
              {city === "all" ? "Todas las ciudades" : city}
              <ChevronsUpDown className="size-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar ciudad..." />
              <CommandList>
                <CommandEmpty>Sin ciudades.</CommandEmpty>
                <CommandGroup>
                  {cities.map((item) => (
                    <CommandItem
                      key={item}
                      value={item}
                      onSelect={() => {
                        onCityChange(item === city ? "all" : item)
                        setCityOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 size-4",
                          city === item ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {item === "all" ? "Todas las ciudades" : item}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}

export default function OfertasClient({
  initialQuery,
  initialData,
  initialCatalogs,
}: OfertasClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const query = React.useMemo(
    () =>
      normalizeOffersQuery({
        title: searchParams.get("title") ?? initialQuery.title,
        category: searchParams.get("category") ?? initialQuery.category,
        workplace_type: searchParams.get("workplace_type") ?? initialQuery.workplace_type,
        employment_type: searchParams.get("employment_type") ?? initialQuery.employment_type,
        city: searchParams.get("city") ?? initialQuery.city,
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
    (updates: Partial<OffersQueryParams>, resetPage = false) => {
      const next = normalizeOffersQuery({
        title: updates.title ?? query.title,
        category: updates.category ?? query.category,
        workplace_type: updates.workplace_type ?? query.workplace_type,
        employment_type: updates.employment_type ?? query.employment_type,
        city: updates.city ?? query.city,
        page: resetPage ? "1" : String(updates.page ?? query.page),
        pageSize: String(updates.pageSize ?? query.pageSize),
      })

      const nextParams = new URLSearchParams()

      if (next.title) nextParams.set("title", next.title)
      if (next.category !== "all") nextParams.set("category", next.category)
      if (next.workplace_type !== "all") nextParams.set("workplace_type", next.workplace_type)
      if (next.employment_type !== "all") nextParams.set("employment_type", next.employment_type)
      if (next.city !== "all") nextParams.set("city", next.city)
      if (next.page !== 1) nextParams.set("page", String(next.page))
      if (next.pageSize !== PAGE_SIZE) nextParams.set("pageSize", String(next.pageSize))

      const queryString = nextParams.toString()
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      })
    },
    [pathname, query, router]
  )

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (titleInput !== query.title) {
        updateUrl({ title: titleInput }, true)
      }
    }, 500)

    return () => clearTimeout(timeout)
  }, [query.title, titleInput, updateUrl])

  const queryKey = React.useMemo(
    () => [
      "offers",
      query.title,
      query.category,
      query.workplace_type,
      query.employment_type,
      query.city,
      query.page,
      query.pageSize,
    ],
    [query]
  )

  const { data, isFetching } = useQuery<OffersResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams()

      if (query.title) params.set("title", query.title)
      if (query.category !== "all") params.set("category", query.category)
      if (query.workplace_type !== "all") params.set("workplace_type", query.workplace_type)
      if (query.employment_type !== "all") params.set("employment_type", query.employment_type)
      if (query.city !== "all") params.set("city", query.city)
      params.set("page", String(query.page))
      params.set("pageSize", String(query.pageSize))

      const response = await fetch(`/api/ofertas?${params.toString()}`)
      if (!response.ok) {
        throw new Error("No se pudieron cargar las ofertas.")
      }

      return (await response.json()) as OffersResponse
    },
    initialData,
    placeholderData: (previous) => previous,
  })

  const { data: catalogsData } = useQuery<OffersCatalogsResponse>({
    queryKey: ["offers-catalogs"],
    queryFn: async () => {
      const response = await fetch("/api/ofertas/catalogos")
      if (!response.ok) {
        throw new Error("No se pudieron cargar los catálogos de ofertas.")
      }

      return (await response.json()) as OffersCatalogsResponse
    },
    initialData: initialCatalogs,
    staleTime: 5 * 60 * 1000,
  })

  const categories = React.useMemo(
    () => ["all", ...catalogsData.categories],
    [catalogsData.categories]
  )

  const cities = React.useMemo(() => ["all", ...catalogsData.cities], [catalogsData.cities])

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize))
  const pages = React.useMemo(
    () => Array.from({ length: totalPages }, (_, index) => index + 1),
    [totalPages]
  )

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-6 space-y-2">
        <h1 className="text-3xl font-semibold">Ofertas laborales</h1>
        <p className="text-sm text-muted-foreground">
          Explora oportunidades y filtra por el tipo de trabajo que estás buscando.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="hidden h-fit rounded-xl border p-4 lg:block">
          <FiltersPanel
            category={query.category}
            workplaceType={query.workplace_type}
            employmentType={query.employment_type}
            city={query.city}
            categories={categories}
            cities={cities}
            onCategoryChange={(value) => updateUrl({ category: value }, true)}
            onWorkplaceTypeChange={(value) => updateUrl({ workplace_type: value }, true)}
            onEmploymentTypeChange={(value) => updateUrl({ employment_type: value }, true)}
            onCityChange={(value) => updateUrl({ city: value }, true)}
          />
        </aside>

        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full items-center gap-2 sm:max-w-md">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="lg:hidden">
                    <SlidersHorizontal className="size-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <SheetHeader>
                    <SheetTitle>Filtros</SheetTitle>
                    <SheetDescription>Ajusta tu búsqueda de ofertas</SheetDescription>
                  </SheetHeader>
                  <div className="px-4 pb-4">
                    <FiltersPanel
                      category={query.category}
                      workplaceType={query.workplace_type}
                      employmentType={query.employment_type}
                      city={query.city}
                      categories={categories}
                      cities={cities}
                      onCategoryChange={(value) => updateUrl({ category: value }, true)}
                      onWorkplaceTypeChange={(value) =>
                        updateUrl({ workplace_type: value }, true)
                      }
                      onEmploymentTypeChange={(value) =>
                        updateUrl({ employment_type: value }, true)
                      }
                      onCityChange={(value) => updateUrl({ city: value }, true)}
                    />
                  </div>
                </SheetContent>
              </Sheet>

              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por título o cargo"
                  value={titleInput}
                  onChange={(event) => setTitleInput(event.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isFetching ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
              <Badge variant="outline">{data.total} ofertas encontradas</Badge>
            </div>
          </div>

          {isFetching ? (
            <OffersGridSkeleton />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {data.items.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    <div className="space-y-3">
                      <p>No hay ofertas que coincidan con tu búsqueda y filtros.</p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setTitleInput("")
                          router.replace(pathname, { scroll: false })
                        }}
                      >
                        Limpiar todos los filtros
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                data.items.map((offer) => (
                  <Card
                    key={offer.id}
                    className="gap-3 rounded-2xl py-4 shadow-none transition hover:shadow-lg"
                  >
                    <CardHeader className="pb-0">
                      <CardTitle className="text-xl">{offer.title}</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-2">
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Tag className="size-4" />
                        <span>{offer.category}</span>
                      </p>
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="size-4" />
                        <span>
                          {offer.city}, {offer.state}
                        </span>
                      </p>
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BriefcaseBusiness className="size-4" />
                        <span>{offer.position}</span>
                      </p>
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        <Wallet className="size-4" />
                        <span>${offer.salary} / mes</span>
                      </p>

                      <Separator className="my-2" />

                      <div className="flex flex-wrap gap-2">
                        <Badge variant={workplaceBadgeVariant(offer.workplace_type)}>
                          {workplaceLabel[offer.workplace_type]}
                        </Badge>
                        <Badge variant={employmentBadgeVariant(offer.employment_type)}>
                          {employmentLabel[offer.employment_type]}
                        </Badge>
                      </div>
                    </CardContent>

                    <CardFooter>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/ofertas/${offer.id}`}>Ver más</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          )}

          {totalPages > 1 ? (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationLink
                    href="#"
                    size="default"
                    onClick={(event) => {
                      event.preventDefault()
                      updateUrl({ page: Math.max(1, query.page - 1) })
                    }}
                    className="gap-1 px-2.5 sm:pl-2.5"
                  >
                    <ChevronLeft className="size-4" />
                    <span>Anterior</span>
                  </PaginationLink>
                </PaginationItem>

                {pages.map((pageNumber) => (
                  <PaginationItem key={`page-${pageNumber}`}>
                    <PaginationLink
                      href="#"
                      isActive={query.page === pageNumber}
                      onClick={(event) => {
                        event.preventDefault()
                        updateUrl({ page: pageNumber })
                      }}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationLink
                    href="#"
                    size="default"
                    onClick={(event) => {
                      event.preventDefault()
                      updateUrl({ page: Math.min(totalPages, query.page + 1) })
                    }}
                    className="gap-1 px-2.5 sm:pr-2.5"
                  >
                    <span>Siguiente</span>
                    <ChevronRight className="size-4" />
                  </PaginationLink>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          ) : null}
        </div>
      </div>
    </section>
  )
}
