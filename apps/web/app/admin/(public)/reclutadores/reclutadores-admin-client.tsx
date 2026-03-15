"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronLeft, ChevronRight, Eye, Loader2, Plus, Search } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Badge } from "react/components/ui/badge"
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
  type RecruitersQueryParams,
  type RecruitersResponse,
  normalizeRecruitersQuery,
} from "./recruiters-admin-types"

type ReclutadoresAdminClientProps = {
  initialQuery: RecruitersQueryParams
  initialData: RecruitersResponse
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
        <TableRow key={`recruiter-row-skeleton-${index}`}>
          <TableCell>
            <Skeleton className="h-4 w-44" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-56" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-32" />
          </TableCell>
          <TableCell className="text-center">
            <Skeleton className="ml-auto h-8 w-8" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

export default function ReclutadoresAdminClient({ initialQuery, initialData }: ReclutadoresAdminClientProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const query = React.useMemo(
    () =>
      normalizeRecruitersQuery({
        search: searchParams.get("search") ?? initialQuery.search,
        page: searchParams.get("page") ?? String(initialQuery.page),
        pageSize: searchParams.get("pageSize") ?? String(initialQuery.pageSize),
      }),
    [initialQuery.page, initialQuery.pageSize, initialQuery.search, searchParams]
  )

  const [searchInput, setSearchInput] = React.useState(query.search)

  React.useEffect(() => {
    setSearchInput(query.search)
  }, [query.search])

  const updateUrl = React.useCallback(
    (updates: Partial<RecruitersQueryParams>, resetPage = false) => {
      const next = normalizeRecruitersQuery({
        search: updates.search ?? query.search,
        page: resetPage ? "1" : String(updates.page ?? query.page),
        pageSize: String(updates.pageSize ?? query.pageSize),
      })

      const nextParams = new URLSearchParams()
      if (next.search) nextParams.set("search", next.search)
      if (next.page !== 1) nextParams.set("page", String(next.page))
      if (next.pageSize !== PAGE_SIZE) nextParams.set("pageSize", String(next.pageSize))

      const queryString = nextParams.toString()
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
    },
    [pathname, query, router]
  )

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchInput !== query.search) {
        updateUrl({ search: searchInput }, true)
      }
    }, 400)

    return () => clearTimeout(timeout)
  }, [query.search, searchInput, updateUrl])

  const { data, isFetching } = useQuery<RecruitersResponse>({
    queryKey: ["admin-recruiters", query.search, query.page, query.pageSize],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (query.search) params.set("search", query.search)
      params.set("page", String(query.page))
      params.set("pageSize", String(query.pageSize))

      const response = await fetch(`/api/admin/reclutadores?${params.toString()}`)
      if (!response.ok) {
        throw new Error("No se pudieron cargar los reclutadores")
      }

      return (await response.json()) as RecruitersResponse
    },
    initialData,
    placeholderData: (previous) => previous,
  })

  const recruiters = data?.items ?? []
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

  const getRoleLabel = (role: string) => {
    if (role === "head_of_recruiters") {
      return "Jefe de reclutadores"
    }

    if (role === "recruiter") {
      return "Reclutador"
    }

    return role
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Gestión de reclutadores</h1>
          <p className="text-sm text-muted-foreground">Gestiona cuentas y permisos del equipo.</p>
        </div>
        <Button asChild className="rounded-full sm:w-auto">
          <Link href="/admin/reclutadores/crear">
            <Plus className="mr-2 size-4" />
            Crear nuevo reclutador
          </Link>
        </Button>
      </div>

      <Card className="gradient-border container mx-auto gap-4 rounded-3xl bg-card/90 shadow-soft @container">
        <CardHeader>
          <div className="relative w-full max-w-xl">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Buscar por nombre, correo o cédula"
              className="pl-9"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isFetching && !recruiters.length ? <TableSkeleton /> : null}

          <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/80">
            <Table>
              <TableHeader className="bg-muted/60 text-foreground/80">
                <TableRow className="border-b border-border/70">
                  <TableHead className="text-xs font-medium text-foreground/70">Nombre</TableHead>
                  <TableHead className="text-xs font-medium text-foreground/70">Correo</TableHead>
                  <TableHead className="text-xs font-medium text-foreground/70">Cédula</TableHead>
                  <TableHead className="text-xs font-medium text-foreground/70">Rol</TableHead>
                  <TableHead className="w-12 text-center text-xs font-medium text-foreground/70">Ver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isFetching ? <TableRowsSkeleton rows={Math.min(query.pageSize, 8)} /> : null}

                {!isFetching &&
                  recruiters.map((recruiter) => (
                    <TableRow
                      key={recruiter.id}
                      className="transition-colors hover:bg-muted/35 data-[state=selected]:bg-muted/45"
                    >
                      <TableCell className="font-medium">{`${recruiter.name} ${recruiter.lastname}`}</TableCell>
                      <TableCell>{recruiter.email}</TableCell>
                      <TableCell>{recruiter.dni || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={recruiter.role === "head_of_recruiters" ? "default" : "secondary"}>
                          {getRoleLabel(recruiter.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="w-12 text-center">
                        <div className="flex items-center justify-center">
                          <Button variant="ghost" size="icon" asChild className="rounded-full">
                            <Link
                              href={`/admin/reclutadores/${encodeURIComponent(String(recruiter.id))}`}
                              aria-label={`Ver reclutador ${recruiter.name} ${recruiter.lastname}`}
                            >
                              <Eye className="size-4" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                {!isFetching && !recruiters.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground py-10 text-center">
                      No se encontraron reclutadores con la búsqueda ingresada.
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

          {isFetching && recruiters.length ? (
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
