"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "react/components/ui/badge"
import { Button } from "react/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "react/components/ui/dialog"
import { trackUxEvent } from "react/lib/analytics-events"

type PostularseButtonProps = {
  jobId: number
  isLoggedIn: boolean
  isCandidate: boolean
  alreadyApplied: boolean
  initialAppliedAt?: string | null
  initialStatusTechnicalName?: string
  initialStatusDisplayName?: string
  initialEvaluationStatus?: "pending" | "processing" | "completed" | "failed" | null
  appliedStatusTechnicalName: string
  appliedStatusDisplayName: string
}

type ProfileCompletionResponse = {
  isComplete: boolean
  missingFields: string[]
  message?: string
}

type ApplyResponse = {
  ok: boolean
  applicationId: number
  evaluationStatus: "pending" | "processing" | "completed" | "failed"
}

type RefreshApplicationResponse = {
  ok: boolean
  applicationId?: number
  status?: string | null
  evaluationStatus?: "pending" | "processing" | "completed" | "failed"
}

type EvaluationStatus = "pending" | "processing" | "completed" | "failed" | null

type ProfileSection = {
  key: "mis-datos" | "competencias-valores" | "preferencias-culturales"
  title: string
  href: string
  fields: string[]
}

const PROFILE_SECTIONS: ProfileSection[] = [
  {
    key: "mis-datos",
    title: "Mis datos",
    href: "/mi-perfil/mis-datos",
    fields: ["nombre", "apellido", "fecha de nacimiento", "estado", "ciudad", "telefono", "dni"],
  },
  {
    key: "competencias-valores",
    title: "Competencias y valores",
    href: "/mi-perfil/competencias-valores",
    fields: [
      "cv",
      "respuesta conductual 1",
      "respuesta conductual 2",
      "habilidades tecnicas",
      "habilidades blandas",
      "valores",
    ],
  },
  {
    key: "preferencias-culturales",
    title: "Preferencias culturales",
    href: "/mi-perfil/preferencias-culturales",
    fields: [
      "dress_code",
      "collaboration_style",
      "work_pace",
      "level_of_autonomy",
      "dealing_with_management",
      "level_of_monitoring",
    ],
  },
]

function resolveProfileSections(missingFields: string[]) {
  const normalizedMissing = missingFields.map((value) => value.trim().toLowerCase())

  return PROFILE_SECTIONS.filter((section) =>
    section.fields.some((field) => normalizedMissing.includes(field))
  )
}

function getEvaluationLabel(status: EvaluationStatus) {
  switch (status) {
    case "completed":
      return "Evaluación completada"
    case "processing":
      return "Evaluación en proceso"
    case "failed":
      return "Evaluación con error"
    case "pending":
    default:
      return "Evaluación pendiente"
  }
}

function getEvaluationDescription(status: EvaluationStatus) {
  switch (status) {
    case "completed":
      return "Tu evaluación ya está lista. Desde mis postulaciones podrás revisar el resultado y explorar ofertas similares."
    case "processing":
      return "Estamos evaluando tu postulación. Cuando termine, verás ofertas similares en mis postulaciones."
    case "failed":
      return "Hubo un problema al evaluar tu postulación. Podrás volver más tarde para revisar su estado."
    case "pending":
    default:
      return "Tu postulación está en cola de evaluación. Cuando se procese, verás ofertas similares en mis postulaciones."
  }
}

export default function PostularseButton({
  jobId,
  isLoggedIn,
  isCandidate,
  alreadyApplied,
  initialAppliedAt,
  initialStatusTechnicalName,
  initialStatusDisplayName,
  initialEvaluationStatus,
  appliedStatusTechnicalName,
  appliedStatusDisplayName,
}: PostularseButtonProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isApplied, setIsApplied] = React.useState(alreadyApplied)
  const [appliedAt, setAppliedAt] = React.useState<string | null>(initialAppliedAt ?? null)
  const [statusTechnicalName, setStatusTechnicalName] = React.useState(
    initialStatusTechnicalName ?? ""
  )
  const [statusDisplayName, setStatusDisplayName] = React.useState(
    initialStatusDisplayName ?? ""
  )
  const [evaluationStatus, setEvaluationStatus] = React.useState<EvaluationStatus>(
    initialEvaluationStatus ?? null
  )
  const [applicationId, setApplicationId] = React.useState<number | null>(null)
  const [showSuccessDialog, setShowSuccessDialog] = React.useState(false)
  const [showProfileChecklistDialog, setShowProfileChecklistDialog] = React.useState(false)
  const [missingFields, setMissingFields] = React.useState<string[]>([])
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const redirectToLogin = React.useCallback(() => {
    const redirect = pathname ? `?redirect=${encodeURIComponent(pathname)}` : ""
    router.push(`/login${redirect}`)
  }, [pathname, router])

  const validateCandidateProfile = React.useCallback(async () => {
    const response = await fetch("/api/candidates/profile-completion", {
      method: "GET",
      cache: "no-store",
    })

    const payload = (await response.json().catch(() => null)) as ProfileCompletionResponse | null

    if (response.status === 401 || response.status === 403) {
      return {
        unauthorized: true,
        isComplete: false,
        missingFields: [],
        message: payload?.message ?? "Debes iniciar sesión como candidato para postularte",
      }
    }

    if (!response.ok || !payload) {
      throw new Error("No se pudo validar el perfil")
    }

    return {
      unauthorized: false,
      isComplete: payload.isComplete,
      missingFields: payload.missingFields,
      message: payload.message,
    }
  }, [])

  const formatAppliedDate = React.useCallback((value: string) => {
    const parsed = new Date(value)

    if (Number.isNaN(parsed.getTime())) {
      return null
    }

    return new Intl.DateTimeFormat("es-VE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(parsed)
  }, [])
  
  const handleApply = async () => {
    if (!isLoggedIn || !isCandidate) {
      toast.error("Necesitas iniciar sesión como candidato para postularte")
      redirectToLogin()
      return
    }

    if (isApplied) {
      return
    }

    setIsSubmitting(true)

    try {
      const validation = await validateCandidateProfile()

      if (validation.unauthorized) {
        toast.error(validation.message)
        redirectToLogin()
        return
      }

      if (!validation.isComplete) {
        setMissingFields(validation.missingFields)
        setShowProfileChecklistDialog(true)
        toast.error("Completa tu perfil para poder postularte")
        return
      }

      const applyRes = await fetch(`/api/ofertas/${jobId}/aplicar`, {
        method: "POST",
        cache: "no-store",
      })

      if (applyRes.status === 409) {
        // Already applied — just update local state to reflect that
        setIsApplied(true)
        setStatusTechnicalName(appliedStatusTechnicalName)
        setStatusDisplayName(appliedStatusDisplayName)
        toast.info("Ya te has postulado a esta oferta")
        return
      }

      if (!applyRes.ok) {
        const payload = await applyRes.json().catch(() => null)
        const msg = (payload as { message?: string } | null)?.message ?? "No se pudo completar la postulación"
        toast.error(msg)
        return
      }

      const applyPayload = (await applyRes.json().catch(() => null)) as ApplyResponse | null
      const nextApplicationId =
        applyPayload && typeof applyPayload.applicationId === "number"
          ? applyPayload.applicationId
          : null

      setIsApplied(true)
      setAppliedAt((current) => current ?? new Date().toISOString())
      setStatusTechnicalName(appliedStatusTechnicalName)
      setStatusDisplayName(appliedStatusDisplayName)
      setEvaluationStatus(applyPayload?.evaluationStatus ?? "pending")
      setApplicationId(nextApplicationId)
      setShowSuccessDialog(true)
      toast.success("Te has postulado exitosamente, ¡buena suerte!")
    } catch {
      toast.error("No se pudo completar la postulación")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRefreshApplication = async () => {
    if (!isLoggedIn || !isCandidate || !isApplied) {
      return
    }

    setIsRefreshing(true)

    try {
      const response = await fetch(`/api/ofertas/${jobId}/refrescar-postulacion`, {
        method: "POST",
        cache: "no-store",
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const message = (payload as { message?: string } | null)?.message ?? "No se pudo refrescar la postulación"
        toast.error(message)
        return
      }

      const payload = (await response.json().catch(() => null)) as RefreshApplicationResponse | null
      const nextApplicationId =
        payload && typeof payload.applicationId === "number" ? payload.applicationId : null

      setEvaluationStatus(payload?.evaluationStatus ?? "pending")
      if (nextApplicationId) {
        setApplicationId(nextApplicationId)
      }

      trackUxEvent("refresh_application", {
        jobId,
        applicationId: nextApplicationId,
      })

      toast.success("Postulación refrescada. Recalcularemos tu evaluación con tu perfil actualizado.")
    } catch {
      toast.error("No se pudo refrescar la postulación")
    } finally {
      setIsRefreshing(false)
    }
  }

  if (isApplied) {
    const formattedAppliedDate = appliedAt ? formatAppliedDate(appliedAt) : null

    return (
      <>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" disabled>
              Ya postulado
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleRefreshApplication()}
              disabled={isRefreshing}
            >
              {isRefreshing ? "Refrescando..." : "Refrescar postulación"}
            </Button>
            {statusDisplayName ? (
              <Badge variant={statusTechnicalName === "rejected" ? "destructive" : statusTechnicalName === "contacted" ? "success" : "outline"}>
                Estado: {statusDisplayName}
              </Badge>
            ) : null}
            <Badge variant={evaluationStatus === "failed" ? "destructive" : "outline"}>
              {getEvaluationLabel(evaluationStatus)}
            </Badge>
          </div>
          {formattedAppliedDate ? (
            <p className="text-sm text-muted-foreground">Te postulaste el {formattedAppliedDate}.</p>
          ) : null}
          <p className="text-sm text-muted-foreground">{getEvaluationDescription(evaluationStatus)}</p>
        </div>

        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="max-w-xl rounded-2xl">
            <DialogHeader>
              <DialogTitle>Postulación enviada</DialogTitle>
              <DialogDescription>
                {getEvaluationDescription(evaluationStatus)}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm text-foreground/80">
              {applicationId ? (
                <p>Id de postulación: #{applicationId}</p>
              ) : (
                <p>Tu postulación fue registrada correctamente.</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSuccessDialog(false)}
              >
                Seguir en esta oferta
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowSuccessDialog(false)
                  trackUxEvent("click_postulation_success_go_applications", {
                    jobId,
                    applicationId,
                  })
                  router.push(
                    typeof applicationId === "number"
                      ? `/mi-perfil/postulaciones?openSimilar=${applicationId}`
                      : "/mi-perfil/postulaciones"
                  )
                }}
              >
                Ir a mi postulación
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="space-y-2">
        <Button type="button" onClick={redirectToLogin}>Iniciar sesión para postularme</Button>
        <p className="text-sm text-muted-foreground">
          Debes iniciar sesión como candidato para completar la postulación.
        </p>
      </div>
    )
  }

  if (!isCandidate) {
    return (
      <div className="space-y-2">
        <Button type="button" disabled>Postularme</Button>
        <p className="text-sm text-muted-foreground">
          Esta acción está disponible solo para cuentas de candidato.
        </p>
      </div>
    )
  }

  const missingSections = resolveProfileSections(missingFields)

  return (
    <>
      <div className="space-y-2">
        <Button type="button" onClick={handleApply} disabled={isSubmitting}>
          {isSubmitting ? "Postulando..." : "Postularme"}
        </Button>
        <p className="text-sm text-muted-foreground">
          Antes de postularte, verifica que tu perfil esté completo para una evaluación más precisa.
        </p>
      </div>

      <Dialog open={showProfileChecklistDialog} onOpenChange={setShowProfileChecklistDialog}>
        <DialogContent className="max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>Completa tu perfil antes de postularte</DialogTitle>
            <DialogDescription>
              Para procesar tu postulación necesitamos estos datos. Te llevamos directo a cada sección.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {missingSections.map((section) => (
              <div key={section.key} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/30 p-3">
                <p className="text-sm font-medium text-foreground">{section.title}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowProfileChecklistDialog(false)
                    router.push(section.href)
                  }}
                >
                  Completar
                </Button>
              </div>
            ))}

            {missingSections.length === 0 ? (
              <div className="rounded-xl border border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground">
                Revisa tus secciones de perfil para completar la información faltante.
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowProfileChecklistDialog(false)}>
              Revisar luego
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
