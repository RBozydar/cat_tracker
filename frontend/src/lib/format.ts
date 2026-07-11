/** Display formatting for the metric units the app uses (kcal, kg, g). */

import type { CalorieBasis } from '@/api/types'

export function formatKcal(value: number): string {
  return `${Math.round(value)} kcal`
}

/** Whole grams with unit, e.g. "120 g". Grams figures from the API are floats. */
export function formatGrams(value: number): string {
  return `${Math.round(value)} g`
}

/** A logged quantity: grams for PER_100G foods, a piece count for PER_PIECE. */
export function formatQuantity(quantity: number, basis: CalorieBasis): string {
  if (basis === 'PER_100G') return formatGrams(quantity)
  const pieces = Number(quantity.toFixed(2))
  return `${pieces} ${pieces === 1 ? 'piece' : 'pieces'}`
}

export function formatKg(value: number): string {
  // Weights are entered with at most 0.01 kg precision; trim trailing zeros.
  return `${Number(value.toFixed(2))} kg`
}

/** Parse a required positive number from an input's string value; null when invalid. */
export function parsePositiveNumber(raw: string): number | null {
  if (raw.trim() === '') return null
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}

/** Parse an optional positive number: '' → undefined, invalid/non-positive → null. */
export function parseOptionalPositiveNumber(raw: string): number | null | undefined {
  if (raw.trim() === '') return undefined
  return parsePositiveNumber(raw)
}

/* --- Household-timezone time handling -------------------------------------
 *
 * Meals store a tz-aware UTC instant (`fed_at`); the household timezone lives in
 * settings and never travels to the API. These helpers do the two conversions
 * the dashboard needs: render a UTC instant as household wall-clock, and turn an
 * edited household wall-clock date+time back into a UTC instant for the PATCH.
 * Both go through `Intl.DateTimeFormat` with the IANA zone name, so DST is
 * handled by the platform, not by us.
 */

/** Offset in ms of `timeZone` from UTC at the given instant (local − utc). */
function tzOffsetMs(timeZone: string, utcMs: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(utcMs))
  const at = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  const asIfUtc = Date.UTC(
    at('year'),
    at('month') - 1,
    at('day'),
    at('hour'),
    at('minute'),
    at('second'),
  )
  return asIfUtc - utcMs
}

/** Wall-clock `{ date: 'YYYY-MM-DD', time: 'HH:mm' }` of a UTC instant in `timeZone`. */
export function zonedWallClock(iso: string, timeZone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  const at = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return {
    date: `${at('year')}-${at('month')}-${at('day')}`,
    time: `${at('hour')}:${at('minute')}`,
  }
}

/**
 * Interpret `date` + `time` as wall-clock in `timeZone` and return the matching
 * UTC instant as an ISO string. Two offset passes settle DST-boundary edits.
 */
export function wallClockToUtcISO(date: string, time: string, timeZone: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hour === undefined ||
    minute === undefined
  ) {
    throw new Error(`Invalid date/time: ${date} ${time}`)
  }
  const wallAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0)
  let utcMs = wallAsUtcMs - tzOffsetMs(timeZone, wallAsUtcMs)
  utcMs = wallAsUtcMs - tzOffsetMs(timeZone, utcMs)
  return new Date(utcMs).toISOString()
}

/** Clock time (HH:mm) of a UTC instant in the household timezone. */
export function formatMealTime(iso: string, timeZone: string): string {
  return zonedWallClock(iso, timeZone).time
}

/**
 * Today's calendar date (`YYYY-MM-DD`) in the household timezone — the
 * household-tz counterpart of a browser-local "today". Use this wherever a
 * default or boundary depends on the household's current day (history
 * ranges, weigh-in dates); never fall back to the browser's own date, since
 * the viewer and household timezones can differ.
 */
export function todayInHouseholdTz(timeZone: string): string {
  return zonedWallClock(new Date().toISOString(), timeZone).date
}

/** Shift a `YYYY-MM-DD` calendar date by `days` (calendar arithmetic, tz-free). */
export function shiftISODate(date: string, days: number): string {
  const shifted = new Date(`${date}T00:00:00Z`)
  shifted.setUTCDate(shifted.getUTCDate() + days)
  return shifted.toISOString().slice(0, 10)
}

/**
 * Day label for a meal relative to the household-local today: `Today`,
 * `Yesterday`, or a short `9 Jul` date for anything older.
 */
export function formatMealDay(iso: string, timeZone: string): string {
  const mealDay = zonedWallClock(iso, timeZone).date
  const today = todayInHouseholdTz(timeZone)
  if (mealDay === today) return 'Today'
  if (mealDay === shiftISODate(today, -1)) return 'Yesterday'
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${mealDay}T00:00:00Z`))
}
