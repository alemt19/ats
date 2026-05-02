"use client"

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

import {
  ChartContainer,
  type ChartConfig,
} from "react/components/ui/chart"

export type CalibrationBin = {
  bin: number
  scoreMin: number
  scoreMax: number
  total: number
  hired: number
  hireRate: number | null
}

type CalibrationPlotProps = {
  data: CalibrationBin[]
}

const chartConfig = {
  hireRate: {
    label: "Hire Rate (modelo)",
    color: "var(--primary)",
  },
  refRate: {
    label: "Calibración perfecta",
    color: "hsl(0 0% 70%)",
  },
} satisfies ChartConfig

type ChartDatum = {
  label: string
  scoreMin: number
  scoreMax: number
  total: number
  hired: number
  hireRateDisplay: number | null
  hireRate: number | null
  refRate: number
  unreliable: boolean
}

function buildChartData(bins: CalibrationBin[]): ChartDatum[] {
  return bins.map((b) => ({
    label: `${b.scoreMin.toFixed(1)}-${b.scoreMax.toFixed(1)}`,
    scoreMin: b.scoreMin,
    scoreMax: b.scoreMax,
    total: b.total,
    hired: b.hired,
    hireRateDisplay: b.hireRate !== null ? Math.round(b.hireRate * 100) : null,
    // hireRate for the main line — null bins are excluded from the connected line
    hireRate: b.hireRate !== null ? Math.round(b.hireRate * 100) : null,
    // Reference diagonal: midpoint of each bin × 100 (bin midpoint in %)
    refRate: (b.bin - 1) * 10 + 5,
    unreliable: b.hireRate === null,
  }))
}

type CustomDotProps = {
  cx?: number
  cy?: number
  payload?: ChartDatum
}

function ModelDot({ cx, cy, payload }: CustomDotProps) {
  if (cx === undefined || cy === undefined || !payload) return null

  const color = payload.unreliable ? "hsl(0 0% 70%)" : "var(--primary)"
  const stroke = payload.unreliable ? "hsl(0 0% 85%)" : "var(--primary)"

  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={color}
      stroke={stroke}
      strokeWidth={2}
    />
  )
}

type TooltipPayloadItem = {
  payload: ChartDatum
}

type CustomTooltipProps = {
  active?: boolean
  payload?: TooltipPayloadItem[]
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null

  const item = payload[0]
  if (!item) return null

  const d = item.payload
  if (d.total === 0) return null

  return (
    <div className="border-border/50 bg-background rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
      <p className="font-medium mb-1">
        Bin {d.scoreMin.toFixed(1)}–{d.scoreMax.toFixed(1)}
      </p>
      <p className="text-muted-foreground">
        {d.total} candidatos · {d.hired} contratados
      </p>
      {d.hireRateDisplay !== null ? (
        <p className="text-foreground font-mono font-semibold mt-0.5">
          Hire rate: {d.hireRateDisplay}%
        </p>
      ) : (
        <p className="text-muted-foreground mt-0.5 italic">
          Pocos datos (n &lt; 3)
        </p>
      )}
    </div>
  )
}

export default function CalibrationPlot({ data }: CalibrationPlotProps) {
  const isEmpty = data.every((b) => b.total === 0)

  if (isEmpty) {
    return (
      <p className="text-sm text-center text-foreground/50 py-8">
        Aún no hay suficientes datos para el gráfico de calibración.
      </p>
    )
  }

  const chartData = buildChartData(data)

  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 10 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={36}
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fontSize: 10 }}
        />
        <Tooltip content={<CustomTooltip />} />

        {/* Diagonal de calibración perfecta */}
        <Line
          dataKey="refRate"
          stroke="hsl(0 0% 70%)"
          strokeDasharray="4 4"
          strokeWidth={1.5}
          dot={false}
          activeDot={false}
          type="linear"
          legendType="none"
        />

        {/* Curva del modelo — conecta solo puntos con datos suficientes */}
        <Line
          dataKey="hireRate"
          stroke="var(--primary)"
          strokeWidth={2}
          dot={(props) => <ModelDot key={`dot-${props.index}`} {...props} />}
          activeDot={false}
          type="linear"
          connectNulls={false}
        />
      </ComposedChart>
    </ChartContainer>
  )
}
