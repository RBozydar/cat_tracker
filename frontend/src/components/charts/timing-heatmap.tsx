/**
 * Meal-timing heatmap: 7 weekday rows (Mon–Sun) × 24 hour columns, cell
 * intensity = meal count. Sequential single-hue scale per the dataviz skill —
 * one hue (`var(--chart-1)`) light→dark, with near-zero cells receding to the
 * surface via `color-mix(... transparent)`, so it reads correctly in both
 * themes. Built as a CSS grid (not Recharts): a matrix of small cells is clearer
 * and fully token-driven. Overflow-x scrolls inside its own container at 375 pt.
 */
import { formatHour } from './chart-utils'

/** Monday-first, matching the backend's `date.weekday()` (0 = Monday). */
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const LABELLED_HOURS = new Set([0, 6, 12, 18])

export interface HeatmapCell {
  weekday: number
  hour: number
  count: number
}

/**
 * Flatten a 7×24 `[weekday][hour]` matrix into cells plus the peak count.
 * Tolerant of short/ragged rows (missing entries read as 0) so a malformed
 * payload renders an empty grid instead of throwing.
 */
export function buildHeatmapCells(matrix: number[][]): { cells: HeatmapCell[]; max: number } {
  const cells: HeatmapCell[] = []
  let max = 0
  for (let weekday = 0; weekday < 7; weekday++) {
    for (let hour = 0; hour < 24; hour++) {
      const count = matrix[weekday]?.[hour] ?? 0
      if (count > max) max = count
      cells.push({ weekday, hour, count })
    }
  }
  return { cells, max }
}

/** Map a count to a fill: 0 → surface, otherwise a floored share of chart-1. */
function cellBackground(count: number, max: number): string {
  if (count <= 0 || max <= 0) return 'transparent'
  // Floor at 18% so a single meal is still visible; scale to 100% at the peak.
  const pct = 18 + 82 * (count / max)
  return `color-mix(in oklab, var(--chart-1) ${pct}%, transparent)`
}

interface TimingHeatmapProps {
  matrix: number[][]
}

export function TimingHeatmap({ matrix }: TimingHeatmapProps) {
  const { cells, max } = buildHeatmapCells(matrix)

  if (max === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No meals logged in this range yet.
      </p>
    )
  }

  return (
    <div>
      {/* The 24-column matrix scrolls horizontally on narrow cards… */}
      <div className="overflow-x-auto">
        <div className="min-w-[520px]">
          {/* Hour header. */}
          <div
            className="grid gap-0.5 pl-10 text-[10px] text-muted-foreground tabular-nums"
            style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}
          >
            {HOURS.map((hour) => (
              <div key={hour} className="text-center">
                {LABELLED_HOURS.has(hour) ? hour : ''}
              </div>
            ))}
          </div>

          {/* One row per weekday. */}
          <div className="mt-1 grid gap-0.5">
            {WEEKDAYS.map((label, weekday) => (
              <div
                key={label}
                className="grid items-center gap-0.5"
                style={{ gridTemplateColumns: '2.5rem repeat(24, minmax(0, 1fr))' }}
              >
                <div className="pr-1 text-right text-[11px] text-muted-foreground">{label}</div>
                {HOURS.map((hour) => {
                  const count = cells[weekday * 24 + hour].count
                  return (
                    <div
                      key={hour}
                      title={`${label} ${formatHour(hour)} — ${count} meal${count === 1 ? '' : 's'}`}
                      aria-label={`${label} ${formatHour(hour)}, ${count} meals`}
                      className="aspect-square rounded-[2px] ring-1 ring-inset ring-border/40"
                      style={{ backgroundColor: cellBackground(count, max) }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* …but the sequential legend stays in the card's visible flow (outside the
          scroll container) so "More (peak N)" is never clipped at the right edge. */}
      <div className="mt-3 flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
        <span>Fewer</span>
        <div className="flex gap-0.5">
          {[18, 45, 72, 100].map((pct) => (
            <div
              key={pct}
              className="size-3 rounded-[2px] ring-1 ring-inset ring-border/40"
              style={{ backgroundColor: `color-mix(in oklab, var(--chart-1) ${pct}%, transparent)` }}
            />
          ))}
        </div>
        <span>More (peak {max})</span>
      </div>
    </div>
  )
}
