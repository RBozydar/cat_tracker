import { expect, test } from 'vitest'
import { formatInstant, kcalYDomain, timeTicks, weightYDomain } from './chart-utils'

test('kcalYDomain keeps the target line in view when every day is below target', () => {
  // Seed-window case that hid the target: data peaks ~160, target 200.
  const [bottom, top] = kcalYDomain([120, 150, 160, 140], 200)
  expect(bottom).toBe(0)
  expect(top).toBeGreaterThan(200) // target visible, with headroom for its label
})

test('kcalYDomain keeps both data and target in view when over target', () => {
  const [bottom, top] = kcalYDomain([260, 310, 280], 200)
  expect(bottom).toBe(0)
  expect(top).toBeGreaterThanOrEqual(310)
})

test('kcalYDomain is stable with no data (still shows the target)', () => {
  const [bottom, top] = kcalYDomain([], 180)
  expect(bottom).toBe(0)
  expect(top).toBeGreaterThan(180)
})

test('weightYDomain brackets the goal line for a cat well above goal', () => {
  const [min, max] = weightYDomain([5.4, 5.3, 5.2], 4.0)
  expect(min).toBeLessThan(4.0)
  expect(max).toBeGreaterThan(5.4)
})

test('weightYDomain brackets the goal line for a cat below goal', () => {
  const [min, max] = weightYDomain([3.2, 3.3], 3.6)
  expect(min).toBeLessThan(3.2)
  expect(max).toBeGreaterThan(3.6)
})

test('weightYDomain pads a flat series so it does not sit on the edge', () => {
  const [min, max] = weightYDomain([4.5, 4.5, 4.5], null)
  expect(min).toBeLessThan(4.5)
  expect(max).toBeGreaterThan(4.5)
})

test('weightYDomain falls back to a safe range with no weigh-ins and no goal', () => {
  expect(weightYDomain([], null)).toEqual([0, 1])
})

test('timeTicks returns evenly spaced, in-range ticks and thins to the cap', () => {
  const values = Array.from({ length: 14 }, (_, i) => i * 86_400_000)
  const ticks = timeTicks(values, 6)
  expect(ticks).toHaveLength(6)
  expect(ticks[0]).toBe(0)
  expect(ticks.at(-1)).toBe(13 * 86_400_000)
  // strictly increasing (no duplicate/overprinted positions)
  for (let i = 1; i < ticks.length; i++) {
    const prev = ticks[i - 1]
    const curr = ticks[i]
    if (prev === undefined || curr === undefined) throw new Error('tick index out of bounds')
    expect(curr).toBeGreaterThan(prev)
  }
})

test('timeTicks handles empty and single-point inputs', () => {
  expect(timeTicks([])).toEqual([])
  expect(timeTicks([1234])).toEqual([1234])
})

test('formatInstant renders the given IANA zone, not the system/browser zone', () => {
  // 23:15 UTC is 00:15 the next day in Europe/Warsaw (UTC+2 in July) but
  // still 15:15 the same day in Pacific/Honolulu (UTC-10) — a portion tooltip
  // must land on the household's day, not whatever zone the test runner uses.
  const iso = '2026-07-10T23:15:00Z'
  expect(formatInstant(iso, 'Europe/Warsaw')).toBe('Jul 11, 1:15 AM')
  expect(formatInstant(iso, 'Pacific/Honolulu')).toBe('Jul 10, 1:15 PM')
})
