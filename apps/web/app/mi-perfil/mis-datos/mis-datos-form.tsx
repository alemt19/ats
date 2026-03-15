"use client"

import * as React from "react"
import { Camera } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "react/components/ui/avatar"
import { Button } from "react/components/ui/button"
import { Card, CardContent } from "react/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "react/components/ui/form"
import { Input } from "react/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "react/components/ui/select"

export type Country = {
  id: string
  name: string
  phonecode: string
}

export type State = {
  id: string
  name: string
  country_id: string
}

export type City = {
  id: string
  name: string
  state_id: string
}

export type ProfileFormValues = {
  profile_picture: string
  name: string
  lastname: string
  birth_date: string
  country: string
  state: string
  city: string
  address: string
  contact_page: string
  phone: string
  dni: string
}

type MisDatosFormProps = {
  initialProfile: Partial<ProfileFormValues>
  countries: Country[]
  states: State[]
  cities: City[]
}

const apiBaseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:4000"

export default function MisDatosForm({
  initialProfile,
  countries,
  states,
  cities,
}: MisDatosFormProps) {
  const onlyDigits = (value: string) => value.replace(/\D/g, "")

  const toDateInputValue = (value?: string) => {
    if (!value) {
      return ""
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value
    }

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return ""
    }

    return parsed.toISOString().slice(0, 10)
  }

  const stripCountryCode = (phone: string, countryCode?: string) => {
    const digits = onlyDigits(phone)
    const codeDigits = onlyDigits(countryCode ?? "")

    if (!digits || !codeDigits) {
      return digits
    }

    if (digits.startsWith(codeDigits)) {
      return digits.slice(codeDigits.length)
    }

    return digits
  }

  const normalize = (value: string) => value.trim().toLowerCase()

  const findCountryByStoredValue = (value?: string) => {
    if (!value) {
      return undefined
    }

    return countries.find(
      (country) => country.id === value || normalize(country.name) === normalize(value)
    )
  }

  const findStateByStoredValue = (value?: string, countryId?: string) => {
    if (!value) {
      return undefined
    }

    return states.find((state) => {
      if (countryId && state.country_id !== countryId) {
        return false
      }

      return state.id === value || normalize(state.name) === normalize(value)
    })
  }

  const findCityByStoredValue = (value?: string, stateId?: string) => {
    if (!value) {
      return undefined
    }

    return cities.find((city) => {
      if (stateId && city.state_id !== stateId) {
        return false
      }

      return city.id === value || normalize(city.name) === normalize(value)
    })
  }

  const venezuela = countries.find((country) => normalize(country.name) === "venezuela")
  const resolvedCountry = findCountryByStoredValue(initialProfile.country) ?? venezuela
  const resolvedCountryId = resolvedCountry?.id ?? ""
  const carabobo = states.find(
    (state) =>
      normalize(state.name) === "carabobo" &&
      (!venezuela || state.country_id === venezuela.id)
  )
  const resolvedState =
    findStateByStoredValue(initialProfile.state, resolvedCountryId) ??
    (resolvedCountryId === (venezuela?.id ?? "") ? carabobo : undefined)
  const resolvedStateId = resolvedState?.id ?? ""
  const resolvedCity = findCityByStoredValue(initialProfile.city, resolvedStateId)
  const resolvedPhone = stripCountryCode(initialProfile.phone ?? "", resolvedCountry?.phonecode)

  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const [avatarPreview, setAvatarPreview] = React.useState<string>(
    initialProfile.profile_picture ?? ""
  )
  const [profileImageFile, setProfileImageFile] = React.useState<File | null>(null)

  const form = useForm<ProfileFormValues>({
    defaultValues: {
      profile_picture: initialProfile.profile_picture ?? "",
      name: initialProfile.name ?? "",
      lastname: initialProfile.lastname ?? "",
      birth_date: toDateInputValue(initialProfile.birth_date),
      country: resolvedCountryId,
      state: resolvedStateId,
      city: resolvedCity?.id ?? "",
      address: initialProfile.address ?? "",
      contact_page: initialProfile.contact_page ?? "",
      phone: resolvedPhone,
      dni: initialProfile.dni ?? "",
    },
  })

  const selectedCountryId = form.watch("country")
  const selectedStateId = form.watch("state")
  const watchedName = form.watch("name")
  const watchedLastname = form.watch("lastname")

  const availableStates = React.useMemo(
    () => states.filter((state) => state.country_id === selectedCountryId),
    [states, selectedCountryId]
  )

  const availableCities = React.useMemo(
    () => cities.filter((city) => city.state_id === selectedStateId),
    [cities, selectedStateId]
  )

  const selectedCountry = React.useMemo(
    () => countries.find((country) => country.id === selectedCountryId),
    [countries, selectedCountryId]
  )

  const phonePrefix = selectedCountry?.phonecode ? `+${selectedCountry.phonecode}` : ""

  const onSubmit = async (values: ProfileFormValues) => {
    let profilePicture = avatarPreview.startsWith("blob:")
      ? initialProfile.profile_picture ?? null
      : avatarPreview || null

    if (profileImageFile) {
      const uploadForm = new FormData()
      uploadForm.append("profile_picture", profileImageFile)

      const uploadResponse = await fetch(`${apiBaseUrl}/api/candidates/me/profile-picture`, {
        method: "POST",
        credentials: "include",
        body: uploadForm,
      })

      if (!uploadResponse.ok) {
        toast.error("No se pudo subir la imagen de perfil")
        return
      }

      const uploadPayload = (await uploadResponse.json()) as {
        data?: { imageUrl?: string }
        imageUrl?: string
      }

      const uploadedImageUrl = uploadPayload?.data?.imageUrl ?? uploadPayload?.imageUrl
      if (uploadedImageUrl) {
        profilePicture = uploadedImageUrl
        setAvatarPreview(uploadedImageUrl)
      }
    }

    const normalizedLocalPhone = stripCountryCode(values.phone, selectedCountry?.phonecode)

    const selectedState = availableStates.find((state) => state.id === values.state)
    const selectedCity = availableCities.find((city) => city.id === values.city)

    const payload = {
      profile_picture: profilePicture,
      name: values.name || null,
      lastname: values.lastname || null,
      birth_date: values.birth_date || null,
      country: selectedCountry?.name || null,
      state: selectedState?.name || null,
      city: selectedCity?.name || null,
      address: values.address || null,
      contact_page: values.contact_page || null,
      phone: normalizedLocalPhone
        ? (phonePrefix ? `${phonePrefix}${normalizedLocalPhone}` : normalizedLocalPhone)
        : null,
      dni: values.dni || null,
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/candidates/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error("No se pudo guardar el perfil")
      }

      toast.success("Datos actualizados correctamente")
      setProfileImageFile(null)
    } catch {
      toast.error("No se pudieron guardar los cambios")
    }
  }

  const initials =
    `${watchedName?.[0] ?? ""}${watchedLastname?.[0] ?? ""}`.toUpperCase() || "US"

  return (
    <section className="mx-auto w-full max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Mis datos</h1>
        <p className="text-sm text-foreground/70">
          Completa y actualiza tu información personal.
        </p>
      </div>

      <Form {...form}>
        <Card className="gradient-border rounded-3xl bg-card/90 shadow-soft">
          <CardContent className="pt-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex items-center gap-4 rounded-2xl border border-border/70 bg-background/80 p-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarPreview || undefined} alt="Foto de perfil" />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>

            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
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
                  form.setValue("profile_picture", file.name)
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground/85">Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Tu nombre" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground/85">Apellido</FormLabel>
                  <FormControl>
                    <Input placeholder="Tu apellido" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="birth_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground/85">Fecha de nacimiento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground/85">País</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona un país" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.id} value={country.id}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground/85">Estado</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value)
                      form.setValue("city", "")
                    }}
                    disabled={!selectedCountryId}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona un estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableStates.map((state) => (
                        <SelectItem key={state.id} value={state.id}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground/85">Ciudad</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!selectedStateId}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona una ciudad" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableCities.map((city) => (
                        <SelectItem key={city.id} value={city.id}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground/85">Dirección</FormLabel>
                  <FormControl>
                    <Input placeholder="Dirección" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact_page"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground/85">Página de contacto</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground/85">Teléfono</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      value={phonePrefix}
                      readOnly
                      className="w-24 bg-muted/40 text-muted-foreground/80"
                      placeholder="+000"
                    />
                    <FormControl>
                      <Input
                        placeholder="Número"
                        inputMode="numeric"
                        value={field.value}
                        onChange={(event) => {
                          const digitsOnly = event.target.value.replace(/\D/g, "")
                          field.onChange(digitsOnly)
                        }}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dni"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground/85">Cédula</FormLabel>
                  <FormControl>
                    <Input placeholder="Documento de identidad" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting} className="rounded-full px-5">
                {form.formState.isSubmitting ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </Form>
    </section>
  )
}
