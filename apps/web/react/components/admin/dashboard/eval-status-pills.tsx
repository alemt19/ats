"use client"

type EvalStatusPill = {
  status: string // 'pending' | 'processing' | 'completed' | 'failed'
  count: number
}

type EvalStatusPillsProps = {
  pills: EvalStatusPill[]
}

const STATUS_CONFIG: Record<
  string,
  { label: string; dotClass: string; pillClass: string; animate?: boolean }
> = {
  pending: {
    label: "Pendientes",
    dotClass: "bg-foreground/30",
    pillClass: "bg-muted/60 text-foreground/60 border-border/40",
  },
  processing: {
    label: "Procesando",
    dotClass: "bg-accent animate-pulse-accent",
    pillClass: "bg-accent/10 text-foreground border-accent/40",
    animate: true,
  },
  completed: {
    label: "Completados",
    dotClass: "bg-[hsl(142_71%_45%)]",
    pillClass:
      "bg-[hsl(142_71%_45%/0.1)] text-foreground border-[hsl(142_71%_45%/0.4)]",
  },
  failed: {
    label: "Fallidos",
    dotClass: "bg-destructive",
    pillClass: "bg-destructive/10 text-foreground border-destructive/30",
  },
}

export default function EvalStatusPills({ pills }: EvalStatusPillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {pills.map(({ status, count }) => {
        const config = STATUS_CONFIG[status]
        if (!config) return null

        return (
          <span
            key={status}
            className={[
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
              config.pillClass,
            ].join(" ")}
          >
            <span
              className={["h-1.5 w-1.5 rounded-full", config.dotClass].join(
                " "
              )}
            />
            {config.label}
            <span className="font-mono font-semibold ml-1">{count}</span>
          </span>
        )
      })}
    </div>
  )
}
