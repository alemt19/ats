"use client"

import * as React from "react"
import { BriefcaseBusiness, MapPin, Tag, Wallet } from "lucide-react"
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

                <Button asChild size="sm" variant="outline" className="rounded-full border-border/70 bg-background/70">
                  <Link href={`/ofertas/${application.offer_id}`}>Ver más</Link>
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
