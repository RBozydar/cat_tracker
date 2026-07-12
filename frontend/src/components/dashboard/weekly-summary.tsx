/**
 * A compact weekly strip (GET /reports/comparison over the last 7 household-local
 * days): average kcal/day vs target and target-adherence percent per cat. The
 * date range is derived from the settings timezone, so the query waits for
 * settings to load before running.
 */
import { useComparison, useSettings } from '@/api/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatKcal, shiftISODate, zonedWallClock } from '@/lib/format'

export function WeeklySummary() {
  const settings = useSettings()
  const timezone = settings.data?.timezone ?? 'UTC'
  const end = zonedWallClock(new Date().toISOString(), timezone).date
  const start = shiftISODate(end, -6)
  const comparison = useComparison({ start, end }, settings.isSuccess)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Last 7 days</CardTitle>
      </CardHeader>
      <CardContent>
        {settings.isError ? (
          <p className="text-sm text-destructive">{settings.error.message}</p>
        ) : comparison.isPending ? (
          <p className="text-sm text-muted-foreground">Loading weekly summary…</p>
        ) : comparison.isError ? (
          <p className="text-sm text-destructive">{comparison.error.message}</p>
        ) : comparison.data.cats.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cats to compare yet. Add cats in Settings.</p>
        ) : (
          <ul className="grid gap-2.5">
            {comparison.data.cats.map((cat) => (
              <li key={cat.cat_id} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">{cat.cat_name}</span>
                <span className="flex items-center gap-3 tabular-nums">
                  <span className="text-muted-foreground">
                    {formatKcal(cat.avg_kcal_per_day)}/day of {formatKcal(cat.target_kcal)}
                  </span>
                  <span
                    className={cn(
                      'w-12 text-right font-medium',
                      cat.adherence_pct > 100 ? 'text-destructive' : 'text-foreground',
                    )}
                  >
                    {Math.round(cat.adherence_pct)}%
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
