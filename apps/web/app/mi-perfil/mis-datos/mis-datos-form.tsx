"use client"

import * as React from "react"
import { Camera } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "react/components/ui/avatar"
import { Button } from "react/components/ui/button"
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

  const venezuela = countries.find((country) => normalize(country.name) === "venezuela")
  const resolvedCountryId = initialProfile.country ?? venezuela?.id ?? ""
  const carabobo = states.find(
    (state) =>
      normalize(state.name) === "carabobo" &&
      (!venezuela || state.country_id === venezuela.id)
  )
  const resolvedStateId =
    initialProfile.state ??
    (resolvedCountryId === (venezuela?.id ?? "") ? carabobo?.id ?? "" : "")
  const resolvedCountry = countries.find((country) => country.id === resolvedCountryId)
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
      city: initialProfile.city ?? "",
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

    const payload = {
      profile_picture: profilePicture,
      name: values.name || null,
      lastname: values.lastname || null,
      birth_date: values.birth_date || null,
      country: values.country || null,
      state: values.state || null,
      city: values.city || null,
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
    <section className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mis datos</h1>
        <p className="text-sm text-muted-foreground">
          Completa y actualiza tu información personal.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarPreview || undefined} alt="Foto de perfil" />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>

            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
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
                  <FormLabel>Nombre</FormLabel>
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
                  <FormLabel>Apellido</FormLabel>
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
                  <FormLabel>Fecha de nacimiento</FormLabel>
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
                  <FormLabel>País</FormLabel>
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
                  <FormLabel>Estado</FormLabel>
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
                  <FormLabel>Ciudad</FormLabel>
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
                  <FormLabel>Dirección</FormLabel>
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
                  <FormLabel>Página de contacto</FormLabel>
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
                  <FormLabel>Teléfono</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      value={phonePrefix}
                      readOnly
                      className="w-24"
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
                  <FormLabel>DNI</FormLabel>
                  <FormControl>
                    <Input placeholder="Documento de identidad" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </Form>
    </section>
  )
}
