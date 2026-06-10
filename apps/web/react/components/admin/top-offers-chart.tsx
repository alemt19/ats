"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "react/components/ui/chart"
import { useIsMobile } from "react/hooks/use-mobile"

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

const LABEL_MAX_CHARS = 18

function truncate(str: string) {
  return str.length > LABEL_MAX_CHARS ? str.slice(0, LABEL_MAX_CHARS - 1) + "…" : str
}

// Horizontal-bar tick (mobile): label sits on the Y axis, right-aligned.
function YCategoryTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fill="currentColor" fontSize={12}>
      {truncate(payload?.value ?? "")}
    </text>
  )
}

// Vertical-bar tick (desktop): label sits under the X axis, angled to avoid overlap.
function XCategoryTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={10} textAnchor="end" transform="rotate(-35)" fill="currentColor" fontSize={11}>
        {truncate(payload?.value ?? "")}
      </text>
    </g>
  )
}

export default function TopOffersChart({ data, maxCandidates }: TopOffersChartProps) {
  const isMobile = useIsMobile()
  const domainMax = Math.max(5, Math.ceil(maxCandidates * 1.2))

  if (isMobile) {
    // Mobile: horizontal bars so long offer titles stay readable on the Y axis.
    return (
      <ChartContainer config={chartConfig} className="h-64 w-full">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid horizontal={false} />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            domain={[0, domainMax]}
            allowDecimals={false}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            width={120}
            interval={0}
            tick={<YCategoryTick />}
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Bar dataKey="candidates" fill="var(--color-candidates)" radius={6} />
        </BarChart>
      </ChartContainer>
    )
  }

  // Desktop: vertical bars, X-axis labels angled to fit the wider layout.
  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 36 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          interval={0}
          height={48}
          tick={<XCategoryTick />}
        />
        <YAxis
          type="number"
          tickLine={false}
          axisLine={false}
          width={32}
          domain={[0, domainMax]}
          allowDecimals={false}
          tick={{ fontSize: 12 }}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar dataKey="candidates" fill="var(--color-candidates)" radius={6} />
      </BarChart>
    </ChartContainer>
  )
}
