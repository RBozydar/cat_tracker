/**
 * Multi-cat comparison: target-adherence (avg kcal/day ÷ target × 100) as
 * horizontal bars with a 100% reference line. Adherence carries a good/over
 * meaning, so bars wear status colour — `var(--chart-1)` at/under target,
 * `var(--destructive)` when over — always paired with a visible % label and the
 * name axis, never colour alone.
 */
import { Bar, BarChart, Cell, LabelList, ReferenceLine, XAxis, YAxis } from 'recharts'
import type { CatComparison } from '@/api/reports'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatKcal } from '@/lib/format'

const config = {
  adherence_pct: { label: 'Adherence', color: 'var(--chart-1)' },
} satisfies ChartConfig

interface ComparisonChartProps {
  cats: CatComparison[]
}

export function ComparisonChart({ cats }: ComparisonChartProps) {
  const data = cats.map((cat) => ({
    ...cat,
    over: cat.adherence_pct > 100,
  }))
  const maxAdherence = Math.max(100, ...data.map((cat) => cat.adherence_pct))

  return (
    <ChartContainer
      config={config}
      className="aspect-auto w-full"
      style={{ height: `${Math.max(data.length * 56 + 24, 120)}px` }}
    >
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 4, right: 44, left: 4, bottom: 0 }}
        barCategoryGap="28%"
      >
        <XAxis type="number" domain={[0, Math.ceil(maxAdherence / 10) * 10]} hide />
        <YAxis
          type="category"
          dataKey="cat_name"
          width={72}
          tickLine={false}
          axisLine={false}
          tickMargin={4}
        />
        <ReferenceLine
          x={100}
          stroke="var(--muted-foreground)"
          strokeDasharray="4 4"
          label={{
            value: 'Target',
            position: 'top',
            fill: 'var(--muted-foreground)',
            fontSize: 11,
          }}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => String(payload?.[0]?.payload?.cat_name)}
              formatter={(_value, _name, item) => (
                <span className="flex w-full flex-col gap-0.5 text-foreground">
                  <span>
                    {Math.round(Number(item.payload?.adherence_pct))}% of target
                    {item.payload?.over ? ' (over)' : ''}
                  </span>
                  <span className="text-muted-foreground">
                    {formatKcal(Number(item.payload?.avg_kcal_per_day))} avg ·{' '}
                    {formatKcal(Number(item.payload?.target_kcal))} target
                  </span>
                </span>
              )}
            />
          }
        />
        <Bar dataKey="adherence_pct" radius={4} isAnimationActive={false}>
          {data.map((cat) => (
            <Cell
              key={cat.cat_id}
              fill={cat.over ? 'var(--destructive)' : 'var(--color-adherence_pct)'}
            />
          ))}
          <LabelList
            dataKey="adherence_pct"
            position="right"
            className="fill-foreground"
            fontSize={12}
            formatter={(value) => `${Math.round(Number(value))}%`}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
