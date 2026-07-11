/** Small display helpers shared by the History charts (numbers stay in lib/format). */

import { parseLocalISO } from '@/components/history/date-range'

/** `YYYY-MM-DD` → short axis tick, e.g. "Jul 3". */
export function formatDayTick(iso: string): string {
  return parseLocalISO(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** `YYYY-MM-DD` → full tooltip label, e.g. "Fri, Jul 3". */
export function formatDayFull(iso: string): string {
  return parseLocalISO(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** UTC ISO instant → local date+time label for the portion tooltip. */
export function formatInstant(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Hour 0–23 → a compact 24h clock label, e.g. "09:00". */
export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

/**
 * Thin out X-axis ticks so long ranges (90 days) don't overprint labels.
 * Returns the Recharts `interval` (points to skip between ticks).
 */
export function tickInterval(pointCount: number, maxTicks = 8): number {
  if (pointCount <= maxTicks) return 0
  return Math.ceil(pointCount / maxTicks) - 1
}

/**
 * Y-axis domain for the daily-kcal chart. Always keeps the target line in view —
 * even when every day is below target (the app's normal, below-target state) —
 * with headroom above the larger of data-max / target so the target label isn't
 * clipped at the top edge. Floored at 0; top rounded up to a readable step.
 */
export function kcalYDomain(values: number[], target: number): [number, number] {
  const dataMax = values.length ? Math.max(...values) : 0
  const top = Math.max(dataMax, target, 1)
  const padded = top * 1.15
  const step = padded <= 50 ? 10 : padded <= 200 ? 25 : padded <= 500 ? 50 : 100
  return [0, Math.ceil(padded / step) * step]
}

/**
 * Y-axis domain for the weight chart. Always includes the goal line (when set),
 * padded so a flat series and the goal both sit off the edges — a cat well above
 * or below its goal still shows the goal line. Falls back to a safe range when
 * there are no weigh-ins (the chart is guarded by an empty state upstream).
 */
export function weightYDomain(weights: number[], goal: number | null): [number, number] {
  const values = goal != null ? [...weights, goal] : weights
  if (values.length === 0) return [0, 1]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = Math.max((max - min) * 0.15, 0.2)
  return [Number((min - pad).toFixed(2)), Number((max + pad).toFixed(2))]
}

/**
 * Up to `maxTicks` evenly spaced tick positions across a numeric/time range.
 * A `scale="time"` axis isn't thinned by Recharts' `interval`, so we hand it an
 * explicit, non-colliding tick set. Returns [] for no data, [v] for one value.
 */
export function timeTicks(values: number[], maxTicks = 6): number[] {
  if (values.length === 0) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min === max) return [min]
  const n = Math.max(2, maxTicks)
  const step = (max - min) / (n - 1)
  return Array.from({ length: n }, (_, i) => Math.round(min + step * i))
}
