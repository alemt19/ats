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
import { type DniPrefix, buildDni, splitDni, validateDni } from "react/lib/dni"

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
  const digitsPattern = /\d/
  const V_DNI_MIN = 100_000
  const V_DNI_MAX = 99_999_999
  const E_DNI_MIN = 80_000_000

  const getLocalTodayIso = () => {
    const now = new Date()
    const year = String(now.getFullYear())
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const todayIso = React.useMemo(() => getLocalTodayIso(), [])

  const isValidWebUrl = (value: string) => {
    const normalized = value.trim()
    if (!normalized) {
      return true
    }

    try {
      const parsed = new URL(normalized)
      return parsed.protocol === "http:" || parsed.protocol === "https:"
    } catch {
      return false
    }
  }

  const validateDniByPrefix = (prefix: DniPrefix, numberValue: string): string | null => {
    const baseValidation = validateDni(prefix, numberValue)
    if (baseValidation) {
      return baseValidation
    }

    const digits = onlyDigits(numberValue)
    if (!digits) {
      return null
    }

    const numericValue = Number.parseInt(digits, 10)
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return "Ingresa una cédula válida"
    }

    if (prefix === "V") {
      if (numericValue < V_DNI_MIN || numericValue > V_DNI_MAX) {
        return "Para cédulas V, el número debe estar entre 100.000 y 99.999.999"
      }

      return null
    }

    if (numericValue < E_DNI_MIN) {
      return "Para cédulas E, el número debe ser igual o mayor a 80.000.000"
    }

    return null
  }

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
  const initialDni = splitDni(initialProfile.dni)

  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const [avatarPreview, setAvatarPreview] = React.useState<string>(
    initialProfile.profile_picture ?? ""
  )
  const [profileImageFile, setProfileImageFile] = React.useState<File | null>(null)
  const [dniPrefix, setDniPrefix] = React.useState<DniPrefix>(initialDni.prefix)

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
      dni: initialDni.number,
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
    form.clearErrors()

    const trimmedName = values.name.trim()
    const trimmedLastname = values.lastname.trim()
    const trimmedBirthDate = values.birth_date.trim()
    const trimmedCountry = values.country.trim()
    const trimmedState = values.state.trim()
    const trimmedCity = values.city.trim()
    const trimmedAddress = values.address.trim()
    const trimmedPhone = values.phone.trim()
    const trimmedDni = values.dni.trim()
    const trimmedContactPage = values.contact_page.trim()

    let hasFormError = false

    if (!trimmedName) {
      form.setError("name", { type: "required", message: "El nombre es obligatorio" })
      hasFormError = true
    } else if (digitsPattern.test(trimmedName)) {
      form.setError("name", {
        type: "validate",
        message: "El nombre no puede contener números",
      })
      hasFormError = true
    }

    if (!trimmedLastname) {
      form.setError("lastname", { type: "required", message: "El apellido es obligatorio" })
      hasFormError = true
    } else if (digitsPattern.test(trimmedLastname)) {
      form.setError("lastname", {
        type: "validate",
        message: "El apellido no puede contener números",
      })
      hasFormError = true
    }

    if (!trimmedBirthDate) {
      form.setError("birth_date", {
        type: "required",
        message: "La fecha de nacimiento es obligatoria",
      })
      hasFormError = true
    } else if (trimmedBirthDate > todayIso) {
      form.setError("birth_date", {
        type: "validate",
        message: "La fecha de nacimiento no puede ser futura",
      })
      hasFormError = true
    }

    if (!trimmedCountry) {
      form.setError("country", { type: "required", message: "El país es obligatorio" })
      hasFormError = true
    }

    if (!trimmedState) {
      form.setError("state", { type: "required", message: "El estado es obligatorio" })
      hasFormError = true
    }

    if (!trimmedCity) {
      form.setError("city", { type: "required", message: "La ciudad es obligatoria" })
      hasFormError = true
    }

    if (!trimmedAddress) {
      form.setError("address", { type: "required", message: "La dirección es obligatoria" })
      hasFormError = true
    }

    if (!trimmedPhone) {
      form.setError("phone", { type: "required", message: "El teléfono es obligatorio" })
      hasFormError = true
    } else if (onlyDigits(trimmedPhone).length !== 11) {
      form.setError("phone", {
        type: "validate",
        message: "El teléfono debe tener exactamente 11 números (sin prefijo)",
      })
      hasFormError = true
    }

    if (!trimmedDni) {
      form.setError("dni", { type: "required", message: "La cédula es obligatoria" })
      hasFormError = true
    }

    if (trimmedContactPage && !isValidWebUrl(trimmedContactPage)) {
      form.setError("contact_page", {
        type: "validate",
        message: "La página de contacto debe ser una URL válida (http:// o https://)",
      })
      hasFormError = true
    }

    if (hasFormError) {
      return
    }

    const dniValidation = validateDniByPrefix(dniPrefix, values.dni)
    if (dniValidation) {
      form.setError("dni", { type: "validate", message: dniValidation })
      return
    }

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
      name: trimmedName || null,
      lastname: trimmedLastname || null,
      birth_date: trimmedBirthDate || null,
      country: selectedCountry?.name || null,
      state: selectedState?.name || null,
      city: selectedCity?.name || null,
      address: trimmedAddress || null,
      contact_page: trimmedContactPage || null,
      phone: normalizedLocalPhone
        ? (phonePrefix ? `${phonePrefix}${normalizedLocalPhone}` : normalizedLocalPhone)
        : null,
      dni: buildDni(dniPrefix, values.dni) || null,
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
              rules={{
                required: "El nombre es obligatorio",
                validate: (value) =>
                  !digitsPattern.test(value) || "El nombre no puede contener números",
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground/85">Nombre</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Tu nombre"
                      {...field}
                      onChange={(event) => {
                        field.onChange(event.target.value.replace(/\d/g, ""))
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastname"
              rules={{
                required: "El apellido es obligatorio",
                validate: (value) =>
                  !digitsPattern.test(value) || "El apellido no puede contener números",
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground/85">Apellido</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Tu apellido"
                      {...field}
                      onChange={(event) => {
                        field.onChange(event.target.value.replace(/\d/g, ""))
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="birth_date"
              rules={{
                required: "La fecha de nacimiento es obligatoria",
                validate: (value) =>
                  value <= todayIso || "La fecha de nacimiento no puede ser futura",
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground/85">Fecha de nacimiento</FormLabel>
                  <FormControl>
                    <Input type="date" max={todayIso} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country"
              rules={{
                required: "El país es obligatorio",
              }}
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
              rules={{
                required: "El estado es obligatorio",
              }}
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
              rules={{
                required: "La ciudad es obligatoria",
              }}
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
              rules={{
                required: "La dirección es obligatoria",
              }}
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
              rules={{
                validate: (value) =>
                  !value.trim() ||
                  isValidWebUrl(value) ||
                  "La página de contacto debe ser una URL válida (http:// o https://)",
              }}
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
              rules={{
                required: "El teléfono es obligatorio",
                validate: (value) =>
                  onlyDigits(value).length === 11 ||
                  "El teléfono debe tener exactamente 11 números (sin prefijo)",
              }}
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
                        maxLength={11}
                        value={field.value}
                        onChange={(event) => {
                          const digitsOnly = event.target.value.replace(/\D/g, "")
                          field.onChange(digitsOnly.slice(0, 11))
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
              rules={{
                required: "La cédula es obligatoria",
                validate: (value) => validateDniByPrefix(dniPrefix, value) ?? true,
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground/85">Cédula</FormLabel>
                  <div className="flex gap-2">
                    <Select value={dniPrefix} onValueChange={(value) => setDniPrefix(value as DniPrefix)}>
                      <FormControl>
                        <SelectTrigger className="w-20">
                          <SelectValue placeholder="Prefijo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="V">V</SelectItem>
                        <SelectItem value="E">E</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormControl>
                      <Input
                        placeholder="Documento de identidad"
                        inputMode="numeric"
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.value.replace(/\D/g, ""))}
                      />
                    </FormControl>
                  </div>
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
