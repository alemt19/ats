"use client"

import * as React from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Loader2, Save } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "react/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "react/components/ui/card"
import { Input } from "react/components/ui/input"
import { Label } from "react/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "react/components/ui/select"
import { Skeleton } from "react/components/ui/skeleton"
import { Textarea } from "react/components/ui/textarea"

import {
  type Recruiter,
  type RecruiterPayload,
  type RecruitersCatalogsResponse,
} from "./recruiters-admin-types"

type RecruiterFormProps = {
  mode: "create" | "edit"
  recruiterId?: number
}

type RecruiterFormValues = {
  name: string
  lastname: string
  email: string
  password: string
  dni: string
  phone: string
  role: string
  country: string
  state: string
  city: string
  address: string
}

const EMPTY_VALUES: RecruiterFormValues = {
  name: "",
  lastname: "",
  email: "",
  password: "",
  dni: "",
  phone: "",
  role: "",
  country: "",
  state: "",
  city: "",
  address: "",
}

function valuesFromRecruiter(recruiter: Recruiter): RecruiterFormValues {
  return {
    name: recruiter.name,
    lastname: recruiter.lastname,
    email: recruiter.email,
    password: "",
    dni: recruiter.dni,
    phone: recruiter.phone,
    role: recruiter.role,
    country: recruiter.country,
    state: recruiter.state,
    city: recruiter.city,
    address: recruiter.address,
  }
}

export default function RecruiterForm({ mode, recruiterId }: RecruiterFormProps) {
  const router = useRouter()
  const [values, setValues] = React.useState<RecruiterFormValues>(EMPTY_VALUES)

  const catalogsQuery = useQuery<RecruitersCatalogsResponse>({
    queryKey: ["admin-recruiters-catalogs"],
    queryFn: async () => {
      const response = await fetch("/api/admin/reclutadores/catalogs")
      if (!response.ok) {
        throw new Error("No se pudieron cargar los catálogos")
      }

      return (await response.json()) as RecruitersCatalogsResponse
    },
  })

  const detailQuery = useQuery<Recruiter>({
    queryKey: ["admin-recruiter-detail", recruiterId],
    enabled: mode === "edit" && Number.isFinite(recruiterId),
    queryFn: async () => {
      const response = await fetch(`/api/admin/reclutadores/${recruiterId}`)

      if (response.status === 404) {
        throw new Error("El reclutador no existe")
      }

      if (!response.ok) {
        throw new Error("No se pudo cargar el reclutador")
      }

      return (await response.json()) as Recruiter
    },
  })

  const hasAppliedInitialValues = React.useRef(false)

  React.useEffect(() => {
    if (!catalogsQuery.data || hasAppliedInitialValues.current) {
      return
    }

    const firstState = catalogsQuery.data.states[0]
    const firstCity = firstState?.cities[0] ?? ""
    const firstRole = catalogsQuery.data.roles[0]?.technical_name ?? ""

    if (mode === "create") {
      setValues((previous) => ({
        ...previous,
        country: catalogsQuery.data.country,
        state: previous.state || firstState?.name || "",
        city: previous.city || firstCity,
        role: previous.role || firstRole,
      }))

      hasAppliedInitialValues.current = true
      return
    }

    if (mode === "edit" && detailQuery.data) {
      setValues(valuesFromRecruiter({
        ...detailQuery.data,
        country: catalogsQuery.data.country,
      }))
      hasAppliedInitialValues.current = true
    }
  }, [catalogsQuery.data, detailQuery.data, mode])

  const selectedState = React.useMemo(
    () => catalogsQuery.data?.states.find((state) => state.name === values.state),
    [catalogsQuery.data?.states, values.state]
  )

  const mutation = useMutation<Recruiter, Error, RecruiterPayload>({
    mutationFn: async (payload) => {
      const endpoint = mode === "create" ? "/api/admin/reclutadores" : `/api/admin/reclutadores/${recruiterId}`
      const method = mode === "create" ? "POST" : "PUT"

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(
          body?.message ??
            (mode === "create" ? "No se pudo crear el reclutador" : "No se pudo actualizar el reclutador")
        )
      }

      return (await response.json()) as Recruiter
    },
    onSuccess: (data) => {
      toast.success(mode === "create" ? "Reclutador creado correctamente" : "Reclutador actualizado")

      if (mode === "create") {
        router.push(`/admin/reclutadores/crear/email-verification?email=${encodeURIComponent(data.email)}`)
      } else {
        router.push("/admin/reclutadores")
      }

      router.refresh()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const isLoading = catalogsQuery.isLoading || (mode === "edit" && detailQuery.isLoading)

  const handleInputChange =
    (field: keyof RecruiterFormValues) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((previous) => ({
        ...previous,
        [field]: event.target.value,
      }))
    }

  const handleRoleChange = (role: string) => {
    setValues((previous) => ({
      ...previous,
      role,
    }))
  }

  const handleStateChange = (state: string) => {
    const stateOption = catalogsQuery.data?.states.find((item) => item.name === state)
    const firstCity = stateOption?.cities[0] ?? ""

    setValues((previous) => ({
      ...previous,
      state,
      city: firstCity,
    }))
  }

  const handleCityChange = (city: string) => {
    setValues((previous) => ({
      ...previous,
      city,
    }))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const requiredFields: Array<keyof RecruiterFormValues> = [
      "name",
      "lastname",
      "email",
      "role",
      "state",
      "city",
      "address",
    ]

    if (mode === "create") {
      requiredFields.push("password")
    }

    const hasMissingRequiredField = requiredFields.some((field) => values[field].trim().length === 0)

    if (hasMissingRequiredField) {
      toast.error("Completa los campos requeridos")
      return
    }

    mutation.mutate({
      name: values.name,
      lastname: values.lastname,
      email: values.email,
      password: values.password,
      dni: values.dni,
      phone: values.phone,
      role: values.role,
      country: values.country,
      state: values.state,
      city: values.city,
      address: values.address,
    })
  }

  if (isLoading) {
    return (
      <section className="mx-auto w-full max-w-4xl space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-140 w-full" />
      </section>
    )
  }

  if (catalogsQuery.error) {
    return <p className="text-destructive">{catalogsQuery.error.message}</p>
  }

  if (mode === "edit" && detailQuery.error) {
    return <p className="text-destructive">{detailQuery.error.message}</p>
  }

  const stateOptions = catalogsQuery.data?.states ?? []
  const roleOptions = catalogsQuery.data?.roles ?? []
  const cityOptions = selectedState?.cities ?? []

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          {mode === "create" ? "Crear reclutador" : "Editar reclutador"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {mode === "create"
            ? "Completa la información del nuevo perfil de reclutador."
            : "Actualiza la información del perfil seleccionado."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del reclutador</CardTitle>
          <CardDescription>Todos los campos marcados con * son obligatorios.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input id="name" value={values.name} onChange={handleInputChange("name")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastname">Apellido *</Label>
                <Input id="lastname" value={values.lastname} onChange={handleInputChange("lastname")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo *</Label>
                <Input
                  id="email"
                  type="email"
                  value={values.email}
                  onChange={handleInputChange("email")}
                  disabled={mode === "edit"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{mode === "edit" ? "Nueva contraseña" : "Contraseña *"}</Label>
                <Input
                  id="password"
                  type="password"
                  value={values.password}
                  onChange={handleInputChange("password")}
                  placeholder={mode === "edit" ? "Dejar vacío para mantener la actual" : undefined}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dni">DNI</Label>
                <Input id="dni" value={values.dni} onChange={handleInputChange("dni")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" value={values.phone} onChange={handleInputChange("phone")} />
              </div>

              <div className="space-y-2">
                <Label>Rol *</Label>
                <Select value={values.role} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((roleOption) => (
                      <SelectItem key={roleOption.technical_name} value={roleOption.technical_name}>
                        {roleOption.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">País *</Label>
                <Input id="country" value={values.country} disabled readOnly />
              </div>

              <div className="space-y-2">
                <Label>Estado *</Label>
                <Select value={values.state} onValueChange={handleStateChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {stateOptions.map((stateOption) => (
                      <SelectItem key={stateOption.name} value={stateOption.name}>
                        {stateOption.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ciudad *</Label>
                <Select value={values.city} onValueChange={handleCityChange} disabled={cityOptions.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una ciudad" />
                  </SelectTrigger>
                  <SelectContent>
                    {cityOptions.length === 0 ? (
                      <SelectItem value="no-city" disabled>
                        Sin ciudades disponibles
                      </SelectItem>
                    ) : (
                      cityOptions.map((cityOption) => (
                        <SelectItem key={cityOption} value={cityOption}>
                          {cityOption}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección *</Label>
              <Textarea id="address" value={values.address} onChange={handleInputChange("address")} rows={3} />
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/reclutadores">Cancelar</Link>
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
                    {mode === "create" ? "Crear reclutador" : "Guardar cambios"}
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
