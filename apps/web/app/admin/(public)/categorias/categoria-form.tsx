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

type CategoriaFormProps = {
  mode: "create" | "edit"
  categoryId?: number
  initialName?: string
}

type CategoryPayload = {
  id: number
  name: string
}

export default function CategoriaForm({ mode, categoryId, initialName = "" }: CategoriaFormProps) {
  const router = useRouter()
  const [name, setName] = React.useState(initialName)

  const mutation = useMutation<CategoryPayload, Error, { name: string }>({
    mutationFn: async (values) => {
      const endpoint = mode === "create" ? "/api/admin/categorias" : `/api/admin/categorias/${categoryId}`
      const method = mode === "create" ? "POST" : "PUT"

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        throw new Error(
          mode === "create"
            ? "No se pudo crear la categoría"
            : "No se pudo actualizar la categoría"
        )
      }

      return (await response.json()) as CategoryPayload
    },
    onSuccess: (data) => {
      toast.success(mode === "create" ? "Categoría creada correctamente" : "Categoría actualizada")

      if (mode === "create") {
        router.push(`/admin/categorias/${data.id}`)
      } else {
        router.push("/admin/categorias")
      }

      router.refresh()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedName = name.trim()

    if (!trimmedName) {
      toast.error("El nombre es requerido")
      return
    }

    mutation.mutate({ name: trimmedName })
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          {mode === "create" ? "Crear categoría" : "Editar categoría"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {mode === "create"
            ? "Registra una nueva categoría para clasificar vacantes."
            : "Actualiza el nombre de la categoría seleccionada."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos de la categoría</CardTitle>
          <CardDescription>Completa el formulario para guardar los cambios.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="category-name">Nombre</Label>
              <Input
                id="category-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej. Tecnología"
                autoComplete="off"
              />
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/categorias">Cancelar</Link>
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
                    {mode === "create" ? "Crear categoría" : "Guardar cambios"}
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
