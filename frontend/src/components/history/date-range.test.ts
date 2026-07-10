import { expect, test } from 'vitest'
import {
  formatLocalISO,
  matchingPreset,
  parseLocalISO,
  presetRange,
  rangeLengthDays,
} from './date-range'

// A fixed "today" so assertions are deterministic regardless of the CI clock.
// 2026-03-10 sits just after US spring-forward (2026-03-08), so the 30-day
// window below crosses a DST boundary — the calendar-field arithmetic must not
// drift by a day.
const TODAY = new Date(2026, 2, 10) // month index 2 = March

test('formatLocalISO reads LOCAL calendar fields (no UTC shift)', () => {
  // A time late in the day would roll to the next date under toISOString() in a
  // positive-offset zone; local formatting must keep it on 2026-03-10.
  expect(formatLocalISO(new Date(2026, 2, 10, 23, 30))).toBe('2026-03-10')
})

test('presetRange(7) spans 7 inclusive calendar days ending today', () => {
  expect(presetRange(7, TODAY)).toEqual({ start: '2026-03-04', end: '2026-03-10' })
})

test('presetRange(30) is DST-safe across the spring-forward boundary', () => {
  // 30 inclusive days back from Mar 10 → Feb 9, crossing DST on Mar 8.
  expect(presetRange(30, TODAY)).toEqual({ start: '2026-02-09', end: '2026-03-10' })
})

test('presetRange(90) walks back across month boundaries', () => {
  expect(presetRange(90, TODAY)).toEqual({ start: '2025-12-11', end: '2026-03-10' })
})

test('rangeLengthDays counts inclusively and absorbs the DST hour', () => {
  expect(rangeLengthDays({ start: '2026-03-04', end: '2026-03-10' })).toBe(7)
  expect(rangeLengthDays({ start: '2026-02-09', end: '2026-03-10' })).toBe(30)
})

test('parseLocalISO round-trips through formatLocalISO', () => {
  expect(formatLocalISO(parseLocalISO('2026-02-09'))).toBe('2026-02-09')
})

test('matchingPreset recognises a preset range and rejects a custom one', () => {
  expect(matchingPreset(presetRange(30, TODAY), TODAY)).toBe(30)
  expect(matchingPreset(presetRange(7, TODAY), TODAY)).toBe(7)
  expect(matchingPreset({ start: '2026-01-01', end: '2026-01-15' }, TODAY)).toBeNull()
})
