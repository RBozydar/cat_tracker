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
