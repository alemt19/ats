"use client"

import * as React from "react"
import { Sparkles, Upload, X } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

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

function normalizeList(values: string[]) {
  return dedupe(values.map((value) => value.trim())).sort((a, b) => a.localeCompare(b))
}

function areListsEqual(valuesA: string[], valuesB: string[]) {
  const normalizedA = normalizeList(valuesA)
  const normalizedB = normalizeList(valuesB)

  if (normalizedA.length !== normalizedB.length) {
    return false
  }

  return normalizedA.every(
    (value, index) => normalizeValue(value) === normalizeValue(normalizedB[index] ?? "")
  )
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

function MultiDatalistField({
  fieldName,
  label,
  placeholder,
  options,
  selectedValues,
  onChangeValues,
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
      <FormLabel className="text-sm font-medium text-foreground/85">{label}</FormLabel>
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
        <Button type="button" variant="outline" className="rounded-full border-border/70 bg-background/70 hover:bg-muted/80" onClick={addValue} disabled={disabled}>
          Agregar
        </Button>
      </div>

      <datalist id={datalistId}>
        {availableOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>

      <div className="flex min-h-10 flex-wrap gap-2 rounded-xl border border-border/70 bg-background/80 p-2.5">
        {selectedValues.length === 0 ? (
          <span className="text-sm text-muted-foreground">Sin elementos seleccionados.</span>
        ) : (
          selectedValues.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/70 px-3 py-1.5 text-sm"
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
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Sugerencias para {label}</p>
            <Button
              type="button"
              size="xs"
              variant="outline" className="rounded-full border-border/70 bg-background/70 hover:bg-muted/80"
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
                  className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-sm"
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
  const MAX_CV_FILE_SIZE_BYTES = 5 * 1024 * 1024
  const MAX_CV_PAGES = 10

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
  const savedListsRef = React.useRef({
    technical_skills: normalizeList(initialData.technical_skills ?? []),
    soft_skills: normalizeList(initialData.soft_skills ?? []),
    values: normalizeList(initialData.values ?? []),
  })
  const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

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

  React.useEffect(() => {
    if (technicalSkills.length > 0 && form.formState.errors.technical_skills) {
      form.clearErrors("technical_skills")
    }
  }, [form, technicalSkills, form.formState.errors.technical_skills])

  React.useEffect(() => {
    if (softSkills.length > 0 && form.formState.errors.soft_skills) {
      form.clearErrors("soft_skills")
    }
  }, [form, softSkills, form.formState.errors.soft_skills])

  React.useEffect(() => {
    if (candidateValues.length > 0 && form.formState.errors.values) {
      form.clearErrors("values")
    }
  }, [candidateValues, form, form.formState.errors.values])

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

  const addAllSuggestionsToField = React.useCallback(
    (fieldName: MultiFieldName, suggestionItems: string[]) => {
      const currentValues = form.getValues(fieldName)
      const mergedValues = dedupe([...currentValues, ...suggestionItems])
      form.setValue(fieldName, mergedValues, { shouldDirty: true })
    },
    [form]
  )

  const extractDocxPageCount = (document: unknown): number | null => {
    const candidate = document as {
      appProps?: { pages?: unknown }
    }

    const pagesFromProps = candidate?.appProps?.pages
    if (typeof pagesFromProps === "number" && Number.isFinite(pagesFromProps) && pagesFromProps > 0) {
      return pagesFromProps
    }

    let breakCount = 0
    const visited = new WeakSet<object>()

    const walk = (node: unknown) => {
      if (!node || typeof node !== "object") {
        return
      }

      if (visited.has(node)) {
        return
      }

      visited.add(node)

      if (Array.isArray(node)) {
        node.forEach(walk)
        return
      }

      const record = node as Record<string, unknown>

      if (
        record.break === "page" ||
        record.break === "lastRenderedPageBreak" ||
        record.pageBreak === true
      ) {
        breakCount += 1
      }

      Object.values(record).forEach(walk)
    }

    walk(document)

    if (breakCount > 0) {
      return breakCount + 1
    }

    return null
  }

  const getPdfPageCount = async (file: File): Promise<number | null> => {
    const buffer = await file.arrayBuffer()
    const content = new TextDecoder("latin1").decode(new Uint8Array(buffer))
    const matches = content.match(/\/Type\s*\/Page\b/g)

    if (!matches?.length) {
      return null
    }

    return matches.length
  }

  const getCvPageCount = async (file: File, fileType: "pdf" | "docx"): Promise<number | null> => {
    if (fileType === "pdf") {
      return getPdfPageCount(file)
    }

    const { parseAsync } = await import("docx-preview")
    const parsedDoc = await parseAsync(file)
    return extractDocxPageCount(parsedDoc)
  }

  const handleCvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const fileType = getCvType(file.name)

    if (!fileType) {
      setCvError("Solo se permiten archivos PDF o DOCX.")
      return
    }

    if (file.size > MAX_CV_FILE_SIZE_BYTES) {
      setCvError("El CV no puede superar 5MB.")
      return
    }

    try {
      const pageCount = await getCvPageCount(file, fileType)

      if (pageCount === null) {
        setCvError("No se pudo validar el número de páginas del archivo.")
        return
      }

      if (pageCount > MAX_CV_PAGES) {
        setCvError("El CV debe tener máximo 5 páginas.")
        return
      }
    } catch {
      setCvError("No se pudo validar el archivo de CV.")
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
      const formData = new FormData()
      formData.append("user_id", userId)
      formData.append("behavioral_question_1", behavioralQuestion1)
      formData.append("behavioral_question_2", behavioralQuestion2)
      formData.append("behavioral_ans_1", behavioralAns1)
      formData.append("behavioral_ans_2", behavioralAns2)

      if (cvFile) {
        formData.append("cv", cvFile)
      } else if (initialCvUrl) {
        formData.append("cv_existing_url", initialCvUrl)
      }

      const response = await fetch("/api/candidates/competencias-valores/sugerencias", {
        method: "POST",
        body: formData,
      })

      const payload = (await response.json().catch(() => null)) as
        | (SuggestionPayload & { message?: string })
        | null

      if (!response.ok) {
        throw new Error(payload?.message ?? "No se pudieron generar sugerencias")
      }

      const normalizedPayload: SuggestionPayload = {
        technical_skills: Array.isArray(payload?.technical_skills)
          ? dedupe(payload.technical_skills)
          : [],
        soft_skills: Array.isArray(payload?.soft_skills) ? dedupe(payload.soft_skills) : [],
        values: Array.isArray(payload?.values) ? dedupe(payload.values) : [],
      }

      setSuggestions(normalizedPayload)
      toast.success("Sugerencias generadas")
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron generar sugerencias"
      toast.error(message)
    } finally {
      setIsGeneratingSuggestions(false)
    }
  }

  const onSubmit = async (values: CompetenciasValoresInitialData) => {
    form.clearErrors()
    setCvError("")

    const trimmedBehavioralAns1 = values.behavioral_ans_1.trim()
    const trimmedBehavioralAns2 = values.behavioral_ans_2.trim()
    const hasExistingCv = Boolean(cvFile || initialCvUrl || cvPreviewUrl)

    let hasErrors = false

    if (!hasExistingCv) {
      setCvError("El archivo de CV es obligatorio.")
      hasErrors = true
    }

    if (!trimmedBehavioralAns1) {
      form.setError("behavioral_ans_1", {
        type: "required",
        message: "Este campo es obligatorio",
      })
      hasErrors = true
    }

    if (!trimmedBehavioralAns2) {
      form.setError("behavioral_ans_2", {
        type: "required",
        message: "Este campo es obligatorio",
      })
      hasErrors = true
    }

    if (!values.technical_skills.length) {
      form.setError("technical_skills", {
        type: "required",
        message: "Debes agregar al menos una habilidad técnica",
      })
      hasErrors = true
    }

    if (!values.soft_skills.length) {
      form.setError("soft_skills", {
        type: "required",
        message: "Debes agregar al menos una habilidad blanda",
      })
      hasErrors = true
    }

    if (!values.values.length) {
      form.setError("values", {
        type: "required",
        message: "Debes agregar al menos un valor",
      })
      hasErrors = true
    }

    if (hasErrors) {
      return
    }

    const skillsOrValuesChanged =
      !areListsEqual(values.technical_skills, savedListsRef.current.technical_skills) ||
      !areListsEqual(values.soft_skills, savedListsRef.current.soft_skills) ||
      !areListsEqual(values.values, savedListsRef.current.values)

    const formData = new FormData()

    formData.append("behavioral_ans_1", trimmedBehavioralAns1)
    formData.append("behavioral_ans_2", trimmedBehavioralAns2)
    formData.append("technical_skills", JSON.stringify(values.technical_skills))
    formData.append("soft_skills", JSON.stringify(values.soft_skills))
    formData.append("values", JSON.stringify(values.values))

    if (cvFile) {
      formData.append("cv", cvFile)
    } else if (initialCvUrl) {
      formData.append("cv_existing_url", initialCvUrl)
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/candidates/me/competencias-valores`, {
        method: "PATCH",
        credentials: "include",
        body: formData,
      })

      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null

      if (!response.ok) {
        throw new Error(payload?.message ?? "No se pudieron guardar los cambios")
      }

      toast.success("Competencias y valores actualizados")

      if (skillsOrValuesChanged) {
        toast.info("Si tienes postulaciones activas", {
          description:
            "Para que tus cambios en habilidades y valores se reflejen en los puntajes, debes volver a postular.",
        })
      }

      savedListsRef.current = {
        technical_skills: normalizeList(values.technical_skills),
        soft_skills: normalizeList(values.soft_skills),
        values: normalizeList(values.values),
      }

      setCvFile(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron guardar los cambios"
      toast.error(message)
    }
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Competencias y valores</h1>
        <p className="text-sm text-foreground/70">
          Actualiza tu CV y completa la información para sugerir habilidades y valores.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="gradient-border rounded-3xl bg-card/90 shadow-soft">
            <CardHeader className="space-y-1">
              <CardTitle>CV</CardTitle>
              <CardDescription>
                Adjunta tu CV en formato PDF o DOCX y visualízalo sin descargar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline" className="rounded-full border-border/70 bg-background/70 hover:bg-muted/80"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 size-4" />
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

              <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/80">
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

          <Card className="gradient-border rounded-3xl bg-card/90 shadow-soft">
            <CardHeader className="space-y-1">
              <CardTitle>Preguntas conductuales</CardTitle>
              <CardDescription>
                Tus respuestas se usan para sugerir habilidades y valores de tu perfil.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="behavioral_ans_1"
                rules={{ required: "Este campo es obligatorio" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground/85">{behavioralQuestion1}</FormLabel>
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
                rules={{ required: "Este campo es obligatorio" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground/85">{behavioralQuestion2}</FormLabel>
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
                  variant="outline" className="rounded-full border-border/70 bg-background/70 hover:bg-muted/80"
                  onClick={handleSuggestSkillsAndValues}
                  disabled={!isSkillsSectionUnlocked || isGeneratingSuggestions}
                >
                  <Sparkles className="mr-2 size-4" />
                  {isGeneratingSuggestions
                    ? "Generando sugerencias..."
                    : "Sugerir habilidades y valores"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-border rounded-3xl bg-card/90 shadow-soft">
            <CardHeader className="space-y-1">
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
                  onAddAllSuggestions={() =>
                    addAllSuggestionsToField("technical_skills", suggestions?.technical_skills ?? [])
                  }
                  disabled={!isSkillsSectionUnlocked}
                />
                {form.formState.errors.technical_skills?.message ? (
                  <p className="text-sm text-destructive">{form.formState.errors.technical_skills.message}</p>
                ) : null}

                <MultiDatalistField
                  fieldName="soft_skills"
                  label="Habilidades blandas"
                  placeholder="Selecciona o escribe una habilidad blanda"
                  options={softSkillOptions}
                  selectedValues={softSkills}
                  onChangeValues={(values) => setMultiFieldValue("soft_skills", values)}
                  suggestionItems={suggestions?.soft_skills ?? []}
                  onAddSuggestion={(value) => addSuggestionToField("soft_skills", value)}
                  onAddAllSuggestions={() =>
                    addAllSuggestionsToField("soft_skills", suggestions?.soft_skills ?? [])
                  }
                  disabled={!isSkillsSectionUnlocked}
                />
                {form.formState.errors.soft_skills?.message ? (
                  <p className="text-sm text-destructive">{form.formState.errors.soft_skills.message}</p>
                ) : null}

                <MultiDatalistField
                  fieldName="values"
                  label="Valores"
                  placeholder="Selecciona o escribe un valor"
                  options={valueOptions}
                  selectedValues={candidateValues}
                  onChangeValues={(values) => setMultiFieldValue("values", values)}
                  suggestionItems={suggestions?.values ?? []}
                  onAddSuggestion={(value) => addSuggestionToField("values", value)}
                  onAddAllSuggestions={() =>
                    addAllSuggestionsToField("values", suggestions?.values ?? [])
                  }
                  disabled={!isSkillsSectionUnlocked}
                />
                {form.formState.errors.values?.message ? (
                  <p className="text-sm text-destructive">{form.formState.errors.values.message}</p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <CardFooter className="justify-end px-0">
            <Button type="submit" disabled={form.formState.isSubmitting} className="rounded-full px-5">
              {form.formState.isSubmitting ? "Guardando..." : "Guardar cambios"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </section>
  )
}
