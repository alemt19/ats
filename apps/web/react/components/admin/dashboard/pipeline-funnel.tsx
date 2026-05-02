type FunnelStage = {
  technical_name: string
  label: string
  count: number
  dwell_days: number | null
}

type FunnelProps = {
  stages: FunnelStage[]
  avgFirstResponseDays: number | null
}

const STAGE_COLORS: Record<string, string> = {
  applied: "var(--primary)",
  pre_screening: "hsl(38 92% 50%)",
  hired: "hsl(142 71% 45%)",
  rejected: "hsl(0 72% 51%)",
}

function ConversionBadge({ rate }: { rate: number }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted/60 border border-border/40 px-2 py-0.5 text-xs text-foreground/60 font-mono font-medium">
      {rate}%
    </span>
  )
}

function FunnelBar({
  stage,
  pct,
}: {
  stage: FunnelStage
  pct: number
}) {
  const color = STAGE_COLORS[stage.technical_name] ?? "var(--primary)"

  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 text-sm text-foreground/70 text-right truncate">
        {stage.label}
      </span>
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 bg-muted/40 rounded-r-md overflow-hidden h-8">
          <div
            className="h-8 rounded-r-md transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
        <span className="w-8 text-sm font-mono font-semibold text-foreground shrink-0 text-right">
          {stage.count}
        </span>
      </div>
    </div>
  )
}

export default function PipelineFunnel({
  stages,
  avgFirstResponseDays,
}: FunnelProps) {
  const allZero = stages.every((s) => s.count === 0)

  if (allZero) {
    return (
      <p className="text-sm text-foreground/50 py-4">
        Aún no hay candidatos en el pipeline para el período seleccionado.
      </p>
    )
  }

  const maxCount = Math.max(...stages.map((s) => s.count), 1)

  const applied = stages.find((s) => s.technical_name === "applied")
  const preScreening = stages.find(
    (s) => s.technical_name === "pre_screening"
  )
  const hired = stages.find((s) => s.technical_name === "hired")
  const rejected = stages.find((s) => s.technical_name === "rejected")

  // Conversion: applied → pre_screening
  const appliedToPreScreening =
    applied && preScreening && applied.count > 0
      ? Math.round((preScreening.count / applied.count) * 100)
      : null

  // Conversion: pre_screening → hired / rejected
  const preScreeningToHired =
    preScreening && hired && preScreening.count > 0
      ? Math.round((hired.count / preScreening.count) * 100)
      : null

  const preScreeningToRejected =
    preScreening && rejected && preScreening.count > 0
      ? Math.round((rejected.count / preScreening.count) * 100)
      : null

  const pct = (count: number) =>
    Math.round((count / maxCount) * 100)

  return (
    <div className="space-y-1">
      {/* Applied */}
      {applied && (
        <FunnelBar stage={applied} pct={pct(applied.count)} />
      )}

      {/* Conversion: applied → pre_screening */}
      {appliedToPreScreening !== null && (
        <div className="flex items-center gap-3 py-0.5">
          <span className="w-36 shrink-0" />
          <div className="flex items-center gap-1.5 text-xs text-foreground/50 pl-1">
            <span>↓</span>
            <ConversionBadge rate={appliedToPreScreening} />
            <span>conversión</span>
          </div>
        </div>
      )}

      {/* Pre-screening */}
      {preScreening && (
        <FunnelBar stage={preScreening} pct={pct(preScreening.count)} />
      )}

      {/* Conversions: pre_screening → hired & rejected */}
      {(preScreeningToHired !== null || preScreeningToRejected !== null) && (
        <div className="flex items-center gap-3 py-0.5">
          <span className="w-36 shrink-0" />
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-foreground/50 pl-1">
            <span>↓</span>
            {preScreeningToHired !== null && (
              <>
                <ConversionBadge rate={preScreeningToHired} />
                <span>a contratados</span>
              </>
            )}
            {preScreeningToHired !== null &&
              preScreeningToRejected !== null && (
                <span className="mx-1">·</span>
              )}
            {preScreeningToRejected !== null && (
              <>
                <ConversionBadge rate={preScreeningToRejected} />
                <span>rechazados</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hired + Rejected side by side */}
      {(hired || rejected) && (
        <div className="grid grid-cols-2 gap-3 mt-1">
          {hired ? (
            <FunnelBar stage={hired} pct={pct(hired.count)} />
          ) : (
            <div />
          )}
          {rejected ? (
            <FunnelBar stage={rejected} pct={pct(rejected.count)} />
          ) : (
            <div />
          )}
        </div>
      )}

      {/* Avg first response */}
      {avgFirstResponseDays !== null && (
        <p className="text-sm text-foreground/70 pt-3 border-t border-border/30 mt-3">
          Tiempo medio hasta primera respuesta:{" "}
          <span className="font-mono font-semibold text-foreground">
            {avgFirstResponseDays.toFixed(1)}
          </span>{" "}
          días
        </p>
      )}
    </div>
  )
}
