"use client"

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "react/components/ui/chart"

type StatusBarItem = {
  name: string
  total: number
}

type StatusBarsChartProps = {
  data: StatusBarItem[]
}

const chartConfig = {
  total: {
    label: "Postulaciones",
    color: "var(--primary)",
  },
} satisfies ChartConfig

export default function StatusBarsChart({ data }: StatusBarsChartProps) {
  const maxTotal = Math.max(1, ...data.map((item) => item.total))

  return (
    <ChartContainer config={chartConfig} className="h-72 w-full">
      <BarChart data={data} margin={{ top: 16, right: 12, left: 12, bottom: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} interval={0} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={32}
          domain={[0, Math.max(4, Math.ceil(maxTotal * 1.2))]}
          allowDecimals={false}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar dataKey="total" fill="var(--color-total)" radius={8}>
          <LabelList
            dataKey="total"
            position="top"
            className="fill-foreground text-xs"
            formatter={(value: number) => String(value)}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
