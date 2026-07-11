/**
 * Daily consumed kcal over the range, with the cat's target as a reference line.
 * Single series (title names it → no legend box per dataviz); the dashed target
 * line is directly labelled. Colours come from `var(--chart-1)` / semantic
 * tokens only, so both themes follow `prefers-color-scheme` automatically.
 */
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts'
import type { DailyKcalPoint } from '@/api/reports'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatKcal } from '@/lib/format'
import { formatDayFull, formatDayTick, tickInterval } from './chart-utils'

const config = {
  kcal: { label: 'Consumed', color: 'var(--chart-1)' },
} satisfies ChartConfig

interface DailyKcalChartProps {
  data: DailyKcalPoint[]
  targetKcal: number
}

export function DailyKcalChart({ data, targetKcal }: DailyKcalChartProps) {
  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={16}
          interval={tickInterval(data.length)}
          tickFormatter={formatDayTick}
        />
        <YAxis
          width={40}
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          tickFormatter={(value: number) => String(Math.round(value))}
        />
        <ReferenceLine
          y={targetKcal}
          stroke="var(--muted-foreground)"
          strokeDasharray="4 4"
          label={{
            value: `Target ${Math.round(targetKcal)}`,
            position: 'insideTopRight',
            fill: 'var(--muted-foreground)',
            fontSize: 11,
          }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => formatDayFull(String(payload?.[0]?.payload?.date))}
              formatter={(value) => (
                <span className="text-foreground">{formatKcal(Number(value))}</span>
              )}
            />
          }
        />
        <Line
          dataKey="kcal"
          type="monotone"
          stroke="var(--color-kcal)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ChartContainer>
  )
}
