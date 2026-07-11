/**
 * Local-date math for the History range picker.
 *
 * The backend interprets `start`/`end` as household-LOCAL calendar dates
 * (`YYYY-MM-DD`). Calendar-widget helpers below (`formatLocalISO`,
 * `parseLocalISO`, `startOfLocalDay`) work on the *browser's* local calendar
 * via the `Date(year, month, day)` constructor, which the engine normalises in
 * LOCAL time — so decrementing the day across a month boundary or a DST
 * transition still yields the correct calendar day. We deliberately never
 * touch `toISOString()` (UTC) to derive a local date: near midnight in a
 * +offset timezone that would report the wrong day.
 *
 * `presetRange`/`matchingPreset` take "today" as an already-resolved
 * household-local `YYYY-MM-DD` string (see `zonedWallClock` in `lib/format`)
 * rather than deriving it from the browser's clock — the viewer's timezone
 * and the household's can differ, and the API only understands household-local
 * dates.
 */
import { shiftISODate } from '@/lib/format'

export interface DateRange {
  start: string
  end: string
}

export type RangePreset = 7 | 30 | 90

export const PRESETS: { days: RangePreset; label: string }[] = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
]

export const DEFAULT_PRESET: RangePreset = 30

/** Format a Date as `YYYY-MM-DD` from its LOCAL calendar fields (never UTC). */
export function formatLocalISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Parse a `YYYY-MM-DD` string into a LOCAL midnight Date (for the calendar UI). */
export function parseLocalISO(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Midnight today in the browser's local calendar. */
export function startOfLocalDay(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/**
 * A preset range ending `today` (inclusive, household-local `YYYY-MM-DD`) and
 * spanning `days` calendar days. `presetRange(7, '2026-07-10')` → that date
 * and the six days before it.
 */
export function presetRange(days: RangePreset, today: string): DateRange {
  // days - 1: inclusive of today, so the window is exactly `days` long.
  return { start: shiftISODate(today, -(days - 1)), end: today }
}

/** Inclusive count of calendar days between two local ISO dates (for labels). */
export function rangeLengthDays(range: DateRange): number {
  const start = parseLocalISO(range.start)
  const end = parseLocalISO(range.end)
  const ms = end.getTime() - start.getTime()
  // Round to absorb the ±1h a DST transition adds/removes to a naive day span.
  return Math.round(ms / 86_400_000) + 1
}

/** Which preset (if any) a range currently matches — drives the picker's active state. */
export function matchingPreset(range: DateRange, today: string): RangePreset | null {
  for (const { days } of PRESETS) {
    const preset = presetRange(days, today)
    if (preset.start === range.start && preset.end === range.end) return days
  }
  return null
}

/**
 * Turn a react-day-picker range selection into a committed {@link DateRange},
 * or `null` while only one end has been picked — the caller should wait
 * rather than firing a half-range update (a single-day range is still
 * reachable: clicking the start day again completes it with `to` = `from`).
 */
export function rangeFromCalendarSelection(
  selected: { from?: Date; to?: Date } | undefined,
): DateRange | null {
  if (!selected?.from || !selected.to) return null
  return { start: formatLocalISO(selected.from), end: formatLocalISO(selected.to) }
}
