/**
 * Body-weight trend over the range, with the goal weight as a reference line
 * when the cat has one. Single series (`var(--chart-1)`); the dashed goal line
 * is directly labelled. Weights are sparse (a few weigh-ins), so points are
 * shown.
 */
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts'
import type { WeightPoint } from '@/api/reports'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatKg } from '@/lib/format'
import { formatDayFull, formatDayTick, tickInterval } from './chart-utils'

const config = {
  weight_kg: { label: 'Weight', color: 'var(--chart-1)' },
} satisfies ChartConfig

interface WeightTrendChartProps {
  data: WeightPoint[]
  goalWeightKg: number | null
}

export function WeightTrendChart({ data, goalWeightKg }: WeightTrendChartProps) {
  // Pad the Y domain so a flat series and the goal line both sit off the edges.
  const weights = data.map((point) => point.weight_kg)
  const candidates = goalWeightKg != null ? [...weights, goalWeightKg] : weights
  const min = Math.min(...candidates)
  const max = Math.max(...candidates)
  const pad = Math.max((max - min) * 0.15, 0.2)

  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="measured_on"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={16}
          interval={tickInterval(data.length)}
          tickFormatter={formatDayTick}
        />
        <YAxis
          width={44}
          domain={[Number((min - pad).toFixed(2)), Number((max + pad).toFixed(2))]}
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          tickFormatter={(value: number) => `${Number(value.toFixed(1))}`}
        />
        {goalWeightKg != null ? (
          <ReferenceLine
            y={goalWeightKg}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            label={{
              value: `Goal ${formatKg(goalWeightKg)}`,
              position: 'insideBottomRight',
              fill: 'var(--muted-foreground)',
              fontSize: 11,
            }}
          />
        ) : null}
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) =>
                formatDayFull(String(payload?.[0]?.payload?.measured_on))
              }
              formatter={(value) => (
                <span className="text-foreground">{formatKg(Number(value))}</span>
              )}
            />
          }
        />
        <Line
          dataKey="weight_kg"
          type="monotone"
          stroke="var(--color-weight_kg)"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ChartContainer>
  )
}
