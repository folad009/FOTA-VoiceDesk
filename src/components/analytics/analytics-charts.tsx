"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"

import type { AnalyticsReport } from "@/server/analytics/compute"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const countConfig = {
  calls: { label: "Calls", color: "var(--chart-1)" },
  answered: { label: "Completed", color: "var(--chart-2)" },
  value: { label: "Calls", color: "var(--chart-1)" },
} satisfies ChartConfig

const rateConfig = {
  percent: { label: "Answer rate", color: "var(--chart-1)" },
} satisfies ChartConfig

export function AnalyticsCharts({ report }: { report: AnalyticsReport }) {
  const answerRateSeries = report.answerRateOverTime.map((point) => ({
    ...point,
    percent: Math.round(point.answerRate * 1000) / 10,
  }))
  const campaignSeries = report.campaignPerformance
    .filter((point) => point.answerRate !== null)
    .map((point) => ({
      ...point,
      name: truncate(point.campaign, 22),
      percent: Math.round((point.answerRate as number) * 1000) / 10,
    }))

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard
        title="Call outcome distribution"
        description="Started attempts in this range, grouped by the recorded Twilio outcome."
      >
        {report.outcomeDistribution.length === 0 ? (
          <ChartEmpty />
        ) : (
          <ChartContainer config={countConfig} className="aspect-auto h-64">
            <BarChart
              data={report.outcomeDistribution}
              layout="vertical"
              margin={{ left: 8, right: 12 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="label" width={88} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={2} maxBarSize={22} />
            </BarChart>
          </ChartContainer>
        )}
      </ChartCard>

      <ChartCard
        title="Calls over time"
        description="Started attempts per Lagos calendar day. Completed calls are the second series."
      >
        {report.callsOverTime.every((point) => point.calls === 0) ? (
          <ChartEmpty />
        ) : (
          <ChartContainer config={countConfig} className="aspect-auto h-64">
            <LineChart data={report.callsOverTime} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} width={32} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="calls"
                stroke="var(--color-calls)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="answered"
                stroke="var(--color-answered)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </ChartCard>

      <ChartCard
        title="Answer rate over time"
        description="Completed calls divided by reached attempts (completed, no answer, busy) that day."
      >
        {answerRateSeries.length === 0 ? (
          <ChartEmpty />
        ) : (
          <ChartContainer config={rateConfig} className="aspect-auto h-64">
            <LineChart data={answerRateSeries} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis
                domain={[0, 100]}
                width={36}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => `${value}%`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => `${value}%`}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="percent"
                stroke="var(--color-percent)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </ChartCard>

      <ChartCard
        title="Campaign performance"
        description="Answer rate for each campaign that placed at least one call in this range."
      >
        {campaignSeries.length === 0 ? (
          <ChartEmpty />
        ) : (
          <ChartContainer config={rateConfig} className="aspect-auto h-64">
            <BarChart data={campaignSeries} layout="vertical" margin={{ left: 8, right: 12 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(value: number) => `${value}%`} />
              <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => `${value}%`}
                  />
                }
              />
              <Bar dataKey="percent" fill="var(--color-percent)" radius={2} maxBarSize={22} />
            </BarChart>
          </ChartContainer>
        )}
      </ChartCard>

      <ChartCard
        title="Retry performance"
        description="Started attempts grouped by attempt number. Completed counts use the same call records."
      >
        {report.retryPerformance.length === 0 ? (
          <ChartEmpty />
        ) : (
          <ChartContainer config={countConfig} className="aspect-auto h-64">
            <BarChart data={report.retryPerformance} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} width={32} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="calls" fill="var(--color-calls)" radius={2} maxBarSize={28} />
              <Bar dataKey="answered" fill="var(--color-answered)" radius={2} maxBarSize={28} />
            </BarChart>
          </ChartContainer>
        )}
      </ChartCard>

      <ChartCard
        title="Call duration distribution"
        description="Talk time buckets for completed calls only. Unanswered attempts have no duration."
      >
        {report.durationDistribution.every((point) => point.value === 0) ? (
          <ChartEmpty />
        ) : (
          <ChartContainer config={countConfig} className="aspect-auto h-64">
            <BarChart data={report.durationDistribution} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} width={32} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={2} maxBarSize={32} />
            </BarChart>
          </ChartContainer>
        )}
      </ChartCard>
    </div>
  )
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4">
      <div>
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

function ChartEmpty() {
  return (
    <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
      No started calls in this range.
    </p>
  )
}

function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value
  }
  return `${value.slice(0, max - 1)}…`
}
