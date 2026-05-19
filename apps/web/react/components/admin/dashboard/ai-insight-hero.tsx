import CalibrationPlot from "./calibration-plot"
import MatchOfTheWeek from "./match-of-the-week"
import EvalStatusPills from "./eval-status-pills"

type CalibrationBin = {
  bin: number
  scoreMin: number
  scoreMax: number
  total: number
  hired: number
  hireRate: number | null
}

type MatchOfTheWeekData = {
  candidateName: string
  jobTitle: string
  overallScore: number
  technicalScore: number
  softScore: number
  cultureScore: number
  weightTechnical: number
  weightSoft: number
  weightCulture: number
  createdAt: string
} | null

type EvalPill = {
  status: string
  count: number
}

type AiInsightHeroProps = {
  calibration: CalibrationBin[]
  matchOfTheWeek: MatchOfTheWeekData
  evalStatusPills: EvalPill[]
}

export default function AiInsightHero({
  calibration,
  matchOfTheWeek,
  evalStatusPills,
}: AiInsightHeroProps) {
  return (
    <section className="space-y-4">
      {/* Header de sección */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border/40" />
        <span className="text-xs font-semibold uppercase tracking-widest text-foreground/40">
          Motor de IA · Emparejamiento
        </span>
        <div className="h-px flex-1 bg-border/40" />
      </div>

      {/* Card principal con gradient-border */}
      <div className="gradient-border rounded-2xl bg-card/90 shadow-soft">
        <div className="p-6 space-y-6">
          {/* Layout 2/3 + 1/3 */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* B1: Calibration plot — ocupa 2/3 */}
            <div className="space-y-2 lg:col-span-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Calibración del modelo</h3>
                <p className="text-xs text-foreground/50 mt-0.5">
                  Score predicho vs tasa de contratación real por rango
                </p>
              </div>
              <CalibrationPlot data={calibration} />
            </div>

            {/* B2: Match of the Week — ocupa 1/3 */}
            <div className="space-y-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Mejor match de la semana</h3>
                <p className="text-xs text-foreground/50 mt-0.5">
                  Candidato con mayor score en los últimos 7 días
                </p>
              </div>
              <MatchOfTheWeek data={matchOfTheWeek} />
            </div>
          </div>

          {/* B3: Eval status pills — banda inferior */}
          <div className="border-t border-border/30 pt-4 space-y-2">
            <p className="text-xs font-medium text-foreground/50">Estado del pipeline de evaluación</p>
            <EvalStatusPills pills={evalStatusPills} />
          </div>
        </div>
      </div>
    </section>
  )
}
