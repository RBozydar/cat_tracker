/**
 * Per-cat calorie standing for the household-local today (GET /reports/today).
 *
 * Compact by design: all three cats sit above the fold at 375×812 alongside the
 * quick-log row. `remaining` is target − consumed and goes negative when the cat
 * is over target — that gets a visually distinct destructive treatment. Grams
 * equivalents and portion suggestions are absent for per-piece/missing defaults
 * and are simply omitted when the API sends none.
 */
import type { CatTodayReport, DefaultFoodGrams } from '@/api/types'
import { useTodayReport } from '@/api/hooks'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatGrams, formatKcal } from '@/lib/format'

/** "120 g wet · 25 g dry" from the default-food grams entries. */
function gramsSummary(entries: DefaultFoodGrams[]): string {
  return entries
    .map((entry) => `${formatGrams(entry.grams)} ${entry.food_type === 'WET' ? 'wet' : 'dry'}`)
    .join(' · ')
}

function CatTodayCard({ cat }: { cat: CatTodayReport }) {
  const pct =
    cat.target_kcal > 0 ? Math.min(cat.consumed_kcal / cat.target_kcal, 1) * 100 : 0

  return (
    <Card size="sm">
      <CardContent className="grid gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-medium">{cat.cat_name}</span>
          <span
            className={cn(
              'text-sm font-semibold tabular-nums',
              cat.over ? 'text-destructive' : 'text-foreground',
            )}
          >
            {cat.over
              ? `Over by ${formatKcal(-cat.remaining_kcal)}`
              : `${formatKcal(cat.remaining_kcal)} left`}
          </span>
        </div>

        <div
          className="h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={cat.target_kcal}
          aria-valuenow={cat.consumed_kcal}
        >
          <div
            className={cn('h-full rounded-full', cat.over ? 'bg-destructive' : 'bg-primary')}
            style={{ width: `${cat.over ? 100 : pct}%` }}
          />
        </div>

        <p className="text-xs text-muted-foreground tabular-nums">
          {formatKcal(cat.consumed_kcal)} of {formatKcal(cat.target_kcal)}
        </p>

        {!cat.over && cat.grams_equivalents.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            ≈ {gramsSummary(cat.grams_equivalents)} left
          </p>
        ) : null}

        {cat.portion_suggestions.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Portion: {gramsSummary(cat.portion_suggestions)} per meal
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function TodayStatus() {
  const today = useTodayReport()

  if (today.isPending) {
    return <p className="text-sm text-muted-foreground">Loading today&apos;s status…</p>
  }
  if (today.isError) {
    return <p className="text-sm text-destructive">{today.error.message}</p>
  }
  if (today.data.cats.length === 0) {
    return null
  }

  return (
    <div className="grid gap-2">
      {today.data.cats.map((cat) => (
        <CatTodayCard key={cat.cat_id} cat={cat} />
      ))}
    </div>
  )
}
