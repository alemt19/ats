"use client"

import * as React from "react"
import { useMutation } from "@tanstack/react-query"
import { Camera, Loader2, Save } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "react/components/ui/avatar"
import { Badge } from "react/components/ui/badge"
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
import { Textarea } from "react/components/ui/textarea"
import { type DniPrefix, buildDni, splitDni, validateDni } from "react/lib/dni"

import type {
  AdminProfile,
  AdminProfileCatalogsResponse,
  AdminProfilePayload,
} from "./mi-perfil-types"

type MiPerfilFormProps = {
  initialProfile: AdminProfile
  catalogs: AdminProfileCatalogsResponse
}

type MiPerfilFormValues = {
  profile_picture: string
  name: string
  lastname: string
  birth_date: string
  email: string
  dni_prefix: DniPrefix
  dni: string
  phone: string
  phone_prefix: string
  role: string
  country: string
  state: string
  city: string
  address: string
}

type MiPerfilField =
  | "name"
  | "lastname"
  | "birth_date"
  | "dni"
  | "phone"
  | "state"
  | "city"
  | "address"

type MiPerfilFieldErrors = Partial<Record<MiPerfilField, string>>

const NAME_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]+$/

function sanitizeNameInput(value: string) {
  return value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]/g, "")
}

function getTodayIso() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function isFutureDate(dateValue: string) {
  if (!dateValue) {
    return false
  }

  return dateValue > getTodayIso()
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

function toInitials(name: string) {
  return name
    .split(" ")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((value) => value[0]?.toUpperCase() ?? "")
    .join("")
}

function roleLabel(technicalName: string, catalogs: AdminProfileCatalogsResponse) {
  return catalogs.roles.find((role) => role.technical_name === technicalName)?.display_name ?? technicalName
}

export default function MiPerfilForm({ initialProfile, catalogs }: MiPerfilFormProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const parsedDni = splitDni(initialProfile.dni)

  const [avatarPreview, setAvatarPreview] = React.useState<string>(
    initialProfile.profile_picture || ""
  )
  const [profileImageFile, setProfileImageFile] = React.useState<File | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<MiPerfilFieldErrors>({})

  const [values, setValues] = React.useState<MiPerfilFormValues>({
    profile_picture: initialProfile.profile_picture,
    name: initialProfile.name,
    lastname: initialProfile.lastname,
    birth_date: initialProfile.birth_date,
    email: initialProfile.email,
    dni_prefix: parsedDni.prefix,
    dni: parsedDni.number,
    phone: extractPhoneNumber(initialProfile.phone, catalogs.country_phone_prefix),
    phone_prefix: catalogs.country_phone_prefix,
    role: initialProfile.role,
    country: catalogs.country,
    state: initialProfile.state,
    city: initialProfile.city,
    address: initialProfile.address,
  })

  const selectedState = React.useMemo(
    () => catalogs.states.find((state) => state.name === values.state),
    [catalogs.states, values.state]
  )

  const mutation = useMutation<AdminProfile, Error, FormData>({
    mutationFn: async (payload) => {
      const response = await fetch("/api/admin/mi-perfil", {
        method: "PUT",
        body: payload,
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message ?? "No se pudo actualizar el perfil")
      }

      return (await response.json()) as AdminProfile
    },
    onSuccess: (updated) => {
      const nextDni = splitDni(updated.dni)

      setAvatarPreview(updated.profile_picture || "")
      setFieldErrors({})
      setValues((previous) => ({
        ...previous,
        profile_picture: updated.profile_picture,
        name: updated.name,
        lastname: updated.lastname,
        birth_date: updated.birth_date,
        dni_prefix: nextDni.prefix,
        dni: nextDni.number,
        phone: extractPhoneNumber(updated.phone, previous.phone_prefix),
        country: updated.country,
        state: updated.state,
        city: updated.city,
        address: updated.address,
      }))
      toast.success("Perfil actualizado")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleInputChange =
    (field: keyof MiPerfilFormValues) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((previous) => ({
        ...previous,
        [field]: event.target.value,
      }))

      if (field in fieldErrors) {
        setFieldErrors((previous) => ({
          ...previous,
          [field]: undefined,
        }))
      }
    }

  const handleStateChange = (state: string) => {
    const stateOption = catalogs.states.find((item) => item.name === state)
    const firstCity = stateOption?.cities[0] ?? ""

    setValues((previous) => ({
      ...previous,
      state,
      city: previous.state === state ? previous.city : firstCity,
    }))

    setFieldErrors((previous) => ({
      ...previous,
      state: undefined,
      city: undefined,
    }))
  }

  const handleCityChange = (city: string) => {
    setValues((previous) => ({
      ...previous,
      city,
    }))

    setFieldErrors((previous) => ({
      ...previous,
      city: undefined,
    }))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors: MiPerfilFieldErrors = {}

    if (!values.name.trim()) {
      nextErrors.name = "El nombre es obligatorio"
    }

    if (!values.lastname.trim()) {
      nextErrors.lastname = "El apellido es obligatorio"
    }

    if (!values.birth_date.trim()) {
      nextErrors.birth_date = "La fecha de nacimiento es obligatoria"
    }

    if (!values.dni.trim()) {
      nextErrors.dni = "La cédula es obligatoria"
    }

    if (!values.phone.trim()) {
      nextErrors.phone = "El teléfono es obligatorio"
    }

    if (!values.state.trim()) {
      nextErrors.state = "El estado es obligatorio"
    }

    if (!values.city.trim()) {
      nextErrors.city = "La ciudad es obligatoria"
    }

    if (!values.address.trim()) {
      nextErrors.address = "La dirección es obligatoria"
    }

    if (!nextErrors.name && !NAME_REGEX.test(values.name.trim())) {
      nextErrors.name = "El nombre solo puede contener letras"
    }

    if (!nextErrors.lastname && !NAME_REGEX.test(values.lastname.trim())) {
      nextErrors.lastname = "El apellido solo puede contener letras"
    }

    if (!nextErrors.birth_date && isFutureDate(values.birth_date.trim())) {
      nextErrors.birth_date = "La fecha de nacimiento no puede ser futura"
    }

    const dniValidation = validateDni(values.dni_prefix, values.dni)
    if (!nextErrors.dni && dniValidation) {
      nextErrors.dni = dniValidation
    }

    if (!nextErrors.phone && !/^\d{11}$/.test(values.phone.trim())) {
      nextErrors.phone = "El teléfono debe tener exactamente 11 dígitos"
    }

    if (Object.values(nextErrors).some(Boolean)) {
      setFieldErrors(nextErrors)
      toast.error("Corrige los campos marcados")
      return
    }

    setFieldErrors({})

    const payload = new FormData()

    payload.append("name", values.name)
    payload.append("lastname", values.lastname)
    payload.append("birth_date", values.birth_date)
    payload.append("dni", buildDni(values.dni_prefix, values.dni))
    payload.append("phone", values.phone)
    payload.append("phone_prefix", values.phone_prefix)
    payload.append("state", values.state)
    payload.append("city", values.city)
    payload.append("address", values.address)

    if (profileImageFile) {
      payload.append("profile_picture", profileImageFile)
    }

    mutation.mutate(payload)
  }

  const fullName = `${values.name} ${values.lastname}`.trim() || "Administrador"
  const cityOptions = selectedState?.cities ?? []

  return (
    <section className="mx-auto w-full max-w-4xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Mi perfil</h1>
        <p className="text-muted-foreground text-sm">Actualiza los datos de tu perfil administrativo.</p>
      </div>

      <Card className="gradient-border rounded-3xl bg-card/90 shadow-soft">
        <CardHeader className="space-y-1">
          <CardTitle>Datos del administrador</CardTitle>
          <CardDescription>Campos del perfil en modo edición.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="flex items-center gap-4 rounded-2xl border border-border/70 bg-background/80 p-4">
              <Avatar className="size-16">
                <AvatarImage src={avatarPreview} alt={fullName} />
                <AvatarFallback>{toInitials(fullName)}</AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <p className="font-medium">{fullName}</p>
                <Badge variant="secondary" className="w-fit">
                  {roleLabel(values.role, catalogs)}
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
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
                <Label htmlFor="name" className="text-sm font-medium text-foreground/85">Nombre *</Label>
                <Input
                  id="name"
                  value={values.name}
                  required
                  onChange={(event) => {
                    setValues((previous) => ({
                      ...previous,
                      name: sanitizeNameInput(event.target.value),
                    }))

                    if (fieldErrors.name) {
                      setFieldErrors((previous) => ({ ...previous, name: undefined }))
                    }
                  }}
                />
                {fieldErrors.name ? <p className="text-sm text-destructive">{fieldErrors.name}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastname" className="text-sm font-medium text-foreground/85">Apellido *</Label>
                <Input
                  id="lastname"
                  value={values.lastname}
                  required
                  onChange={(event) => {
                    setValues((previous) => ({
                      ...previous,
                      lastname: sanitizeNameInput(event.target.value),
                    }))

                    if (fieldErrors.lastname) {
                      setFieldErrors((previous) => ({ ...previous, lastname: undefined }))
                    }
                  }}
                />
                {fieldErrors.lastname ? <p className="text-sm text-destructive">{fieldErrors.lastname}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground/85">Correo</Label>
                <Input id="email" value={values.email} disabled readOnly className="bg-muted/40 text-muted-foreground/80" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birth_date" className="text-sm font-medium text-foreground/85">Fecha de nacimiento *</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={values.birth_date}
                  max={getTodayIso()}
                  required
                  onChange={handleInputChange("birth_date")}
                />
                {fieldErrors.birth_date ? <p className="text-sm text-destructive">{fieldErrors.birth_date}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dni" className="text-sm font-medium text-foreground/85">Cédula *</Label>
                <div className="flex gap-2">
                  <Select
                    value={values.dni_prefix}
                    onValueChange={(value) => {
                      setValues((previous) => ({
                        ...previous,
                        dni_prefix: value as DniPrefix,
                      }))
                    }}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue placeholder="Prefijo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="V">V</SelectItem>
                      <SelectItem value="E">E</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="dni"
                    value={values.dni}
                    inputMode="numeric"
                    required
                    onChange={(event) => {
                      const digitsOnly = event.target.value.replace(/\D/g, "")
                      setValues((previous) => ({
                        ...previous,
                        dni: digitsOnly,
                      }))

                      if (fieldErrors.dni) {
                        setFieldErrors((previous) => ({ ...previous, dni: undefined }))
                      }
                    }}
                  />
                </div>
                {fieldErrors.dni ? <p className="text-sm text-destructive">{fieldErrors.dni}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-foreground/85">Teléfono *</Label>
                <div className="flex gap-2">
                  <Input id="phone_prefix" value={values.phone_prefix} readOnly className="w-24 bg-muted/40 text-muted-foreground/80" placeholder="+000" />
                  <Input
                    id="phone"
                    value={values.phone}
                    inputMode="numeric"
                    minLength={11}
                    maxLength={11}
                    required
                    placeholder="Número"
                    onChange={(event) => {
                      const digitsOnly = event.target.value.replace(/\D/g, "")
                      setValues((previous) => ({
                        ...previous,
                        phone: digitsOnly.slice(0, 11),
                      }))

                      if (fieldErrors.phone) {
                        setFieldErrors((previous) => ({ ...previous, phone: undefined }))
                      }
                    }}
                  />
                </div>
                {fieldErrors.phone ? <p className="text-sm text-destructive">{fieldErrors.phone}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="country" className="text-sm font-medium text-foreground/85">País</Label>
                <Input id="country" value={values.country} disabled readOnly className="bg-muted/40 text-muted-foreground/80" />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/85">Estado *</Label>
                <Select value={values.state} onValueChange={handleStateChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogs.states.map((stateOption) => (
                      <SelectItem key={stateOption.name} value={stateOption.name}>
                        {stateOption.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.state ? <p className="text-sm text-destructive">{fieldErrors.state}</p> : null}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/85">Ciudad *</Label>
                <Select value={values.city} onValueChange={handleCityChange} disabled={cityOptions.length === 0}>
                  <SelectTrigger className="w-full">
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
                {fieldErrors.city ? <p className="text-sm text-destructive">{fieldErrors.city}</p> : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium text-foreground/85">Dirección *</Label>
              <Textarea id="address" value={values.address} required onChange={handleInputChange("address")} rows={3} />
              {fieldErrors.address ? <p className="text-sm text-destructive">{fieldErrors.address}</p> : null}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={mutation.isPending} className="rounded-full px-5">
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 size-4" />
                    Guardar cambios
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


