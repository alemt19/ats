"use client"

import * as React from "react"
import { Globe, Mail, Phone } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "react/components/ui/avatar"
import { Badge } from "react/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "react/components/ui/card"
import { RadioGroup, RadioGroupItem } from "react/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "react/components/ui/tabs"
import { cn } from "react/lib/utils"

import type { Candidate } from "./candidates-admin-types"

type CulturePreferenceValue = {
  technical_name: string
  display_name: string
  description: string
}

type CulturePreferenceCategory = {
  technical_name: string
  display_name: string
  values: CulturePreferenceValue[]
}

type CandidateDetailReadonlyProps = {
  candidate: Candidate
  culturalPreferenceCatalog: CulturePreferenceCategory[]
  behavioralQuestion1: string
  behavioralQuestion2: string
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

export default function CandidateDetailReadonly({
  candidate,
  culturalPreferenceCatalog,
  behavioralQuestion1,
  behavioralQuestion2,
}: CandidateDetailReadonlyProps) {
  const fullName = `${candidate.name} ${candidate.lastname}`.trim()
  const cvPreviewType = React.useMemo(() => getCvType(candidate.cv_url), [candidate.cv_url])
  const docxContainerRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (cvPreviewType !== "docx" || !candidate.cv_url || !docxContainerRef.current) {
      return
    }

    let isCancelled = false

    const renderDocxPreview = async () => {
      try {
        const cvUrl = candidate.cv_url

        if (!cvUrl) {
          return
        }

        const { renderAsync } = await import("docx-preview")
        const response = await fetch(cvUrl)
        const blob = await response.blob()

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
  }, [candidate.cv_url, cvPreviewType])

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
      <header className="flex items-center gap-4 rounded-xl border bg-card p-4 md:p-6">
        <Avatar className="size-20 md:size-24">
          <AvatarImage src={candidate.profile_picture} alt={fullName} />
          <AvatarFallback>{toInitials(fullName)}</AvatarFallback>
        </Avatar>

        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{fullName}</h1>
          <p className="text-muted-foreground mt-1 text-sm">Perfil de candidato</p>
        </div>
      </header>

      <Tabs defaultValue="datos" className="gap-4">
        <TabsList>
          <TabsTrigger value="datos">Datos</TabsTrigger>
          <TabsTrigger value="competencias">Competencias y valores</TabsTrigger>
          <TabsTrigger value="preferencias">Preferencias culturales</TabsTrigger>
        </TabsList>

        <TabsContent value="datos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información general</CardTitle>
              <CardDescription>Datos personales y de contacto del candidato.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-muted-foreground text-sm">Nombre</p>
                <p className="font-medium">{candidate.name || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Apellido</p>
                <p className="font-medium">{candidate.lastname || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">País</p>
                <p className="font-medium">{candidate.country || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Estado</p>
                <p className="font-medium">{candidate.state || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Ciudad</p>
                <p className="font-medium">{candidate.city || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Dirección</p>
                <p className="font-medium">{candidate.address || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Página de contacto</p>
                <p className="font-medium">{candidate.contact_page || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Teléfono</p>
                <p className="font-medium">{candidate.phone || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">DNI</p>
                <p className="font-medium">{candidate.dni || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Correo</p>
                <p className="font-medium">{candidate.email || "-"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competencias" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>CV</CardTitle>
              <CardDescription>Documento de currículo del candidato.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border">
                {!cvPreviewType ? (
                  <div className="p-6 text-sm text-muted-foreground">No hay CV para mostrar.</div>
                ) : null}

                {cvPreviewType === "pdf" && candidate.cv_url ? (
                  <iframe src={candidate.cv_url} title="Vista previa del CV" className="h-150 w-full" />
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
              <CardDescription>Respuestas declaradas por el candidato.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">{behavioralQuestion1}</p>
                <p className="text-muted-foreground text-sm">{candidate.behavioral_ans_1 || "Sin respuesta"}</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium">{behavioralQuestion2}</p>
                <p className="text-muted-foreground text-sm">{candidate.behavioral_ans_2 || "Sin respuesta"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Habilidades técnicas, blandas y valores</CardTitle>
              <CardDescription>Listado de competencias del candidato.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium">Habilidades técnicas</p>
                <div className="flex flex-wrap gap-2">
                  {candidate.technical_skills.length === 0 ? (
                    <span className="text-muted-foreground text-sm">Sin registros</span>
                  ) : (
                    candidate.technical_skills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Habilidades blandas</p>
                <div className="flex flex-wrap gap-2">
                  {candidate.soft_skills.length === 0 ? (
                    <span className="text-muted-foreground text-sm">Sin registros</span>
                  ) : (
                    candidate.soft_skills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Valores</p>
                <div className="flex flex-wrap gap-2">
                  {candidate.values.length === 0 ? (
                    <span className="text-muted-foreground text-sm">Sin registros</span>
                  ) : (
                    candidate.values.map((value) => (
                      <Badge key={value} variant="outline">
                        {value}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferencias" className="space-y-4">
          {culturalPreferenceCatalog.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-sm">No hay preferencias culturales registradas.</p>
              </CardContent>
            </Card>
          ) : (
            culturalPreferenceCatalog.map((category) => {
              const selectedTechnicalName = candidate.cultural_preferences[category.technical_name]

              return (
              <Card key={category.technical_name}>
                <CardHeader>
                  <CardTitle>{category.display_name}</CardTitle>
                  <CardDescription>Preferencia cultural registrada (solo lectura)</CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={selectedTechnicalName ?? ""}
                    className="grid gap-4 sm:grid-cols-2"
                    disabled
                  >
                    {category.values.map((option) => {
                      const isSelected = selectedTechnicalName === option.technical_name
                      const optionId = `${category.technical_name}-${option.technical_name}`

                      return (
                        <label key={option.technical_name} className="block">
                          <Card
                            className={cn(
                              "border-muted/60",
                              isSelected && "border-primary/70 ring-1 ring-primary/20"
                            )}
                          >
                            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                              <div className="space-y-1">
                                <CardTitle className="text-base">{option.display_name}</CardTitle>
                              </div>
                              <RadioGroupItem
                                id={optionId}
                                value={option.technical_name}
                                aria-label={option.display_name}
                                disabled
                              />
                            </CardHeader>
                            <CardContent className="pt-0">
                              <CardDescription>{option.description}</CardDescription>
                            </CardContent>
                          </Card>
                        </label>
                      )
                    })}
                  </RadioGroup>
                </CardContent>
              </Card>
              )
            })
          )}
        </TabsContent>
      </Tabs>
    </section>
  )
}
