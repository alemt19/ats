"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "react/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "react/components/ui/dialog"
import { StarRating } from "react/components/ui/star-rating"
import { Textarea } from "react/components/ui/textarea"

type EmployerFeedbackModalProps = {
  open: boolean
  offerId: number
  applicationId: number
  candidateName: string
  onClose: () => void
}

export function EmployerFeedbackModal({
  open,
  offerId,
  applicationId,
  candidateName,
  onClose,
}: EmployerFeedbackModalProps) {
  const [overallRating, setOverallRating] = React.useState(0)
  const [processRating, setProcessRating] = React.useState(0)
  const [matchAccuracyRating, setMatchAccuracyRating] = React.useState(0)
  const [comments, setComments] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)

  const handleSubmit = async () => {
    if (overallRating === 0) {
      toast.error("La calificación general es obligatoria")
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch(
        `/api/admin/ofertas/${offerId}/candidatos/${applicationId}/feedback`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            overall_rating: overallRating,
            process_rating: processRating > 0 ? processRating : undefined,
            match_accuracy_rating: matchAccuracyRating > 0 ? matchAccuracyRating : undefined,
            comments: comments.trim() || undefined,
          }),
        }
      )

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(payload?.message ?? "No se pudo guardar la retroalimentación")
      }

      toast.success("Retroalimentación guardada")
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar la retroalimentación"
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Calificar experiencia de contratación</DialogTitle>
          <DialogDescription>
            Comparte tu experiencia al contratar a {candidateName}. Esto nos ayuda a mejorar el
            sistema de matching.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <StarRating
            label="Satisfacción general con el candidato *"
            value={overallRating}
            onChange={setOverallRating}
          />

          <StarRating
            label="Precisión del matching IA"
            value={matchAccuracyRating}
            onChange={setMatchAccuracyRating}
          />

          <StarRating
            label="Eficiencia del proceso de selección"
            value={processRating}
            onChange={setProcessRating}
          />

          <div className="space-y-1.5">
            <span className="text-sm font-medium">Comentarios (opcional)</span>
            <Textarea
              placeholder="¿Qué destacarías de este proceso?"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              maxLength={1000}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Omitir
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || overallRating === 0}>
            {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Enviar retroalimentación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
