"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "react/components/ui/badge"
import { Button } from "react/components/ui/button"

type PostularseButtonProps = {
  jobId: number
  isLoggedIn: boolean
  isCandidate: boolean
  alreadyApplied: boolean
  initialAppliedAt?: string | null
  initialStatusTechnicalName?: string
  initialStatusDisplayName?: string
  appliedStatusTechnicalName: string
  appliedStatusDisplayName: string
}

type ProfileCompletionResponse = {
  isComplete: boolean
  missingFields: string[]
  message?: string
}

export default function PostularseButton({
  jobId,
  isLoggedIn,
  isCandidate,
  alreadyApplied,
  initialAppliedAt,
  initialStatusTechnicalName,
  initialStatusDisplayName,
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

  const redirectToLogin = React.useCallback(() => {
    const redirect = pathname ? `?redirect=${encodeURIComponent(pathname)}` : ""
    setTimeout(() => {
      router.push(`/login${redirect}`)
    }, 900)
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
        message: payload?.message ?? "Debes iniciar sesion como candidato para postularte",
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
      toast.error("Necesitas iniciar sesion como candidato para postularte")
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
        const missingList = validation.missingFields.join(", ")
        toast.error(
          `No puedes postularte porque no has completado tu perfil. Te falta: ${missingList}`
        )
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

      setIsApplied(true)
      setAppliedAt((current) => current ?? new Date().toISOString())
      setStatusTechnicalName(appliedStatusTechnicalName)
      setStatusDisplayName(appliedStatusDisplayName)
      toast.success("Te has postulado exitosamente, ¡buena suerte!")
    } catch {
      toast.error("No se pudo completar la postulación")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isApplied) {
    const formattedAppliedDate = appliedAt ? formatAppliedDate(appliedAt) : null

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" disabled>
            Ya postulado
          </Button>
          {statusDisplayName ? (
            <Badge variant={statusTechnicalName === "rejected" ? "destructive" : statusTechnicalName === "contacted" ? "success" : "outline"}>
              Estado: {statusDisplayName}
            </Badge>
          ) : null}
        </div>
        {formattedAppliedDate ? (
          <p className="text-sm text-muted-foreground">Te postulaste el {formattedAppliedDate}.</p>
        ) : null}
      </div>
    )
  }

  return (
    <Button type="button" onClick={handleApply} disabled={isSubmitting}>
      {isSubmitting ? "Postulando..." : "Postularme"}
    </Button>
  )
}
