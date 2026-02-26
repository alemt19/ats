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
  email: string
  dni: string
  phone: string
  phone_prefix: string
  role: string
  country: string
  state: string
  city: string
  address: string
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

  const [avatarPreview, setAvatarPreview] = React.useState<string>(
    initialProfile.profile_picture || "https://i.pravatar.cc/150?img=32"
  )
  const [profileImageFile, setProfileImageFile] = React.useState<File | null>(null)

  const [values, setValues] = React.useState<MiPerfilFormValues>({
    profile_picture: initialProfile.profile_picture,
    name: initialProfile.name,
    lastname: initialProfile.lastname,
    email: initialProfile.email,
    dni: initialProfile.dni,
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
      setValues((previous) => ({
        ...previous,
        profile_picture: updated.profile_picture,
        name: updated.name,
        lastname: updated.lastname,
        dni: updated.dni,
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
    }

  const handleStateChange = (state: string) => {
    const stateOption = catalogs.states.find((item) => item.name === state)
    const firstCity = stateOption?.cities[0] ?? ""

    setValues((previous) => ({
      ...previous,
      state,
      city: previous.state === state ? previous.city : firstCity,
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

    const requiredFields: Array<keyof MiPerfilFormValues> = [
      "name",
      "lastname",
      "state",
      "city",
      "address",
    ]

    const hasMissingRequiredField = requiredFields.some((field) => values[field].trim().length === 0)

    if (hasMissingRequiredField) {
      toast.error("Completa los campos requeridos")
      return
    }

    const payload = new FormData()

    payload.append("name", values.name)
    payload.append("lastname", values.lastname)
    payload.append("dni", values.dni)
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
    <section className="mx-auto w-full max-w-4xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Mi perfil</h1>
        <p className="text-muted-foreground text-sm">Actualiza los datos de tu perfil administrativo.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del administrador</CardTitle>
          <CardDescription>Campos del perfil en modo edición.</CardDescription>
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
                <Label htmlFor="name">Nombre *</Label>
                <Input id="name" value={values.name} onChange={handleInputChange("name")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastname">Apellido *</Label>
                <Input id="lastname" value={values.lastname} onChange={handleInputChange("lastname")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input id="email" value={values.email} disabled readOnly />
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
                <Label htmlFor="country">País</Label>
                <Input id="country" value={values.country} disabled readOnly />
              </div>

              <div className="space-y-2">
                <Label>Estado *</Label>
                <Select value={values.state} onValueChange={handleStateChange}>
                  <SelectTrigger>
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

            <div className="flex justify-end">
              <Button type="submit" disabled={mutation.isPending}>
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
