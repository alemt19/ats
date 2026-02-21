"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "react/components/ui/chart"

type TopOffer = {
  name: string
  candidates: number
}

type TopOffersChartProps = {
  data: TopOffer[]
  maxCandidates: number
}

const chartConfig = {
  candidates: {
    label: "Candidatos",
    color: "var(--primary)",
  },
} satisfies ChartConfig

export default function TopOffersChart({ data, maxCandidates }: TopOffersChartProps) {
  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={32}
          domain={[0, Math.max(5, Math.ceil(maxCandidates * 1.2))]}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar dataKey="candidates" fill="var(--color-candidates)" radius={6} />
      </BarChart>
    </ChartContainer>
  )
}
