"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "react/components/ui/chart"

type Props = {
  yearlyData: Record<string, number[]>
  years: number[]
  initialYear: number
}

const MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
]

const chartConfig = {
  total: {
    label: "Postulaciones",
    color: "var(--primary)",
  },
} satisfies ChartConfig

export default function StatusMonthlyChart({ yearlyData, years, initialYear }: Props) {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = React.useState<number>(initialYear)

  React.useEffect(() => {
    // If initialYear is in the future, clamp to current year
    if (initialYear > currentYear) {
      setSelectedYear(currentYear)
    }
  }, [initialYear, currentYear])

  const data = React.useMemo(() => {
    const counts = yearlyData[String(selectedYear)] ?? Array.from({ length: 12 }, () => 0)
    return MONTHS.map((label, index) => ({ name: label, total: counts[index] ?? 0 }))
  }, [selectedYear, yearlyData])

  const maxTotal = Math.max(1, ...data.map((d) => d.total))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <label className="mr-2 text-sm text-foreground/70">Año</label>
        <select
          aria-label="Seleccionar año"
          value={selectedYear}
          onChange={(e) => {
            const value = Number(e.target.value)
            if (value > currentYear) return
            setSelectedYear(value)
          }}
          className="rounded-md border border-border/60 bg-background/60 px-3 py-1 text-sm"
        >
          {years.map((y) => (
            <option key={y} value={y} disabled={y > currentYear}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <ChartContainer config={chartConfig} className="h-64 w-full">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={32}
            domain={[0, Math.max(4, Math.ceil(maxTotal * 1.2))]}
            allowDecimals={false}
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Bar dataKey="total" fill="var(--color-total)" radius={6}>
            <LabelList dataKey="total" position="top" className="fill-foreground text-xs" />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  )
}
