/**
 * One cat's History view, built from a SINGLE `reports/range` payload (the
 * endpoint bundles everything — we never fan out extra requests). Only the
 * active tab mounts this, so exactly one range call is in flight per cat view.
 * Handles loading skeletons, an error state, and per-section empty states.
 */
import { Scale } from 'lucide-react'
import { useState } from 'react'
import { useRangeReport } from '@/api/reports'
import type { Cat } from '@/api/types'
import { DailyKcalChart } from '@/components/charts/daily-kcal-chart'
import { PortionHistoryChart } from '@/components/charts/portion-history-chart'
import { TimingHeatmap } from '@/components/charts/timing-heatmap'
import { WeightTrendChart } from '@/components/charts/weight-trend-chart'
import { WeighInDialog } from '@/components/settings/weigh-in-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { DateRange } from './date-range'
import { ChartEmpty, ChartSkeleton, SectionCard } from './section-card'
import { StatTiles } from './stat-tiles'

interface CatHistoryProps {
  cat: Cat
  range: DateRange
  enabled: boolean
}

export function CatHistory({ cat, range, enabled }: CatHistoryProps) {
  const report = useRangeReport({ catId: cat.id, start: range.start, end: range.end }, enabled)
  const [weighOpen, setWeighOpen] = useState(false)

  if (report.isPending) {
    return <CatHistorySkeleton />
  }

  if (report.isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-destructive">
          {report.error.message}
        </CardContent>
      </Card>
    )
  }

  const data = report.data
  const hasMeals = data.daily_kcal.some((point) => point.kcal > 0)

  return (
    <div className="grid gap-6">
      <StatTiles
        avgKcalPerDay={data.avg_kcal_per_day}
        trendPct={data.trend_pct}
        targetKcal={data.target_kcal}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Daily calories"
          description="Consumed per day against the target line."
        >
          {hasMeals ? (
            <DailyKcalChart data={data.daily_kcal} targetKcal={data.target_kcal} />
          ) : (
            <ChartEmpty>No meals logged in this range.</ChartEmpty>
          )}
        </SectionCard>

        <SectionCard
          title="Meal timing"
          description="When meals are logged, by weekday and hour (household-local)."
        >
          <TimingHeatmap matrix={data.timing_pattern} />
        </SectionCard>

        <SectionCard
          title="Portion history"
          description="Grams per wet and dry meal over time. Treats are excluded."
        >
          {data.portion_history.length > 0 ? (
            <PortionHistoryChart history={data.portion_history} timezone={data.timezone} />
          ) : (
            <ChartEmpty>No wet or dry portions logged in this range.</ChartEmpty>
          )}
        </SectionCard>

        <SectionCard
          title="Weight trend"
          description={
            data.goal_weight_kg != null
              ? 'Weigh-ins over time against the goal line.'
              : 'Weigh-ins over time.'
          }
          action={
            <Button variant="outline" size="sm" onClick={() => setWeighOpen(true)}>
              <Scale data-icon="inline-start" aria-hidden />
              Weigh in
            </Button>
          }
        >
          {data.weight_series.length > 0 ? (
            <WeightTrendChart data={data.weight_series} goalWeightKg={data.goal_weight_kg} />
          ) : (
            <ChartEmpty>No weigh-ins in this range. Use “Weigh in” to add one.</ChartEmpty>
          )}
        </SectionCard>
      </div>

      <WeighInDialog
        open={weighOpen}
        onOpenChange={setWeighOpen}
        cat={cat}
        timezone={data.timezone}
      />
    </div>
  )
}

function CatHistorySkeleton() {
  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <ChartSkeleton height="h-20" />
        <ChartSkeleton height="h-20" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1, 2, 3].map((index) => (
          <Card key={index}>
            <CardContent className="py-6">
              <ChartSkeleton />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
