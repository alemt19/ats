import { Star } from "lucide-react"
import { Progress } from "react/components/ui/progress"

type FeedbackStats = {
    employer: {
        avg_overall: number
        avg_process: number
        avg_match_accuracy: number
        count: number
    } | null
    candidate: {
        avg_overall: number
        avg_process: number
        count: number
    } | null
}

function FeedbackStatRow({ label, value }: { label: string; value: number | null | undefined }) {
    const hasValue = value !== null && value !== undefined && value > 0
    const pct = hasValue ? Math.round((value! / 5) * 100) : 0
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
                <span className="text-foreground/70">{label}</span>
                <span className="font-medium tabular-nums text-foreground/50">{hasValue ? `${pct}%` : "N/A"}</span>
            </div>
            <Progress value={pct} className="h-1.5" />
        </div>
    )
}

export default function FeedbackStatsCard({ feedbackStats }: { feedbackStats: FeedbackStats }) {
    const hasData = feedbackStats.employer !== null || feedbackStats.candidate !== null

    if (!hasData) {
        return (
            <p className="text-sm text-foreground/60">
                Aún no hay calificaciones registradas. Aparecerán aquí cuando empleadores y candidatos completen sus evaluaciones post-contratación.
            </p>
        )
    }

    return (
        <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-border/70 bg-background/85 p-5">
                <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                        <Star aria-hidden="true" className="size-4 text-primary" />
                    </span>
                    <div>
                        <p className="text-sm font-semibold">Empleadores</p>
                        <p className="text-xs text-foreground/60">
                            {feedbackStats.employer ? `${feedbackStats.employer.count} evaluaciones` : "Sin evaluaciones aún"}
                        </p>
                    </div>
                </div>
                <div className="space-y-3">
                    <FeedbackStatRow label="Satisfacción general" value={feedbackStats.employer?.avg_overall} />
                    <FeedbackStatRow label="Precisión del análisis IA" value={feedbackStats.employer?.avg_match_accuracy} />
                    <FeedbackStatRow label="Eficiencia del proceso" value={feedbackStats.employer?.avg_process} />
                </div>
            </div>

            <div className="space-y-4 rounded-xl border border-border/70 bg-background/85 p-5">
                <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10">
                        <Star aria-hidden="true" className="size-4 text-amber-500" />
                    </span>
                    <div>
                        <p className="text-sm font-semibold">Candidatos</p>
                        <p className="text-xs text-foreground/60">
                            {feedbackStats.candidate ? `${feedbackStats.candidate.count} evaluaciones` : "Sin evaluaciones aún"}
                        </p>
                    </div>
                </div>
                <div className="space-y-3">
                    <FeedbackStatRow label="Satisfacción general" value={feedbackStats.candidate?.avg_overall} />
                    <FeedbackStatRow label="Transparencia del proceso" value={feedbackStats.candidate?.avg_process} />
                </div>
            </div>
        </div>
    )
}
