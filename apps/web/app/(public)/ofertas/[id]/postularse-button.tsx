"use client"

import * as React from "react"
import { toast } from "sonner"

import { Badge } from "react/components/ui/badge"
import { Button } from "react/components/ui/button"

type PostularseButtonProps = {
  isLoggedIn: boolean
  alreadyApplied: boolean
  initialStatusTechnicalName?: string
  initialStatusDisplayName?: string
  appliedStatusTechnicalName: string
  appliedStatusDisplayName: string
}

export default function PostularseButton({
  isLoggedIn,
  alreadyApplied,
  initialStatusTechnicalName,
  initialStatusDisplayName,
  appliedStatusTechnicalName,
  appliedStatusDisplayName,
}: PostularseButtonProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isApplied, setIsApplied] = React.useState(alreadyApplied)
  const [statusTechnicalName, setStatusTechnicalName] = React.useState(
    initialStatusTechnicalName ?? ""
  )
  const [statusDisplayName, setStatusDisplayName] = React.useState(
    initialStatusDisplayName ?? ""
  )
  
  const handleApply = async () => {
    if (!isLoggedIn) {
      toast.error("Debes iniciar sesión para postularte")
      return
    }

    if (isApplied) {
      return
    }

    setIsSubmitting(true)

    try {
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
