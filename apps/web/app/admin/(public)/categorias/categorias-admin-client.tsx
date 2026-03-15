"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronLeft, ChevronRight, Eye, Loader2, Plus, Search } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Button } from "react/components/ui/button"
import { Card, CardContent, CardHeader } from "react/components/ui/card"
import { Input } from "react/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "react/components/ui/pagination"
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
  type AdminCategoriesQueryParams,
  type AdminCategoriesResponse,
  normalizeAdminCategoriesQuery,
} from "./categories-admin-types"

type CategoriasAdminClientProps = {
  initialQuery: AdminCategoriesQueryParams
  initialData: AdminCategoriesResponse
}

const PAGE_SIZE = 10

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
        <TableRow key={`category-row-skeleton-${index}`}>
          <TableCell>
            <Skeleton className="h-4 w-56" />
          </TableCell>
          <TableCell className="text-center">
            <Skeleton className="ml-auto h-8 w-8" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

export default function CategoriasAdminClient({ initialQuery, initialData }: CategoriasAdminClientProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const query = React.useMemo(
    () =>
      normalizeAdminCategoriesQuery({
        name: searchParams.get("name") ?? initialQuery.name,
        page: searchParams.get("page") ?? String(initialQuery.page),
        pageSize: searchParams.get("pageSize") ?? String(initialQuery.pageSize),
      }),
    [initialQuery.name, initialQuery.page, initialQuery.pageSize, searchParams]
  )

  const [nameInput, setNameInput] = React.useState(query.name)

  React.useEffect(() => {
    setNameInput(query.name)
  }, [query.name])

  const updateUrl = React.useCallback(
    (updates: Partial<AdminCategoriesQueryParams>, resetPage = false) => {
      const next = normalizeAdminCategoriesQuery({
        name: updates.name ?? query.name,
        page: resetPage ? "1" : String(updates.page ?? query.page),
        pageSize: String(updates.pageSize ?? query.pageSize),
      })

      const nextParams = new URLSearchParams()
      if (next.name) nextParams.set("name", next.name)
      if (next.page !== 1) nextParams.set("page", String(next.page))
      if (next.pageSize !== PAGE_SIZE) nextParams.set("pageSize", String(next.pageSize))

      const queryString = nextParams.toString()
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
    },
    [pathname, query, router]
  )

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (nameInput !== query.name) {
        updateUrl({ name: nameInput }, true)
      }
    }, 400)

    return () => clearTimeout(timeout)
  }, [nameInput, query.name, updateUrl])

  const { data, isFetching } = useQuery<AdminCategoriesResponse>({
    queryKey: ["admin-categories", query.name, query.page, query.pageSize],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (query.name) params.set("name", query.name)
      params.set("page", String(query.page))
      params.set("pageSize", String(query.pageSize))

      const response = await fetch(`/api/admin/categorias?${params.toString()}`)
      if (!response.ok) {
        throw new Error("No se pudieron cargar las categorías")
      }

      return (await response.json()) as AdminCategoriesResponse
    },
    initialData,
    placeholderData: (previous) => previous,
  })

  const categories = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize))
  const startItem = total === 0 ? 0 : (query.page - 1) * query.pageSize + 1
  const endItem = Math.min(query.page * query.pageSize, total)

  const onPageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === query.page) {
      return
    }

    updateUrl({ page: nextPage })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Gestión de categorías</h1>
          <p className="text-sm text-muted-foreground">Organiza y mantiene el catálogo de áreas.</p>
        </div>
        <Button asChild className="rounded-full sm:w-auto">
          <Link href="/admin/categorias/crear">
            <Plus className="mr-2 size-4" />
            Crear nueva categoría
          </Link>
        </Button>
      </div>

      <Card className="gradient-border container mx-auto gap-4 rounded-3xl bg-card/90 shadow-soft @container">
        <CardHeader>
          <div className="relative w-full max-w-xl">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Buscar categorías por nombre"
              className="pl-9"
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isFetching && !categories.length ? <TableSkeleton /> : null}

          <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/80">
            <Table>
              <TableHeader className="bg-muted/60 text-foreground/80">
                <TableRow className="border-b border-border/70">
                  <TableHead className="text-xs font-medium text-foreground/70">Nombre</TableHead>
                  <TableHead className="w-12 text-center text-xs font-medium text-foreground/70">Ver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isFetching ? <TableRowsSkeleton rows={Math.min(query.pageSize, 8)} /> : null}

                {!isFetching &&
                  categories.map((category) => (
                    <TableRow
                      key={category.id}
                      className="transition-colors hover:bg-muted/35 data-[state=selected]:bg-muted/45"
                    >
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="w-12 text-center">
                        <div className="flex items-center justify-center">
                          <Button variant="ghost" size="icon" asChild className="rounded-full">
                            <Link
                              href={`/admin/categorias/${encodeURIComponent(String(category.id))}`}
                              aria-label={`Ver categoría ${category.name}`}
                            >
                              <Eye className="size-4" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                {!isFetching && !categories.length ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-muted-foreground py-10 text-center">
                      No se encontraron categorías con la búsqueda ingresada.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
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
                          onPageChange(pageNumber)
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
                      onPageChange(query.page + 1)
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

          {isFetching && categories.length ? (
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
