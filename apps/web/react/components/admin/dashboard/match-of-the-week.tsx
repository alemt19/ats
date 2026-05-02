"use client"

import ScoreChip from "./score-chip"

export type MatchOfTheWeek = {
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
}

type MatchOfTheWeekProps = {
  data: MatchOfTheWeek | null
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ""
  const second = parts[1]?.[0] ?? ""
  if (parts.length === 1) return first.toUpperCase()
  return (first + second).toUpperCase()
}

function getDaysAgo(isoDate: string): string {
  const days = Math.floor(
    (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (days === 0) return "hoy"
  if (days === 1) return "hace 1 día"
  return `hace ${days} días`
}

type SubScoreBarProps = {
  label: string
  value: number
  color: string
}

function SubScoreBar({ label, value, color }: SubScoreBarProps) {
  const pct = Math.round(value * 100)
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono tabular-nums text-foreground/70 w-8 text-right">
        {value.toFixed(2)}
      </span>
    </div>
  )
}

export default function MatchOfTheWeek({ data }: MatchOfTheWeekProps) {
  if (!data) {
    return (
      <div className="border-l-4 border-l-accent border border-border/40 rounded-2xl bg-card/80 p-5">
        <p className="text-sm text-muted-foreground text-center py-4">
          Esta semana aún no hay candidatos evaluados. El match aparecerá aquí cuando
          el primer candidato sea procesado.
        </p>
      </div>
    )
  }

  const initials = getInitials(data.candidateName)
  const daysAgo = getDaysAgo(data.createdAt)

  return (
    <div className="border-l-4 border-l-accent border border-border/40 rounded-2xl bg-card/80 p-5 flex flex-col gap-3">
      {/* Header: avatar + name + date */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-accent/20 text-foreground flex items-center justify-center font-display font-semibold text-sm shrink-0 select-none">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">
            {data.candidateName}
          </p>
          <p className="text-xs text-muted-foreground">{daysAgo}</p>
        </div>
      </div>

      <hr className="border-border/40" />

      {/* Job title */}
      <p className="text-sm font-medium text-foreground/90 leading-tight">
        {data.jobTitle}
      </p>

      {/* Overall score */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Puntuación global</span>
        <ScoreChip value={data.overallScore} />
      </div>

      {/* Sub-scores */}
      <div className="flex flex-col gap-1.5">
        <SubScoreBar
          label="Técnica"
          value={data.technicalScore}
          color="var(--primary)"
        />
        <SubScoreBar
          label="Blanda"
          value={data.softScore}
          color="hsl(38 92% 50%)"
        />
        <SubScoreBar
          label="Cultural"
          value={data.cultureScore}
          color="hsl(142 71% 45%)"
        />
      </div>

    </div>
  )
}
