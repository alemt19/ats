"use client"

import * as React from "react"
import { useMutation } from "@tanstack/react-query"
import { Loader2, Save } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "react/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "react/components/ui/card"
import { Input } from "react/components/ui/input"
import { Label } from "react/components/ui/label"
import { Textarea } from "react/components/ui/textarea"
import { useSetBreadcrumbTitle } from "react/contexts/breadcrumb-title-context"

type GenericJobDescriptionFormProps = {
  mode: "create" | "edit"
  descriptionId?: number
  initialPosition?: string
  initialDescription?: string
}

type GenericJobDescriptionPayload = {
  id: number
  position: string
  description: string
}

export default function GenericJobDescriptionForm({
  mode,
  descriptionId,
  initialPosition = "",
  initialDescription = "",
}: GenericJobDescriptionFormProps) {
  const router = useRouter()
  const [position, setPosition] = React.useState(initialPosition)
  const [description, setDescription] = React.useState(initialDescription)

  useSetBreadcrumbTitle(
    `generic-job-description-${descriptionId ?? 0}`,
    mode === "edit" ? initialPosition : ""
  )

  const mutation = useMutation<GenericJobDescriptionPayload, Error, { position: string; description: string }>({
    mutationFn: async (values) => {
      const endpoint = mode === "create" ? "/api/admin/descripciones-ofertas" : `/api/admin/descripciones-ofertas/${descriptionId}`
      const method = mode === "create" ? "POST" : "PUT"

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(
          body?.message ??
            (mode === "create"
              ? "No se pudo crear la descripción de oferta"
              : "No se pudo actualizar la descripción de oferta")
        )
      }

      return (await response.json()) as GenericJobDescriptionPayload
    },
    onSuccess: (data) => {
      toast.success(mode === "create" ? "Descripción creada correctamente" : "Descripción actualizada")

      if (mode === "create") {
        router.push(`/admin/descripciones-ofertas/${data.id}`)
      } else {
        router.push("/admin/descripciones-ofertas")
      }

      router.refresh()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedPosition = position.trim()
    const trimmedDescription = description.trim()

    if (!trimmedPosition) {
      toast.error("El puesto es requerido")
      return
    }

    if (!trimmedDescription) {
      toast.error("La descripción es requerida")
      return
    }

    mutation.mutate({ position: trimmedPosition, description: trimmedDescription })
  }

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          {mode === "create" ? "Crear descripción de oferta" : "Editar descripción de oferta"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {mode === "create"
            ? "Registra una descripción genérica reutilizable para múltiples ofertas."
            : "Actualiza la posición y la descripción reutilizable seleccionada."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos de la descripción</CardTitle>
          <CardDescription>Completa el formulario para guardar la plantilla genérica.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="generic-job-description-position">Puesto</Label>
              <Input
                id="generic-job-description-position"
                value={position}
                onChange={(event) => setPosition(event.target.value)}
                placeholder="Ej. Ingeniero de computación"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="generic-job-description-description">Descripción</Label>
              <Textarea
                id="generic-job-description-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe el perfil genérico de la oferta"
                className="min-h-48"
              />
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/descripciones-ofertas">Cancelar</Link>
              </Button>

              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 size-4" />
                    {mode === "create" ? "Crear descripción" : "Guardar cambios"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}