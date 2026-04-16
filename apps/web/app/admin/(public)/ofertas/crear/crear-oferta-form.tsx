"use client"

import * as React from "react"
import { Info, Sparkles, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Badge } from "react/components/ui/badge"
import { Button } from "react/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "react/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "react/components/ui/form"
import { Input } from "react/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "react/components/ui/select"
import { Textarea } from "react/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "react/components/ui/tooltip"
import { cn } from "react/lib/utils"

type MultiFieldName = "soft_skills" | "technical_skills"

type JobParameterOption = {
  technical_name: string
  display_name: string
}

type SkillItem = {
  name: string
  is_mandatory: boolean
}

type CategoryOption = {
  id: number
  name: string
}

export type CrearOfertaCatalogs = {
  statuses: JobParameterOption[]
  workplaceTypes: JobParameterOption[]
  employmentTypes: JobParameterOption[]
  categories: CategoryOption[]
  fixedLocation: {
    state: string
  }
  cityOptions: string[]
  technicalSkillOptions: string[]
  softSkillOptions: string[]
}

export type CrearOfertaFormValues = {
  title: string
  description: string
  status: string
  city: string
  address: string
  state: string
  workplace_type: string
  employment_type: string
  position: string
  salary: string
  weight_technical: string
  weight_soft: string
  weight_culture: string
  category: string
  soft_skills: string[]
  technical_skills: string[]
  mandatory_soft_skills: string[]
  mandatory_technical_skills: string[]
}

type CrearOfertaFormProps = {
  catalogs: CrearOfertaCatalogs
  initialValues?: Partial<CrearOfertaFormValues>
  mode?: "create" | "edit"
  pageTitle?: string
  pageDescription?: string
  showPageHeader?: boolean
  offerCardTitle?: string
  submitLabel?: string
  containerClassName?: string
  onSubmitValues?: (values: CrearOfertaFormValues) => Promise<void> | void
}

type SkillsSuggestionPayload = {
  technical_skills: string[]
  soft_skills: string[]
}

type MultiDatalistFieldProps = {
  fieldName: MultiFieldName
  label: string
  placeholder: string
  options: string[]
  selectedValues: string[]
  mandatoryValues: string[]
  onChangeValues: (values: string[]) => void
  onToggleMandatory: (value: string) => void
  suggestionItems?: string[]
  onAddSuggestion?: (value: string) => void
  onAddAllSuggestions?: () => void
  disabled?: boolean
}

function normalizeValue(value: string) {
  return value.trim().toLowerCase()
}

function dedupe(values: string[]) {
  const unique = new Set<string>()

  values.forEach((value) => {
    const clean = value.trim()

    if (!clean) {
      return
    }

    unique.add(clean)
  })

  return Array.from(unique)
}

function parseFloatOrNull(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseSalaryOrNull(value: string) {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) {
    return null
  }

  return parsed > 0 ? parsed : null
}

function getDisplayName(options: JobParameterOption[], technicalName: string) {
  return options.find((option) => option.technical_name === technicalName)?.display_name ?? technicalName
}

function getStatusBadgeVariant(status: string): "outline" | "success" | "destructive" | "secondary" {
  switch (status) {
    case "published":
      return "success"
    case "closed":
      return "destructive"
    case "archived":
      return "secondary"
    case "draft":
    default:
      return "outline"
  }
}

function MultiDatalistField({
  fieldName,
  label,
  placeholder,
  options,
  selectedValues,
  mandatoryValues,
  onChangeValues,
  onToggleMandatory,
  suggestionItems = [],
  onAddSuggestion,
  onAddAllSuggestions,
  disabled = false,
}: MultiDatalistFieldProps) {
  const [draft, setDraft] = React.useState("")
  const datalistId = `${fieldName}-options`

  const addValue = React.useCallback(() => {
    const clean = draft.trim()

    if (!clean) {
      return
    }

    const alreadyExists = selectedValues.some((value) => normalizeValue(value) === normalizeValue(clean))

    if (alreadyExists) {
      setDraft("")
      return
    }

    onChangeValues([...selectedValues, clean])
    setDraft("")
  }, [draft, onChangeValues, selectedValues])

  const handleDraftChange = React.useCallback(
    (nextDraft: string) => {
      setDraft(nextDraft)

      const matchingOption = options.find(
        (option) => normalizeValue(option) === normalizeValue(nextDraft)
      )

      if (!matchingOption) {
        return
      }

      const alreadyExists = selectedValues.some(
        (selected) => normalizeValue(selected) === normalizeValue(matchingOption)
      )

      if (alreadyExists) {
        setDraft("")
        return
      }

      onChangeValues([...selectedValues, matchingOption])
      setDraft("")
    },
    [onChangeValues, options, selectedValues]
  )

  const removeValue = React.useCallback(
    (valueToRemove: string) => {
      onChangeValues(selectedValues.filter((item) => item !== valueToRemove))
    },
    [onChangeValues, selectedValues]
  )

  const availableOptions = React.useMemo(
    () =>
      options.filter(
        (option) => !selectedValues.some((selected) => normalizeValue(selected) === normalizeValue(option))
      ),
    [options, selectedValues]
  )

  return (
    <div className="space-y-2">
      <FormLabel>{label}</FormLabel>

      <div className="flex gap-2">
        <Input
          list={datalistId}
          value={draft}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => handleDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              addValue()
            }
          }}
          onBlur={addValue}
        />
        <Button type="button" variant="outline" onClick={addValue} disabled={disabled}>
          Agregar
        </Button>
      </div>

      <datalist id={datalistId}>
        {availableOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>

      <div className="flex min-h-10 flex-wrap gap-2 rounded-md border p-2">
        {selectedValues.length === 0 ? (
          <span className="text-sm text-muted-foreground">Sin elementos seleccionados.</span>
        ) : (
          selectedValues.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-2 rounded-md border bg-muted px-2 py-1 text-sm"
            >
              <span>{value}</span>
              <Button
                type="button"
                variant={mandatoryValues.some((item) => normalizeValue(item) === normalizeValue(value)) ? "default" : "outline"}
                size="xs"
                disabled={disabled}
                onClick={() => onToggleMandatory(value)}
              >
                {mandatoryValues.some((item) => normalizeValue(item) === normalizeValue(value))
                  ? "Obligatoria"
                  : "Estándar"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={disabled}
                onClick={() => removeValue(value)}
              >
                <X className="size-3" />
              </Button>
            </span>
          ))
        )}
      </div>

      {suggestionItems.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Sugerencias para {label}</p>
            <Button
              type="button"
              size="xs"
              variant="outline"
              disabled={disabled}
              onClick={onAddAllSuggestions}
            >
              Agregar todas
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestionItems.map((item) => {
              const alreadyAdded = selectedValues.some(
                (selectedValue) => normalizeValue(selectedValue) === normalizeValue(item)
              )

              return (
                <div
                  key={item}
                  className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-sm"
                >
                  <span>{item}</span>
                  <Button
                    type="button"
                    size="xs"
                    variant={alreadyAdded ? "secondary" : "outline"}
                    disabled={alreadyAdded || disabled}
                    onClick={() => onAddSuggestion?.(item)}
                  >
                    {alreadyAdded ? "Agregado" : "Agregar"}
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function CrearOfertaForm({
  catalogs,
  initialValues,
  mode = "create",
  pageTitle = "Crear oferta de trabajo",
  pageDescription =
    "Completa los datos principales de la vacante y luego agrega habilidades blandas y técnicas.",
  showPageHeader = true,
  offerCardTitle = "Datos de la oferta",
  submitLabel = "Crear oferta",
  containerClassName,
  onSubmitValues,
}: CrearOfertaFormProps) {
  const router = useRouter()
  const { statuses, workplaceTypes, employmentTypes, categories, fixedLocation, cityOptions } = catalogs
  const draftStatus = React.useMemo(
    () => statuses.find((option) => option.technical_name === "draft"),
    [statuses]
  )

  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = React.useState(false)
  const [suggestions, setSuggestions] = React.useState<SkillsSuggestionPayload | null>(null)

  const defaultValues = React.useMemo<CrearOfertaFormValues>(
    () => ({
      title: initialValues?.title ?? "",
      description: initialValues?.description ?? "",
      status: mode === "create" ? "draft" : (initialValues?.status ?? "draft"),
      city: initialValues?.city ?? cityOptions[0] ?? "",
      address: initialValues?.address ?? "",
      state: initialValues?.state ?? fixedLocation.state,
      workplace_type: initialValues?.workplace_type ?? workplaceTypes[0]?.technical_name ?? "onsite",
      employment_type: initialValues?.employment_type ?? employmentTypes[0]?.technical_name ?? "full_time",
      position: initialValues?.position ?? "",
      salary: initialValues?.salary ?? "",
      weight_technical: initialValues?.weight_technical ?? "",
      weight_soft: initialValues?.weight_soft ?? "",
      weight_culture: initialValues?.weight_culture ?? "",
      category: initialValues?.category ?? String(categories[0]?.id ?? ""),
      soft_skills: initialValues?.soft_skills ?? [],
      technical_skills: initialValues?.technical_skills ?? [],
      mandatory_soft_skills: initialValues?.mandatory_soft_skills ?? [],
      mandatory_technical_skills: initialValues?.mandatory_technical_skills ?? [],
    }),
    [categories, cityOptions, employmentTypes, fixedLocation.state, initialValues, mode, workplaceTypes]
  )

  const form = useForm<CrearOfertaFormValues>({
    defaultValues,
  })

  React.useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  const title = form.watch("title")
  const description = form.watch("description")
  const status = form.watch("status")
  const workplaceType = form.watch("workplace_type")
  const employmentType = form.watch("employment_type")
  const state = form.watch("state")
  const city = form.watch("city")
  const position = form.watch("position")
  const salary = form.watch("salary")
  const address = form.watch("address")
  const weightTechnical = form.watch("weight_technical")
  const weightSoft = form.watch("weight_soft")
  const weightCulture = form.watch("weight_culture")
  const category = form.watch("category")
  const softSkills = form.watch("soft_skills")
  const technicalSkills = form.watch("technical_skills")
  const mandatorySoftSkills = form.watch("mandatory_soft_skills")
  const mandatoryTechnicalSkills = form.watch("mandatory_technical_skills")

  const technicalWeightValue = parseFloatOrNull(weightTechnical)
  const softWeightValue = parseFloatOrNull(weightSoft)
  const cultureWeightValue = parseFloatOrNull(weightCulture)

  const hasAllWeights =
    technicalWeightValue !== null && softWeightValue !== null && cultureWeightValue !== null

  const persistedStatus = initialValues?.status ?? defaultValues.status
  const isRestrictedEditMode = mode === "edit" && persistedStatus !== "draft"

  const weightSum = hasAllWeights
    ? technicalWeightValue + softWeightValue + cultureWeightValue
    : null

  const isWeightSumValid = weightSum !== null && Math.abs(weightSum - 1) < 0.0001

  const isSkillsSectionUnlocked =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    status.trim().length > 0 &&
    city.trim().length > 0 &&
    address.trim().length > 0 &&
    state.trim().length > 0 &&
    workplaceType.trim().length > 0 &&
    employmentType.trim().length > 0 &&
    position.trim().length > 0 &&
    parseSalaryOrNull(salary) !== null &&
    category.trim().length > 0 &&
    isWeightSumValid

  const selectableStatuses = React.useMemo(() => {
    if (!isRestrictedEditMode) {
      return statuses
    }

    return statuses.filter((option) => option.technical_name !== "draft")
  }, [isRestrictedEditMode, statuses])

  const setMultiFieldValue = React.useCallback(
    (fieldName: MultiFieldName, values: string[]) => {
      const dedupedValues = dedupe(values)
      form.setValue(fieldName, dedupedValues, { shouldDirty: true, shouldValidate: true })

      const mandatoryFieldName =
        fieldName === "technical_skills" ? "mandatory_technical_skills" : "mandatory_soft_skills"
      const currentMandatoryValues = form.getValues(mandatoryFieldName)
      form.setValue(
        mandatoryFieldName,
        currentMandatoryValues.filter((value) =>
          dedupedValues.some((selectedValue) => normalizeValue(selectedValue) === normalizeValue(value))
        ),
        { shouldDirty: true, shouldValidate: true }
      )
    },
    [form]
  )

  const toggleMandatoryValue = React.useCallback(
    (fieldName: MultiFieldName, value: string) => {
      const mandatoryFieldName =
        fieldName === "technical_skills" ? "mandatory_technical_skills" : "mandatory_soft_skills"
      const currentMandatoryValues = form.getValues(mandatoryFieldName)
      const exists = currentMandatoryValues.some(
        (currentValue) => normalizeValue(currentValue) === normalizeValue(value)
      )

      form.setValue(
        mandatoryFieldName,
        exists
          ? currentMandatoryValues.filter(
              (currentValue) => normalizeValue(currentValue) !== normalizeValue(value)
            )
          : [...currentMandatoryValues, value],
        { shouldDirty: true, shouldValidate: true }
      )
    },
    [form]
  )

  const addSuggestionToField = React.useCallback(
    (fieldName: MultiFieldName, value: string) => {
      const currentValues = form.getValues(fieldName)
      const exists = currentValues.some(
        (currentValue) => normalizeValue(currentValue) === normalizeValue(value)
      )

      if (exists) {
        return
      }

      form.setValue(fieldName, [...currentValues, value], { shouldDirty: true, shouldValidate: true })
    },
    [form]
  )

  const addAllSuggestionsToField = React.useCallback(
    (fieldName: MultiFieldName, suggestionItems: string[]) => {
      const currentValues = form.getValues(fieldName)
      form.setValue(fieldName, dedupe([...currentValues, ...suggestionItems]), {
        shouldDirty: true,
        shouldValidate: true,
      })
    },
    [form]
  )

  const handleSuggestSkills = React.useCallback(async () => {
    setIsGeneratingSuggestions(true)

    try {
      const response = await fetch("/api/admin/ofertas/sugerir-habilidades", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          position,
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | (SkillsSuggestionPayload & { message?: string })
        | null

      if (!response.ok) {
        throw new Error(payload?.message ?? "No se pudo obtener sugerencias")
      }

      setSuggestions({
        technical_skills: dedupe(Array.isArray(payload?.technical_skills) ? payload.technical_skills : []),
        soft_skills: dedupe(Array.isArray(payload?.soft_skills) ? payload.soft_skills : []),
      })
      toast.success("Sugerencias generadas")
    } catch {
      toast.error("No se pudo obtener sugerencias")
    } finally {
      setIsGeneratingSuggestions(false)
    }
  }, [description, position, title])

  const onSubmit = async (values: CrearOfertaFormValues) => {
    if (onSubmitValues) {
      await onSubmitValues(values)
      return
    }

    const categoryId = Number(values.category)
    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      toast.error("Debes seleccionar una categoria valida")
      return
    }

    const payload = {
      title: values.title.trim(),
      description: values.description.trim(),
      status: "draft",
      city: values.city.trim(),
      address: values.address.trim(),
      state: values.state.trim(),
      workplace_type: values.workplace_type,
      employment_type: values.employment_type,
      position: values.position.trim(),
      salary: values.salary.trim(),
      weight_technical: Number(values.weight_technical),
      weight_soft: Number(values.weight_soft),
      weight_culture: Number(values.weight_culture),
      category_id: categoryId,
      technical_skills: dedupe(values.technical_skills),
      soft_skills: dedupe(values.soft_skills),
      technical_skill_items: dedupe(values.technical_skills).map((name) => ({
        name,
        is_mandatory: values.mandatory_technical_skills.some(
          (mandatoryValue) => normalizeValue(mandatoryValue) === normalizeValue(name)
        ),
      })),
      soft_skill_items: dedupe(values.soft_skills).map((name) => ({
        name,
        is_mandatory: values.mandatory_soft_skills.some(
          (mandatoryValue) => normalizeValue(mandatoryValue) === normalizeValue(name)
        ),
      })),
    }

    if (mode === "edit" && persistedStatus !== "draft" && payload.status === "draft") {
      toast.error("No se puede volver una oferta a borrador")
      return
    }

    try {
      const response = await fetch("/api/admin/ofertas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const responsePayload = (await response.json().catch(() => null)) as { message?: string } | null

      if (!response.ok) {
        throw new Error(responsePayload?.message ?? "No se pudo crear la oferta")
      }

      const createdOffer =
        responsePayload &&
        typeof responsePayload === "object" &&
        "data" in responsePayload &&
        responsePayload.data &&
        typeof responsePayload.data === "object"
          ? (responsePayload.data as { id?: number })
          : (responsePayload as { id?: number })

      const createdOfferId = Number(createdOffer?.id)

      toast.success("Oferta creada en borrador")

      if (Number.isFinite(createdOfferId) && createdOfferId > 0) {
        router.push(`/admin/ofertas/${createdOfferId}`)
        router.refresh()
        return
      }

      form.reset({
        ...defaultValues,
        status: "draft",
      })
      setSuggestions(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear la oferta"
      toast.error(message)
    }
  }

  return (
    <section className={cn("mx-auto w-full max-w-5xl space-y-6", containerClassName)}>
      {showPageHeader ? (
        <div>
          <h1 className="text-2xl font-semibold">{pageTitle}</h1>
          <p className="text-sm text-muted-foreground">{pageDescription}</p>
        </div>
      ) : null}

      <Form {...form}>
        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>{offerCardTitle}</CardTitle>
              <CardDescription>
                Estos campos representan la información general y ponderaciones de evaluación del puesto.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="title"
                  rules={{ required: "El título es obligatorio." }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Backend Engineer" disabled={isRestrictedEditMode} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="position"
                  rules={{ required: "La posición es obligatoria." }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Puesto</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Senior" disabled={isRestrictedEditMode} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  rules={{ required: "La descripción es obligatoria." }}
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe brevemente la oferta"
                          className="min-h-28"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel>Estado</FormLabel>
                        <Badge
                          variant={getStatusBadgeVariant(
                            mode === "create" ? "draft" : (field.value || "draft")
                          )}
                        >
                          {mode === "create"
                            ? (draftStatus?.display_name ?? getDisplayName(statuses, "draft"))
                            : getDisplayName(statuses, field.value || "draft")}
                        </Badge>
                      </div>
                      <Select
                        value={mode === "create" ? "draft" : field.value}
                        disabled={mode === "create"}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Borrador" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {selectableStatuses.map((option) => (
                            <SelectItem key={option.technical_name} value={option.technical_name}>
                              {option.display_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="salary"
                  rules={{
                    required: "El salario es obligatorio.",
                    validate: (value) =>
                      parseSalaryOrNull(value) !== null || "Ingresa un valor numérico mayor a 0.",
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-1.5">
                        <FormLabel>Salario</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="text-muted-foreground transition-colors hover:text-foreground"
                                aria-label="Informacion del salario"
                              >
                                <Info className="size-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Salario referencial calculado a la tasa del BCV.</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">$</span>
                          <Input type="number" step="0.01" className="pl-8" placeholder="0.00" {...field} />
                        </div>
                      </FormControl>
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
                      <Select onValueChange={field.onChange} value={field.value} disabled>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={fixedLocation.state}>{fixedLocation.state}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  rules={{ required: "La ciudad es obligatoria." }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciudad</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={cityOptions.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona ciudad" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {cityOptions.length === 0 ? (
                            <SelectItem value="no-city" disabled>
                              Sin ciudades disponibles
                            </SelectItem>
                          ) : (
                            cityOptions.map((city) => (
                              <SelectItem key={city} value={city}>
                                {city}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  rules={{ required: "La dirección es obligatoria." }}
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Dirección</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Av. Principal, Torre X, Piso Y" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="workplace_type"
                  rules={{ required: "La modalidad de trabajo es obligatoria." }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modalidad de trabajo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona modalidad" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {workplaceTypes.map((option) => (
                            <SelectItem key={option.technical_name} value={option.technical_name}>
                              {option.display_name}
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
                  name="employment_type"
                  rules={{ required: "El tipo de empleo es obligatorio." }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de empleo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employmentTypes.map((option) => (
                            <SelectItem key={option.technical_name} value={option.technical_name}>
                              {option.display_name}
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
                  name="category"
                  rules={{ required: "La categoría es obligatoria." }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona categoría" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((option) => (
                            <SelectItem key={option.id} value={String(option.id)}>
                              {option.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pesos</CardTitle>
              <CardDescription>
                Define la ponderación para cada criterio. La suma total debe ser 1.00.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="weight_technical"
                  rules={{
                    required: "El peso técnico es obligatorio.",
                    validate: (value) => parseFloatOrNull(value) !== null || "Debe ser un número válido.",
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Peso de habilidades técnicas</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          disabled={isRestrictedEditMode}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="weight_soft"
                  rules={{
                    required: "El peso de habilidades blandas es obligatorio.",
                    validate: (value) => parseFloatOrNull(value) !== null || "Debe ser un número válido.",
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Peso de habilidades Blandas</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          disabled={isRestrictedEditMode}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="weight_culture"
                  rules={{
                    required: "El peso cultural es obligatorio.",
                    validate: (value) => parseFloatOrNull(value) !== null || "Debe ser un número válido.",
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Peso de alineación cultural</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          disabled={isRestrictedEditMode}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {hasAllWeights ? (
                <p className={`text-sm ${isWeightSumValid ? "text-muted-foreground" : "text-destructive"}`}>
                  Suma de pesos: {weightSum?.toFixed(2)} {isWeightSumValid ? "(correcto)" : "(debe ser 1.00)"}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Habilidades del puesto</CardTitle>
              <CardDescription>
                Puedes elegir habilidades manualmente o usar sugerencias automáticas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!isSkillsSectionUnlocked || isGeneratingSuggestions || isRestrictedEditMode}
                  onClick={handleSuggestSkills}
                >
                  <Sparkles className="size-4" />
                  {isGeneratingSuggestions ? "Generando sugerencias..." : "Sugerir habilidades"}
                </Button>
              </div>

              {!isSkillsSectionUnlocked && !isRestrictedEditMode ? (
                <p className="text-sm text-muted-foreground">
                  Completa todos los campos anteriores y asegúrate de que la suma de pesos sea 1 para habilitar esta sección.
                </p>
              ) : null}

              {isRestrictedEditMode ? (
                <p className="text-sm text-muted-foreground">
                  En ofertas que no estan en borrador no se pueden modificar habilidades ni pesos.
                </p>
              ) : null}

              <div
                className={
                  isSkillsSectionUnlocked && !isRestrictedEditMode
                    ? "space-y-6"
                    : "pointer-events-none space-y-6 opacity-60"
                }
              >
                <MultiDatalistField
                  fieldName="technical_skills"
                  label="Habilidades técnicas"
                  placeholder="Selecciona o escribe una habilidad técnica"
                  options={catalogs.technicalSkillOptions}
                  selectedValues={technicalSkills}
                  mandatoryValues={mandatoryTechnicalSkills}
                  onChangeValues={(values) => setMultiFieldValue("technical_skills", values)}
                  onToggleMandatory={(value) => toggleMandatoryValue("technical_skills", value)}
                  suggestionItems={suggestions?.technical_skills ?? []}
                  onAddSuggestion={(value) => addSuggestionToField("technical_skills", value)}
                  onAddAllSuggestions={() =>
                    addAllSuggestionsToField("technical_skills", suggestions?.technical_skills ?? [])
                  }
                  disabled={!isSkillsSectionUnlocked || isRestrictedEditMode}
                />

                <MultiDatalistField
                  fieldName="soft_skills"
                  label="Habilidades blandas"
                  placeholder="Selecciona o escribe una habilidad blanda"
                  options={catalogs.softSkillOptions}
                  selectedValues={softSkills}
                  mandatoryValues={mandatorySoftSkills}
                  onChangeValues={(values) => setMultiFieldValue("soft_skills", values)}
                  onToggleMandatory={(value) => toggleMandatoryValue("soft_skills", value)}
                  suggestionItems={suggestions?.soft_skills ?? []}
                  onAddSuggestion={(value) => addSuggestionToField("soft_skills", value)}
                  onAddAllSuggestions={() =>
                    addAllSuggestionsToField("soft_skills", suggestions?.soft_skills ?? [])
                  }
                  disabled={!isSkillsSectionUnlocked || isRestrictedEditMode}
                />
              </div>
            </CardContent>
          </Card>

          <CardFooter className="justify-end px-0">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Guardando..." : submitLabel}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </section>
  )
}
