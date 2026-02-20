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
import { cn } from "react/lib/utils"
import { usePostulacionesFilters } from "./postulaciones-shell"

export type ApplicationStatus =
  | "pending"
  | "interview"
  | "rejected"
  | "accepted"
  | "in_review"

export type JobApplication = {
  id: number
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
}

const statusLabels: Record<ApplicationStatus, string> = {
  pending: "Pendiente",
  interview: "Entrevista",
  rejected: "Rechazado",
  accepted: "Aceptado",
  in_review: "En revision",
}

function getStatusBadgeVariant(status: ApplicationStatus) {
  switch (status) {
    case "rejected":
      return "destructive"
    case "pending":
      return "outline"
    case "interview":
      return "default"
    case "accepted":
      return "secondary"
    case "in_review":
      return "outline"
    default:
      return "outline"
  }
}

export default function PostulacionesList({ applications }: PostulacionesListProps) {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="min-w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category === "all" ? "Todas las categorias" : category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="min-w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="in_review">En revision</SelectItem>
            <SelectItem value="interview">Entrevista</SelectItem>
            <SelectItem value="accepted">Aceptado</SelectItem>
            <SelectItem value="rejected">Rechazado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filteredApplications.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No se encontraron postulaciones con los filtros actuales.
            </CardContent>
          </Card>
        ) : (
          filteredApplications.map((application) => (
            <Card key={application.id} className="gap-3 rounded-2xl py-4 shadow-none">
              <CardHeader className="space-y-1 pb-0">
                <h2 className="text-xl font-semibold text-neutral-800">
                  {application.title}
                </h2>
              </CardHeader>

              <CardContent className="space-y-2">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Tag className="size-4" />
                  <span>{application.category}</span>
                </p>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="size-4" />
                  <span>
                    {application.city}, {application.state}
                  </span>
                </p>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BriefcaseBusiness className="size-4" />
                  <span>{application.position}</span>
                </p>
                <p className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
                  <Wallet className="size-4" />
                  <span>${application.salary} / mes</span>
                </p>
              </CardContent>

              <CardFooter className="items-center justify-between gap-3 pt-2">
                <Badge
                  variant={getStatusBadgeVariant(application.status)}
                  className={cn(
                    application.status === "accepted" &&
                      "bg-emerald-500 text-white hover:bg-emerald-600"
                  )}
                >
                  {statusLabels[application.status]}
                </Badge>

                <Button asChild size="sm" variant="outline">
                  <Link href={`/ofertas/${application.id}`}>Ver mas</Link>
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
