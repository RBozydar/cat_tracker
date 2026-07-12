import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { todayInHouseholdTz } from './format'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

test('todayInHouseholdTz resolves the household calendar day, not UTC', () => {
  // 23:30 UTC on the 10th is already 09:30 on the 11th in Pacific/Kiritimati
  // (UTC+14) — a household there is a full calendar day ahead of UTC.
  vi.setSystemTime(new Date('2026-07-10T23:30:00Z'))

  expect(todayInHouseholdTz('UTC')).toBe('2026-07-10')
  expect(todayInHouseholdTz('Pacific/Kiritimati')).toBe('2026-07-11')
})

test('todayInHouseholdTz can land a household a day behind UTC too', () => {
  // 01:30 UTC on the 10th is still 17:30 on the 9th in Pacific/Honolulu (UTC-10).
  vi.setSystemTime(new Date('2026-07-10T01:30:00Z'))

  expect(todayInHouseholdTz('Pacific/Honolulu')).toBe('2026-07-09')
})
