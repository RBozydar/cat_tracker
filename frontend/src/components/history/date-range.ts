/**
 * Local-date math for the History range picker.
 *
 * The backend interprets `start`/`end` as household-LOCAL calendar dates
 * (`YYYY-MM-DD`). All arithmetic here works on calendar fields via the
 * `Date(year, month, day)` constructor, which the engine normalises in LOCAL
 * time — so decrementing the day across a month boundary or a DST transition
 * still yields the correct calendar day. We deliberately never touch
 * `toISOString()` (UTC) to derive a local date: near midnight in a +offset
 * timezone that would report the wrong day.
 */

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
 * A preset range ending today (inclusive) and spanning `days` calendar days.
 * `presetRange(7)` → today and the six days before it.
 */
export function presetRange(days: RangePreset, today: Date = new Date()): DateRange {
  const end = startOfLocalDay(today)
  // day - (days - 1): inclusive of today, so the window is exactly `days` long.
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (days - 1))
  return { start: formatLocalISO(start), end: formatLocalISO(end) }
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
export function matchingPreset(range: DateRange, today: Date = new Date()): RangePreset | null {
  for (const { days } of PRESETS) {
    const preset = presetRange(days, today)
    if (preset.start === range.start && preset.end === range.end) return days
  }
  return null
}
