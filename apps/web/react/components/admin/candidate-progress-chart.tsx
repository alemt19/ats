"use client"

import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "react/components/ui/chart"

type CandidateProgressItem = {
    technical_name: string
    label: string
    count: number
}

type CandidateProgressChartProps = {
    data: CandidateProgressItem[]
}

const STATUS_COLORS: Record<string, string> = {
    applied: "var(--primary)",
    pre_screening: "hsl(38 92% 50%)",
    hired: "hsl(142 71% 45%)",
    rejected: "hsl(0 72% 51%)",
}

const chartConfig = {
    count: { label: "Candidatos" },
    applied: { label: "Postulado", color: "var(--primary)" },
    pre_screening: { label: "Preseleccionado", color: "hsl(38 92% 50%)" },
    hired: { label: "Contratado", color: "hsl(142 71% 45%)" },
    rejected: { label: "Rechazado", color: "hsl(0 72% 51%)" },
} satisfies ChartConfig

export default function CandidateProgressChart({ data }: CandidateProgressChartProps) {
    const chartData = data.map((item) => ({
        ...item,
        fill: STATUS_COLORS[item.technical_name] ?? "var(--primary)",
    }))

    return (
        <ChartContainer config={chartConfig} className="h-48 w-full">
            <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
            >
                <XAxis type="number" hide />
                <YAxis
                    type="category"
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={110}
                    tick={{ fontSize: 12 }}
                />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                />
                <Bar dataKey="count" radius={4} label={{ position: "right", fontSize: 12, fontWeight: 600 }}>
                    {chartData.map((item) => (
                        <Cell key={item.technical_name} fill={item.fill} />
                    ))}
                </Bar>
            </BarChart>
        </ChartContainer>
    )
}
