/** Display formatting for the metric units the app uses (kcal, kg, g). */

export function formatKcal(value: number): string {
  return `${Math.round(value)} kcal`
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

/** Today's date in the browser's local calendar, as YYYY-MM-DD (weigh-in default). */
export function todayLocalISO(): string {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 10)
}
