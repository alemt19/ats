"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "react/components/ui/badge"
import { Button } from "react/components/ui/button"

type PostularseButtonProps = {
  isLoggedIn: boolean
  isCandidate: boolean
  alreadyApplied: boolean
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
  isLoggedIn,
  isCandidate,
  alreadyApplied,
  initialStatusTechnicalName,
  initialStatusDisplayName,
  appliedStatusTechnicalName,
  appliedStatusDisplayName,
}: PostularseButtonProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isApplied, setIsApplied] = React.useState(alreadyApplied)
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

      await new Promise((resolve) => setTimeout(resolve, 700))
      setIsApplied(true)
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
    return (
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
    )
  }

  return (
    <Button type="button" onClick={handleApply} disabled={isSubmitting}>
      {isSubmitting ? "Postulando..." : "Postularme"}
    </Button>
  )
}
