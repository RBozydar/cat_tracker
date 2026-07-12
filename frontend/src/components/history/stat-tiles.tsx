/**
 * Two headline figures for a cat's range: average kcal/day and the trend vs the
 * immediately preceding window. `trend_pct` is null when there's no prior-period
 * data — rendered as an em dash ("—"), never 0% or a crash.
 */
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react'
import { formatKcal } from '@/lib/format'

interface StatTileProps {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
}

function StatTile({ label, value, hint }: StatTileProps) {
  return (
    <div className="rounded-lg bg-muted/40 px-4 py-3 ring-1 ring-border/40">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  )
}

interface StatTilesProps {
  avgKcalPerDay: number
  trendPct: number | null
  targetKcal: number
}

export function StatTiles({ avgKcalPerDay, trendPct, targetKcal }: StatTilesProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:max-w-md">
      <StatTile
        label="Avg / day"
        value={formatKcal(avgKcalPerDay)}
        hint={`Target ${formatKcal(targetKcal)}`}
      />
      <StatTile label="Trend" value={<TrendValue trendPct={trendPct} />} hint="vs previous period" />
    </div>
  )
}

function TrendValue({ trendPct }: { trendPct: number | null }) {
  if (trendPct == null) {
    return (
      <span className="text-muted-foreground" title="No data in the previous period">
        —
      </span>
    )
  }
  const rounded = Math.round(trendPct)
  const Icon = rounded > 0 ? ArrowUp : rounded < 0 ? ArrowDown : ArrowRight
  const sign = rounded > 0 ? '+' : ''
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="size-5 text-muted-foreground" aria-hidden />
      <span>{`${sign}${rounded}%`}</span>
    </span>
  )
}
