"use client"

import * as React from "react"
import { Sparkles, X } from "lucide-react"
import { useForm } from "react-hook-form"

import { Badge } from "react/components/ui/badge"
import { Button } from "react/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "react/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "react/components/ui/form"
import { Input } from "react/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "react/components/ui/select"
import { Textarea } from "react/components/ui/textarea"

type MultiFieldName = "soft_skills" | "technical_skills"

type JobParameterOption = {
  technical_name: string
  display_name: string
}

export type CrearOfertaCatalogs = {
  statuses: JobParameterOption[]
  workplaceTypes: JobParameterOption[]
  employmentTypes: JobParameterOption[]
  categories: string[]
  fixedLocation: {
    state: string
  }
  cityOptions: string[]
  technicalSkillOptions: string[]
  softSkillOptions: string[]
}

type CrearOfertaFormProps = {
  catalogs: CrearOfertaCatalogs
}

type SkillsSuggestionPayload = {
  technical_skills: string[]
  soft_skills: string[]
}

type CrearOfertaFormValues = {
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
}

type MultiDatalistFieldProps = {
  fieldName: MultiFieldName
  label: string
  placeholder: string
  options: string[]
  selectedValues: string[]
  onChangeValues: (values: string[]) => void
  suggestionItems?: string[]
  onAddSuggestion?: (value: string) => void
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
  onChangeValues,
  suggestionItems = [],
  onAddSuggestion,
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
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              addValue()
            }
          }}
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
              className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-sm"
            >
              {value}
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
          <p className="text-xs text-muted-foreground">Sugerencias para {label}</p>
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

export default function CrearOfertaForm({ catalogs }: CrearOfertaFormProps) {
  const { statuses, workplaceTypes, employmentTypes, categories, fixedLocation, cityOptions } = catalogs

  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = React.useState(false)
  const [suggestions, setSuggestions] = React.useState<SkillsSuggestionPayload | null>(null)

  const form = useForm<CrearOfertaFormValues>({
    defaultValues: {
      title: "",
      description: "",
      status: statuses[0]?.technical_name ?? "draft",
      city: cityOptions[0] ?? "",
      address: "",
      state: fixedLocation.state,
      workplace_type: workplaceTypes[0]?.technical_name ?? "onsite",
      employment_type: employmentTypes[0]?.technical_name ?? "full_time",
      position: "",
      salary: "",
      weight_technical: "",
      weight_soft: "",
      weight_culture: "",
      category: categories[0] ?? "",
      soft_skills: [],
      technical_skills: [],
    },
  })

  const title = form.watch("title")
  const description = form.watch("description")
  const status = form.watch("status")
  const workplaceType = form.watch("workplace_type")
  const employmentType = form.watch("employment_type")
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

  const technicalWeightValue = parseFloatOrNull(weightTechnical)
  const softWeightValue = parseFloatOrNull(weightSoft)
  const cultureWeightValue = parseFloatOrNull(weightCulture)

  const hasAllWeights =
    technicalWeightValue !== null && softWeightValue !== null && cultureWeightValue !== null

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
    fixedLocation.state.trim().length > 0 &&
    workplaceType.trim().length > 0 &&
    employmentType.trim().length > 0 &&
    position.trim().length > 0 &&
    parseSalaryOrNull(salary) !== null &&
    category.trim().length > 0 &&
    isWeightSumValid

  const setMultiFieldValue = React.useCallback(
    (fieldName: MultiFieldName, values: string[]) => {
      form.setValue(fieldName, dedupe(values), { shouldDirty: true, shouldValidate: true })
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

      if (!response.ok) {
        throw new Error("No se pudo obtener sugerencias")
      }

      const payload = (await response.json()) as SkillsSuggestionPayload
      setSuggestions({
        technical_skills: dedupe(payload.technical_skills),
        soft_skills: dedupe(payload.soft_skills),
      })
    } catch {
      setSuggestions({
        technical_skills: ["TypeScript", "Node.js"],
        soft_skills: ["Comunicación", "Trabajo en equipo"],
      })
    } finally {
      setIsGeneratingSuggestions(false)
    }
  }, [description, position, title])

  const onSubmit = (values: CrearOfertaFormValues) => {
    console.log("Payload crear oferta:", {
      ...values,
      salary: Number(values.salary),
      weight_technical: Number(values.weight_technical),
      weight_soft: Number(values.weight_soft),
      weight_culture: Number(values.weight_culture),
    })
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Crear oferta de trabajo</h1>
        <p className="text-sm text-muted-foreground">
          Completa los datos principales de la vacante y luego agrega habilidades blandas y técnicas.
        </p>
      </div>

      <Form {...form}>
        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Datos de la oferta</CardTitle>
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
                        <Input placeholder="Ej. Backend Engineer" {...field} />
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
                        <Input placeholder="Ej. Senior" {...field} />
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
                  rules={{ required: "El estado es obligatorio." }}
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel>Estado</FormLabel>
                        <Badge variant={getStatusBadgeVariant(field.value)}>
                          {getDisplayName(statuses, field.value)}
                        </Badge>
                      </div>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {statuses.map((option) => (
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
                  name="salary"
                  rules={{
                    required: "El salario es obligatorio.",
                    validate: (value) =>
                      parseSalaryOrNull(value) !== null || "Ingresa un valor numérico mayor a 0.",
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salario</FormLabel>
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
                            <SelectItem key={option} value={option}>
                              {option}
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
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
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
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
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
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
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
                  disabled={!isSkillsSectionUnlocked || isGeneratingSuggestions}
                  onClick={handleSuggestSkills}
                >
                  <Sparkles className="size-4" />
                  {isGeneratingSuggestions ? "Generando sugerencias..." : "Sugerir habilidades"}
                </Button>
              </div>

              {!isSkillsSectionUnlocked ? (
                <p className="text-sm text-muted-foreground">
                  Completa todos los campos anteriores y asegúrate de que la suma de pesos sea 1 para habilitar esta sección.
                </p>
              ) : null}

              <div className={isSkillsSectionUnlocked ? "space-y-6" : "pointer-events-none space-y-6 opacity-60"}>
                <MultiDatalistField
                  fieldName="technical_skills"
                  label="Habilidades técnicas"
                  placeholder="Selecciona o escribe una habilidad técnica"
                  options={catalogs.technicalSkillOptions}
                  selectedValues={technicalSkills}
                  onChangeValues={(values) => setMultiFieldValue("technical_skills", values)}
                  suggestionItems={suggestions?.technical_skills ?? []}
                  onAddSuggestion={(value) => addSuggestionToField("technical_skills", value)}
                  disabled={!isSkillsSectionUnlocked}
                />

                <MultiDatalistField
                  fieldName="soft_skills"
                  label="Habilidades blandas"
                  placeholder="Selecciona o escribe una habilidad blanda"
                  options={catalogs.softSkillOptions}
                  selectedValues={softSkills}
                  onChangeValues={(values) => setMultiFieldValue("soft_skills", values)}
                  suggestionItems={suggestions?.soft_skills ?? []}
                  onAddSuggestion={(value) => addSuggestionToField("soft_skills", value)}
                  disabled={!isSkillsSectionUnlocked}
                />
              </div>
            </CardContent>
          </Card>

          <CardFooter className="justify-end px-0">
            <Button type="submit">Crear oferta</Button>
          </CardFooter>
        </form>
      </Form>
    </section>
  )
}
