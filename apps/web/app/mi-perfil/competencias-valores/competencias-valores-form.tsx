"use client"

import * as React from "react"
import { Sparkles, Upload, X } from "lucide-react"
import { useForm } from "react-hook-form"

import { Button } from "react/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "react/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "react/components/ui/form"
import { Input } from "react/components/ui/input"
import { Textarea } from "react/components/ui/textarea"

type MultiFieldName = "technical_skills" | "soft_skills" | "values"

export type CompetenciasValoresInitialData = {
  cv_url?: string
  behavioral_ans_1: string
  behavioral_ans_2: string
  technical_skills: string[]
  soft_skills: string[]
  values: string[]
}

type SuggestionPayload = {
  technical_skills: string[]
  soft_skills: string[]
  values: string[]
}

type CompetenciasValoresFormProps = {
  userId: string
  initialData: CompetenciasValoresInitialData
  technicalSkillOptions: string[]
  softSkillOptions: string[]
  valueOptions: string[]
  behavioralQuestion1: string
  behavioralQuestion2: string
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

function getCvType(urlOrName?: string): "pdf" | "docx" | null {
  if (!urlOrName) {
    return null
  }

  const normalized = urlOrName.toLowerCase()

  if (normalized.endsWith(".pdf")) {
    return "pdf"
  }

  if (normalized.endsWith(".docx")) {
    return "docx"
  }

  return null
}

async function getSuggestionsFromDummyLlm(input: {
  behavioralAns1: string
  behavioralAns2: string
  cvName: string
}): Promise<SuggestionPayload> {
  await new Promise((resolve) => setTimeout(resolve, 900))

  const baseText = `${input.behavioralAns1} ${input.behavioralAns2} ${input.cvName}`.toLowerCase()

  const technical = ["TypeScript", "NestJS", "PostgreSQL"]
  const soft = ["Comunicación", "Trabajo en equipo"]
  const values = ["Responsabilidad", "Integridad"]

  if (baseText.includes("lider") || baseText.includes("coord")) {
    soft.push("Liderazgo")
    values.push("Compromiso")
  }

  if (baseText.includes("cliente") || baseText.includes("servicio")) {
    soft.push("Empatía")
    values.push("Colaboración")
  }

  if (baseText.includes("api") || baseText.includes("backend")) {
    technical.push("Node.js")
  }

  if (baseText.includes("react") || baseText.includes("frontend")) {
    technical.push("React")
  }

  return {
    technical_skills: dedupe(technical),
    soft_skills: dedupe(soft),
    values: dedupe(values),
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

    const alreadyExists = selectedValues.some(
      (value) => normalizeValue(value) === normalizeValue(clean)
    )

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
        (option) =>
          !selectedValues.some(
            (selected) => normalizeValue(selected) === normalizeValue(option)
          )
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

export default function CompetenciasValoresForm({
  userId,
  initialData,
  technicalSkillOptions,
  softSkillOptions,
  valueOptions,
  behavioralQuestion1,
  behavioralQuestion2,
}: CompetenciasValoresFormProps) {
  const initialCvUrl = initialData.cv_url ?? ""
  const initialCvFileName = initialCvUrl.split("/").pop() || "Sin archivo"

  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const objectUrlRef = React.useRef<string | null>(null)
  const docxContainerRef = React.useRef<HTMLDivElement | null>(null)

  const [cvFile, setCvFile] = React.useState<File | null>(null)
  const [cvError, setCvError] = React.useState("")
  const [cvPreviewType, setCvPreviewType] = React.useState<"pdf" | "docx" | null>(
    getCvType(initialCvUrl)
  )
  const [cvPreviewUrl, setCvPreviewUrl] = React.useState(initialCvUrl)
  const [cvDisplayName, setCvDisplayName] = React.useState(initialCvFileName)
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = React.useState(false)
  const [suggestions, setSuggestions] = React.useState<SuggestionPayload | null>(null)

  const form = useForm<CompetenciasValoresInitialData>({
    defaultValues: {
      cv_url: initialData.cv_url ?? "",
      behavioral_ans_1: initialData.behavioral_ans_1 ?? "",
      behavioral_ans_2: initialData.behavioral_ans_2 ?? "",
      technical_skills: initialData.technical_skills ?? [],
      soft_skills: initialData.soft_skills ?? [],
      values: initialData.values ?? [],
    },
  })

  const technicalSkills = form.watch("technical_skills")
  const softSkills = form.watch("soft_skills")
  const candidateValues = form.watch("values")
  const behavioralAns1 = form.watch("behavioral_ans_1")
  const behavioralAns2 = form.watch("behavioral_ans_2")
  const hasCvLoaded = Boolean(cvFile || initialCvUrl || cvPreviewUrl)
  const isSkillsSectionUnlocked =
    hasCvLoaded && behavioralAns1.trim().length > 0 && behavioralAns2.trim().length > 0

  React.useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
    }
  }, [])

  React.useEffect(() => {
    if (cvPreviewType !== "docx" || !docxContainerRef.current) {
      return
    }

    let isCancelled = false

    const renderDocxPreview = async () => {
      try {
        const { renderAsync } = await import("docx-preview")

        let blob: Blob

        if (cvFile) {
          blob = cvFile
        } else {
          const response = await fetch(cvPreviewUrl)
          blob = await response.blob()
        }

        if (isCancelled || !docxContainerRef.current) {
          return
        }

        docxContainerRef.current.innerHTML = ""
        await renderAsync(blob, docxContainerRef.current)
      } catch {
        if (!isCancelled && docxContainerRef.current) {
          docxContainerRef.current.innerHTML =
            '<p class="text-sm text-muted-foreground">No se pudo renderizar el archivo .docx.</p>'
        }
      }
    }

    renderDocxPreview()

    return () => {
      isCancelled = true
    }
  }, [cvFile, cvPreviewType, cvPreviewUrl])

  const setMultiFieldValue = React.useCallback(
    (fieldName: MultiFieldName, values: string[]) => {
      form.setValue(fieldName, dedupe(values), { shouldDirty: true })
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

      form.setValue(fieldName, [...currentValues, value], { shouldDirty: true })
    },
    [form]
  )

  const handleCvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const fileType = getCvType(file.name)

    if (!fileType) {
      setCvError("Solo se permiten archivos PDF o DOCX.")
      return
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
    }

    const localUrl = URL.createObjectURL(file)

    objectUrlRef.current = localUrl
    setCvFile(file)
    setCvError("")
    setCvPreviewType(fileType)
    setCvPreviewUrl(localUrl)
    setCvDisplayName(file.name)
    form.setValue("cv_url", file.name, { shouldDirty: true })
  }

  const handleSuggestSkillsAndValues = async () => {
    setIsGeneratingSuggestions(true)

    try {
      const payload = await getSuggestionsFromDummyLlm({
        behavioralAns1,
        behavioralAns2,
        cvName: cvDisplayName,
      })

      setSuggestions(payload)
    } finally {
      setIsGeneratingSuggestions(false)
    }
  }

  const onSubmit = (values: CompetenciasValoresInitialData) => {
    const formData = new FormData()

    formData.append("userId", userId)
    formData.append("behavioral_question_1", behavioralQuestion1)
    formData.append("behavioral_question_2", behavioralQuestion2)
    formData.append("behavioral_ans_1", values.behavioral_ans_1)
    formData.append("behavioral_ans_2", values.behavioral_ans_2)
    formData.append("technical_skills", JSON.stringify(values.technical_skills))
    formData.append("soft_skills", JSON.stringify(values.soft_skills))
    formData.append("values", JSON.stringify(values.values))

    if (cvFile) {
      formData.append("cv", cvFile)
    } else if (initialCvUrl) {
      formData.append("cv_existing_url", initialCvUrl)
    }

    console.log("Payload para backend (multipart/form-data):", {
      userId,
      behavioral_question_1: behavioralQuestion1,
      behavioral_question_2: behavioralQuestion2,
      behavioral_ans_1: values.behavioral_ans_1,
      behavioral_ans_2: values.behavioral_ans_2,
      technical_skills: values.technical_skills,
      soft_skills: values.soft_skills,
      values: values.values,
      cv_file_name: cvFile?.name,
      cv_existing_url: !cvFile ? initialCvUrl : undefined,
      formData,
    })
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Competencias y valores</h1>
        <p className="text-sm text-muted-foreground">
          Actualiza tu CV y completa la información para sugerir habilidades y valores.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>CV</CardTitle>
              <CardDescription>
                Adjunta tu CV en formato PDF o DOCX y visualízalo sin descargar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-4" />
                  Cargar CV
                </Button>
                <span className="text-sm text-muted-foreground">
                  Archivo actual: {cvDisplayName || "Sin archivo"}
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={handleCvUpload}
              />

              {cvError ? <p className="text-sm text-destructive">{cvError}</p> : null}

              <div className="overflow-hidden rounded-lg border">
                {!cvPreviewType ? (
                  <div className="p-6 text-sm text-muted-foreground">
                    No hay CV para mostrar todavía.
                  </div>
                ) : null}

                {cvPreviewType === "pdf" ? (
                  <iframe
                    src={cvPreviewUrl}
                    title="Vista previa del CV"
                    className="h-150 w-full"
                  />
                ) : null}

                {cvPreviewType === "docx" ? (
                  <div className="h-150 overflow-auto bg-background p-4">
                    <div ref={docxContainerRef} />
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preguntas conductuales</CardTitle>
              <CardDescription>
                Tus respuestas se usan para sugerir habilidades y valores de tu perfil.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="behavioral_ans_1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{behavioralQuestion1}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Escribe tu respuesta conductual"
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
                name="behavioral_ans_2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{behavioralQuestion2}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Escribe tu segunda respuesta conductual"
                        className="min-h-28"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSuggestSkillsAndValues}
                  disabled={!isSkillsSectionUnlocked || isGeneratingSuggestions}
                >
                  <Sparkles className="size-4" />
                  {isGeneratingSuggestions
                    ? "Generando sugerencias..."
                    : "Sugererir habilidades y valores"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Habilidades y valores</CardTitle>
              <CardDescription>
                Agrega o quita elementos en cada lista usando las opciones sugeridas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isSkillsSectionUnlocked ? (
                <p className="text-sm text-muted-foreground">
                  Completa la carga de CV y responde ambas preguntas conductuales para habilitar esta sección.
                </p>
              ) : null}

              <div className={isSkillsSectionUnlocked ? "space-y-6" : "pointer-events-none space-y-6 opacity-60"}>
              <MultiDatalistField
                fieldName="technical_skills"
                label="Habilidades técnicas"
                placeholder="Selecciona o escribe una habilidad técnica"
                options={technicalSkillOptions}
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
                options={softSkillOptions}
                selectedValues={softSkills}
                onChangeValues={(values) => setMultiFieldValue("soft_skills", values)}
                suggestionItems={suggestions?.soft_skills ?? []}
                onAddSuggestion={(value) => addSuggestionToField("soft_skills", value)}
                disabled={!isSkillsSectionUnlocked}
              />

              <MultiDatalistField
                fieldName="values"
                label="Valores"
                placeholder="Selecciona o escribe un valor"
                options={valueOptions}
                selectedValues={candidateValues}
                onChangeValues={(values) => setMultiFieldValue("values", values)}
                suggestionItems={suggestions?.values ?? []}
                onAddSuggestion={(value) => addSuggestionToField("values", value)}
                disabled={!isSkillsSectionUnlocked}
              />
              </div>
            </CardContent>
          </Card>

          <CardFooter className="justify-end px-0">
            <Button type="submit">Guardar cambios</Button>
          </CardFooter>
        </form>
      </Form>
    </section>
  )
}