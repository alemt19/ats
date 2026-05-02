type ScoreChipProps = {
  value: number
  size?: "sm" | "md"
}

export default function ScoreChip({ value, size = "md" }: ScoreChipProps) {
  const isHigh = value >= 0.8
  const display = value.toFixed(2)

  return (
    <span
      className={[
        "inline-flex items-center justify-center rounded-md border font-mono tabular-nums font-semibold transition-colors",
        size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm",
        isHigh
          ? "border-accent/60 bg-accent/15 text-foreground"
          : "border-primary/30 bg-card text-foreground/80",
      ].join(" ")}
    >
      {display}
    </span>
  )
}
