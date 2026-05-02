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

const LABEL_MAX_CHARS = 20

function truncate(str: string) {
  return str.length > LABEL_MAX_CHARS ? str.slice(0, LABEL_MAX_CHARS - 1) + "…" : str
}

function TruncatedTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fill="currentColor" fontSize={12}>
        {truncate(payload?.value ?? "")}
      </text>
    </g>
  )
}

export default function TopOffersChart({ data, maxCandidates }: TopOffersChartProps) {
  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tickMargin={8} tick={<TruncatedTick />} />
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
