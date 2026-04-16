"use client"

import * as React from "react"
import { Globe, Loader2, Mail, MessageCircle, Phone, Save } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "react/components/ui/avatar"
import { Badge } from "react/components/ui/badge"
import { Button } from "react/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "react/components/ui/card"
import { Progress } from "react/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "react/components/ui/select"
import { StarRating } from "react/components/ui/star-rating"
import { Textarea } from "react/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "react/components/ui/tooltip"
import { EmployerFeedbackModal } from "./employer-feedback-modal"

export type ApplicationStatusOption = {
  techical_name: string
  display_name: string
}

export type CulturePreferenceValue = {
  technical_name: string
  display_name: string
  description: string
}

export type CulturePreferenceCategory = {
  technical_name: string
  display_name: string
  values: CulturePreferenceValue[]
}

export type ApplicationNote = {
  id: number
  recruiter_id: number | null
  recruiter_name: string
  recruiter_avatar_url?: string
  text: string
  created_at: string
}

export type ApplicationFeedbackEntry = {
  id: number
  author_type: "employer" | "candidate"
  overall_rating: number
  process_rating: number | null
  match_accuracy_rating: number | null
  comments: string | null
  created_at: string
}

export type ApplicationFeedback = {
  employer: ApplicationFeedbackEntry | null
  candidate: ApplicationFeedbackEntry | null
}

export type CandidateApplicationDetail = {
  candidate_id: number
  application_id: number
  name: string
  lastname: string
  profile_picture?: string
  email: string
  phone?: string
  contact_page?: string
  state?: string
  country?: string
  offer_title: string
  ai_feedback?: Record<string, string> | null
  ai_summary?: string | null
  application_status: string
  technical_score: number
  soft_score: number
  culture_score: number
  technical_skills: string[]
  soft_skills: string[]
  values: string[]
  cultural_preferences: Partial<Record<string, string>>
  cv_url?: string
  behavioral_ans_1: string
  behavioral_ans_2: string
}

type CandidateApplicationDetailClientProps = {
  offerId: number
  candidate: CandidateApplicationDetail
  statusOptions: ApplicationStatusOption[]
  culturePreferenceCatalog: CulturePreferenceCategory[]
  initialNotes: ApplicationNote[]
  initialFeedback: ApplicationFeedback
  behavioralQuestion1: string
  behavioralQuestion2: string
}

function toInitials(name?: string | null) {
  const safeName = typeof name === "string" ? name : ""

  const initials = safeName
    .split(" ")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((value) => value[0]?.toUpperCase() ?? "")
    .join("")

  return initials || "NA"
}

function getStatusBadgeVariant(status: string): "outline" | "secondary" | "destructive" | "success" {
  switch (status) {
    case "hired":
      return "success"
    case "rejected":
      return "destructive"
    case "contacted":
      return "secondary"
    case "applied":
    default:
      return "outline"
  }
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

function getProgressColorClass(value: number) {
  if (value <= 50) {
    return "[&_[data-slot=progress-indicator]]:bg-red-500"
  }

  if (value <= 75) {
    return "[&_[data-slot=progress-indicator]]:bg-yellow-500"
  }

  return "[&_[data-slot=progress-indicator]]:bg-green-500"
}

function formatRelativeDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Hace un momento"
  }

  const now = Date.now()
  const diffMs = Math.max(0, now - date.getTime())
  const minutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (days > 0) {
    return days === 1 ? "Hace 1 día" : `Hace ${days} días`
  }

  if (hours > 0) {
    return hours === 1 ? "Hace 1 hora" : `Hace ${hours} horas`
  }

  if (minutes > 0) {
    return minutes === 1 ? "Hace 1 minuto" : `Hace ${minutes} minutos`
  }

  return "Hace un momento"
}

export default function CandidateApplicationDetailClient({
  offerId,
  candidate,
  statusOptions,
  culturePreferenceCatalog,
  initialNotes,
  initialFeedback,
  behavioralQuestion1,
  behavioralQuestion2,
}: CandidateApplicationDetailClientProps) {
  const fullName = `${candidate.name} ${candidate.lastname}`.trim()
  const [applicationStatus, setApplicationStatus] = React.useState(candidate.application_status)
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false)
  const [notes, setNotes] = React.useState(initialNotes)
  const [newNote, setNewNote] = React.useState("")
  const [isSavingNote, setIsSavingNote] = React.useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = React.useState(false)
  const [feedback, setFeedback] = React.useState<ApplicationFeedback>(initialFeedback)
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

  const mappedPreferences = React.useMemo(
    () =>
      culturePreferenceCatalog
        .map((category) => {
          const selectedTechnicalName = candidate.cultural_preferences[category.technical_name]

          if (!selectedTechnicalName) {
            return null
          }

          const selectedOption = category.values.find(
            (value) => value.technical_name === selectedTechnicalName
          )

          if (!selectedOption) {
            return null
          }

          return {
            key: category.technical_name,
            categoryName: category.display_name,
            displayName: selectedOption.display_name,
            description: selectedOption.description,
          }
        })
        .filter((value): value is NonNullable<typeof value> => Boolean(value)),
    [candidate.cultural_preferences, culturePreferenceCatalog]
  )

  const statusDisplay = React.useMemo(
    () =>
      statusOptions.find((statusOption) => statusOption.techical_name === applicationStatus)
        ?.display_name ?? applicationStatus,
    [applicationStatus, statusOptions]
  )

  const aiFeedbackSections = React.useMemo(() => {
    const entries = Object.entries(candidate.ai_feedback ?? {}).filter(
      ([title, content]) => title.trim().length > 0 && content.trim().length > 0
    )

    if (entries.length > 0) {
      return entries
    }

    if (candidate.ai_summary?.trim()) {
      return [["Resumen", candidate.ai_summary.trim()]]
    }

    return []
  }, [candidate.ai_feedback, candidate.ai_summary])

  const whatsappUrl = React.useMemo(() => {
    const rawPhone = candidate.phone?.trim() ?? ""
    if (!rawPhone) {
      return null
    }

    const normalizedPhone = rawPhone.replace(/[^\d]/g, "")
    if (!normalizedPhone) {
      return null
    }

    return `https://wa.me/${normalizedPhone}`
  }, [candidate.phone])

  const mailtoUrl = React.useMemo(() => {
    const email = candidate.email?.trim() ?? ""
    if (!email) {
      return null
    }

    return `mailto:${email}`
  }, [candidate.email])

  const handleStatusChange = async (nextStatus: string) => {
    if (nextStatus === applicationStatus) {
      return
    }

    setIsUpdatingStatus(true)

    try {
      const response = await fetch(`/api/admin/ofertas/${offerId}/candidatos/${candidate.application_id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(payload?.message || "No se pudo actualizar el estado")
      }

      setApplicationStatus(nextStatus)
      toast.success("Estado actualizado")

      if (nextStatus === "hired" && !feedback.employer) {
        setShowFeedbackModal(true)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar el estado"
      toast.error(message)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleFeedbackClose = async () => {
    setShowFeedbackModal(false)
    const response = await fetch(
      `/api/admin/ofertas/${offerId}/candidatos/${candidate.application_id}/feedback`
    )
    if (response.ok) {
      const data = (await response.json()) as ApplicationFeedback
      setFeedback(data)
    }
  }

  const handleSaveNote = async () => {
    const cleanMessage = newNote.trim()

    if (!cleanMessage) {
      return
    }

    setIsSavingNote(true)

    try {
      const response = await fetch(
        `/api/admin/ofertas/${offerId}/candidatos/${candidate.application_id}/notas`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ text: cleanMessage }),
        }
      )

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(payload?.message || "No se pudo guardar la nota")
      }

      const noteToInsert = (await response.json()) as ApplicationNote

      setNotes((prev) => [noteToInsert, ...prev])
      setNewNote("")
      toast.success("Nota guardada")
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar la nota"
      toast.error(message)
    } finally {
      setIsSavingNote(false)
    }
  }

  return (
    <TooltipProvider>
      <section className="mx-auto w-full max-w-350 p-4 md:p-6">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-card p-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{fullName}</h1>
            <p className="text-muted-foreground text-sm">Postulante para {candidate.offer_title}</p>
          </div>
          <Badge variant={getStatusBadgeVariant(applicationStatus)}>{statusDisplay}</Badge>
        </header>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="flex flex-col items-center gap-3 text-center">
                  <Avatar className="size-20">
                    <AvatarImage src={candidate.profile_picture} alt={fullName} />
                    <AvatarFallback>{toInitials(fullName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{fullName}</p>
                    <p className="text-muted-foreground text-sm">
                      {[candidate.state, candidate.country].filter(Boolean).join(", ") || "Ubicación no disponible"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="text-muted-foreground flex items-center gap-2">
                    <Mail className="size-4" />
                    <span className="truncate">{candidate.email}</span>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-2">
                    <Phone className="size-4" />
                    <span>{candidate.phone ?? "No disponible"}</span>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-2">
                    <Globe className="size-4" />
                    {candidate.contact_page ? (
                      <a
                        href={candidate.contact_page}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary truncate hover:underline"
                      >
                        {candidate.contact_page}
                      </a>
                    ) : (
                      <span>No disponible</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    asChild
                    variant="outline"
                    className="h-auto w-full justify-start px-3 py-2 whitespace-normal"
                    disabled={!whatsappUrl}
                  >
                    <a
                      href={whatsappUrl ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="flex w-full min-w-0 items-center gap-2 text-left text-sm"
                    >
                      <MessageCircle className="size-4 shrink-0" />
                      <span className="min-w-0 wrap-break-word">Enviar mensaje por WhatsApp</span>
                    </a>
                  </Button>

                  <Button asChild variant="outline" className="h-auto w-full justify-start px-3 py-2" disabled={!mailtoUrl}>
                    <a href={mailtoUrl ?? "#"} className="flex w-full min-w-0 items-center gap-2 text-left text-sm">
                      <Mail className="size-4 shrink-0" />
                      <span className="min-w-0 wrap-break-word">Enviar correo</span>
                    </a>
                  </Button>

                  <Button asChild className="h-auto w-full justify-start px-3 py-2 whitespace-normal">
                    <Link
                      href={`/admin/candidatos/${candidate.candidate_id}`}
                      className="flex w-full min-w-0 items-center text-left text-sm"
                    >
                      <span className="min-w-0 wrap-break-word">Ver perfil completo del candidato</span>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="gap-1">
                <CardTitle className="text-base">Estado de postulación</CardTitle>
                <CardDescription>Cambia el status de la aplicación</CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={applicationStatus}
                  onValueChange={handleStatusChange}
                  disabled={isUpdatingStatus}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.techical_name} value={status.techical_name}>
                        {status.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isUpdatingStatus ? (
                  <p className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
                    <Loader2 className="size-3 animate-spin" />
                    Actualizando estado...
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Análisis Inteligente (IA)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <section className="space-y-4">
                  <h3 className="font-medium">Competencias</h3>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>Habilidades técnicas</span>
                      <span>{candidate.technical_score}%</span>
                    </div>
                    <Progress
                      value={candidate.technical_score}
                      className={getProgressColorClass(candidate.technical_score)}
                    />
                    <div className="flex flex-wrap gap-2">
                      {candidate.technical_skills.map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>Habilidades blandas</span>
                      <span>{candidate.soft_score}%</span>
                    </div>
                    <Progress value={candidate.soft_score} className={getProgressColorClass(candidate.soft_score)} />
                    <div className="flex flex-wrap gap-2">
                      {candidate.soft_skills.map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="font-medium">Alineación cultural</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>Puntuación</span>
                      <span>{candidate.culture_score}%</span>
                    </div>
                    <Progress
                      value={candidate.culture_score}
                      className={getProgressColorClass(candidate.culture_score)}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Valores</p>
                    <div className="flex flex-wrap gap-2">
                      {candidate.values.map((value) => (
                        <Badge key={value} variant="outline">
                          {value}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Preferencias culturales</p>
                    <div className="flex flex-wrap gap-2">
                      {mappedPreferences.map((preference) => (
                        <Tooltip key={preference.key}>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="cursor-help">
                              {preference.categoryName}: {preference.displayName}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs border border-border bg-background text-foreground shadow-lg">
                            <p className="text-sm leading-relaxed text-foreground">{preference.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="font-medium">Retroalimentación</h3>
                  {aiFeedbackSections.length > 0 ? (
                    aiFeedbackSections.map(([title, content]) => (
                      <div key={title} className="rounded-lg border p-3">
                        <h4 className="text-base font-bold md:text-lg">{title}</h4>
                        <p className="text-muted-foreground mt-1 whitespace-pre-line text-sm">
                          {content}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border p-3">
                      <p className="text-muted-foreground text-sm">
                        No hay retroalimentación disponible todavía.
                      </p>
                    </div>
                  )}
                </section>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Información del candidato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <section className="space-y-3">
                  <h3 className="font-medium">Curriculum Vitae</h3>
                  <div className="overflow-hidden rounded-lg border">
                    {!cvPreviewType ? (
                      <div className="text-muted-foreground flex min-h-85 items-center justify-center px-4 text-center text-sm">
                        El candidato no tiene CV cargado.
                      </div>
                    ) : null}

                    {cvPreviewType === "pdf" && candidate.cv_url ? (
                      <iframe
                        title="Vista previa del CV"
                        src={candidate.cv_url}
                        className="min-h-125 w-full"
                      />
                    ) : null}

                    {cvPreviewType === "docx" ? (
                      <div className="max-h-125 overflow-auto p-4">
                        <div ref={docxContainerRef} />
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="font-medium">Preguntas Conductuales</h3>

                  <div className="space-y-1 rounded-lg border p-3">
                    <p className="text-sm font-bold">{behavioralQuestion1}</p>
                    <p className="text-muted-foreground text-sm">{candidate.behavioral_ans_1 || "Sin respuesta."}</p>
                  </div>

                  <div className="space-y-1 rounded-lg border p-3">
                    <p className="text-sm font-bold">{behavioralQuestion2}</p>
                    <p className="text-muted-foreground text-sm">{candidate.behavioral_ans_2 || "Sin respuesta."}</p>
                  </div>
                </section>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {(feedback.employer || feedback.candidate) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Retroalimentación de experiencia</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {feedback.employer && (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Empleador</p>
                      <StarRating value={feedback.employer.overall_rating} readonly label="Satisfacción general" size="sm" />
                      {feedback.employer.match_accuracy_rating !== null && (
                        <StarRating value={feedback.employer.match_accuracy_rating} readonly label="Precisión del matching IA" size="sm" />
                      )}
                      {feedback.employer.process_rating !== null && (
                        <StarRating value={feedback.employer.process_rating} readonly label="Proceso de selección" size="sm" />
                      )}
                      {feedback.employer.comments && (
                        <p className="text-sm text-muted-foreground italic">"{feedback.employer.comments}"</p>
                      )}
                    </div>
                  )}
                  {feedback.candidate && (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Candidato</p>
                      <StarRating value={feedback.candidate.overall_rating} readonly label="Experiencia general" size="sm" />
                      {feedback.candidate.process_rating !== null && (
                        <StarRating value={feedback.candidate.process_rating} readonly label="Transparencia del proceso" size="sm" />
                      )}
                      {feedback.candidate.comments && (
                        <p className="text-sm text-muted-foreground italic">"{feedback.candidate.comments}"</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Notas Internas del Equipo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={newNote}
                  onChange={(event) => setNewNote(event.target.value)}
                  placeholder="Añade tus comentarios sobre el candidato aquí..."
                />
                <Button className="w-full" onClick={handleSaveNote} disabled={isSavingNote}>
                  {isSavingNote ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Guardar Nota
                </Button>

                <div className="space-y-4">
                  {notes.length > 0 ? (
                    notes.map((note) => (
                      <article key={note.id} className="flex items-start gap-3">
                        <Avatar>
                          <AvatarImage src={note.recruiter_avatar_url} alt={note.recruiter_name} />
                          <AvatarFallback>{toInitials(note.recruiter_name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <p className="font-medium">{note.recruiter_name}</p>
                            <p className="text-muted-foreground text-xs">{formatRelativeDate(note.created_at)}</p>
                          </div>
                          <p className="text-muted-foreground text-sm">{note.text}</p>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">Todavía no hay notas internas.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <EmployerFeedbackModal
        open={showFeedbackModal}
        offerId={offerId}
        applicationId={candidate.application_id}
        candidateName={fullName}
        onClose={handleFeedbackClose}
      />
    </TooltipProvider>
  )
}
