"use client"

import * as React from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Camera, Loader2, Save } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "react/components/ui/avatar"
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
  profile_picture: string
  name: string
  lastname: string
  email: string
  password: string
  dni: string
  phone: string
  phone_prefix: string
  role: string
  country: string
  state: string
  city: string
  address: string
}

const EMPTY_VALUES: RecruiterFormValues = {
  profile_picture: "",
  name: "",
  lastname: "",
  email: "",
  password: "",
  dni: "",
  phone: "",
  phone_prefix: "",
  role: "",
  country: "",
  state: "",
  city: "",
  address: "",
}

function toInitials(name: string) {
  return name
    .split(" ")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((value) => value[0]?.toUpperCase() ?? "")
    .join("")
}

function extractPhoneNumber(phone: string, prefix: string) {
  const cleanPhone = phone.trim()
  const cleanPrefix = prefix.trim()

  if (!cleanPhone) {
    return ""
  }

  if (cleanPrefix && cleanPhone.startsWith(cleanPrefix)) {
    return cleanPhone.slice(cleanPrefix.length).replace(/\D/g, "")
  }

  return cleanPhone.replace(/\D/g, "")
}

function valuesFromRecruiter(recruiter: Recruiter, phonePrefix: string): RecruiterFormValues {
  return {
    profile_picture: recruiter.profile_picture,
    name: recruiter.name,
    lastname: recruiter.lastname,
    email: recruiter.email,
    password: "",
    dni: recruiter.dni,
    phone: extractPhoneNumber(recruiter.phone, phonePrefix),
    phone_prefix: phonePrefix,
    role: recruiter.role,
    country: recruiter.country,
    state: recruiter.state,
    city: recruiter.city,
    address: recruiter.address,
  }
}

export default function RecruiterForm({ mode, recruiterId }: RecruiterFormProps) {
  const router = useRouter()
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const [avatarPreview, setAvatarPreview] = React.useState<string>("https://i.pravatar.cc/150?img=32")
  const [profileImageFile, setProfileImageFile] = React.useState<File | null>(null)
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
        phone_prefix: catalogsQuery.data.country_phone_prefix,
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
      }, catalogsQuery.data.country_phone_prefix))
      hasAppliedInitialValues.current = true
    }
  }, [catalogsQuery.data, detailQuery.data, mode])

  React.useEffect(() => {
    if (mode === "edit" && detailQuery.data) {
      setAvatarPreview(detailQuery.data.profile_picture || "https://i.pravatar.cc/150?img=32")
      return
    }

    if (mode === "create") {
      setAvatarPreview("https://i.pravatar.cc/150?img=32")
    }
  }, [detailQuery.data, mode])

  const selectedState = React.useMemo(
    () => catalogsQuery.data?.states.find((state) => state.name === values.state),
    [catalogsQuery.data?.states, values.state]
  )

  const mutation = useMutation<Recruiter, Error, FormData>({
    mutationFn: async (payload) => {
      const endpoint = mode === "create" ? "/api/admin/reclutadores" : `/api/admin/reclutadores/${recruiterId}`
      const method = mode === "create" ? "POST" : "PUT"

      const response = await fetch(endpoint, {
        method,
        body: payload,
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

    const payload = new FormData()

    payload.append("name", values.name)
    payload.append("lastname", values.lastname)
    payload.append("email", values.email)
    payload.append("password", values.password)
    payload.append("dni", values.dni)
    payload.append("phone", values.phone)
    payload.append("phone_prefix", values.phone_prefix)
    payload.append("role", values.role)
    payload.append("country", values.country)
    payload.append("state", values.state)
    payload.append("city", values.city)
    payload.append("address", values.address)

    if (profileImageFile) {
      payload.append("profile_picture", profileImageFile)
    }

    mutation.mutate(payload)
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
  const fullName = `${values.name} ${values.lastname}`.trim() || "Reclutador"

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
            <div className="flex items-center gap-4 rounded-md border p-4">
              <Avatar className="size-16">
                <AvatarImage src={avatarPreview} alt={fullName} />
                <AvatarFallback>{toInitials(fullName)}</AvatarFallback>
              </Avatar>

              <div className="space-y-2">
                <p className="font-medium">{fullName}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Camera className="mr-2 size-4" />
                  Cambiar foto
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]

                    if (!file) {
                      return
                    }

                    const localUrl = URL.createObjectURL(file)
                    setAvatarPreview(localUrl)
                    setProfileImageFile(file)
                    setValues((previous) => ({
                      ...previous,
                      profile_picture: file.name,
                    }))
                  }}
                />
              </div>
            </div>

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
                <div className="flex gap-2">
                  <Input id="phone_prefix" value={values.phone_prefix} readOnly className="w-24" placeholder="+000" />
                  <Input
                    id="phone"
                    value={values.phone}
                    inputMode="numeric"
                    placeholder="Número"
                    onChange={(event) => {
                      const digitsOnly = event.target.value.replace(/\D/g, "")
                      setValues((previous) => ({
                        ...previous,
                        phone: digitsOnly,
                      }))
                    }}
                  />
                </div>
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
