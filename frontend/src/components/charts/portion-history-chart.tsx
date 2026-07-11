/**
 * Portion-size history: grams per meal over time, wet vs dry as two categorical
 * series (`var(--chart-1)` / `var(--chart-3)` — a blue/orange pair validated as
 * CVD-safe with maximal separation in both themes). Scatter, since meals are
 * discrete events; a legend plus per-point tooltip carry identity (never colour
 * alone). Per-piece treats are excluded upstream by design.
 */
import { CartesianGrid, Scatter, ScatterChart, XAxis, YAxis, ZAxis } from 'recharts'
import type { PortionHistoryPoint } from '@/api/reports'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatInstant, timeTicks } from './chart-utils'

const config = {
  wet: { label: 'Wet', color: 'var(--chart-1)' },
  dry: { label: 'Dry', color: 'var(--chart-3)' },
} satisfies ChartConfig

interface Point {
  t: number
  grams: number
  fed_at: string
}

function toPoints(history: PortionHistoryPoint[], type: 'WET' | 'DRY'): Point[] {
  return history
    .filter((point) => point.food_type === type)
    .map((point) => ({ t: Date.parse(point.fed_at), grams: point.grams, fed_at: point.fed_at }))
}

interface PortionHistoryChartProps {
  history: PortionHistoryPoint[]
}

export function PortionHistoryChart({ history }: PortionHistoryChartProps) {
  const wet = toPoints(history, 'WET')
  const dry = toPoints(history, 'DRY')
  const ticks = timeTicks(history.map((point) => Date.parse(point.fed_at)))

  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <ScatterChart margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          type="number"
          dataKey="t"
          domain={['dataMin', 'dataMax']}
          scale="time"
          ticks={ticks}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(value: number) =>
            new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          }
        />
        <YAxis
          type="number"
          dataKey="grams"
          width={40}
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          tickFormatter={(value: number) => `${Math.round(value)}g`}
        />
        <ZAxis range={[60, 60]} />
        <ChartTooltip
          cursor={{ strokeDasharray: '4 4' }}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value, _name, item) => (
                <span className="flex w-full items-center justify-between gap-3 text-foreground">
                  <span className="text-muted-foreground">
                    {formatInstant(String(item.payload?.fed_at))}
                  </span>
                  <span className="font-mono tabular-nums">{Math.round(Number(value))} g</span>
                </span>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Scatter
          name="wet"
          data={wet}
          fill="var(--color-wet)"
          stroke="var(--card)"
          strokeWidth={1.5}
          isAnimationActive={false}
        />
        <Scatter
          name="dry"
          data={dry}
          fill="var(--color-dry)"
          stroke="var(--card)"
          strokeWidth={1.5}
          isAnimationActive={false}
        />
      </ScatterChart>
    </ChartContainer>
  )
}
