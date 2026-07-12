import { screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import type { Cat } from '@/api/types'
import { renderWithProviders } from '@/test/render'
import HistoryPage from './history'

const misza: Cat = {
  id: 1,
  name: 'Misza',
  target_kcal: 250,
  goal_weight_kg: null,
  default_wet_food_id: null,
  default_dry_food_id: null,
  current_weight_kg: 5.2,
  meal_count: 0,
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

test('report/comparison fetches wait for settings instead of firing against a UTC guess', async () => {
  // 23:30 UTC on the 10th is already the 11th in the household's timezone —
  // the exact window where a frozen UTC-based default range is off by a day.
  // `shouldAdvanceTime` keeps real timers (testing-library's `waitFor` polling)
  // running while `Date` stays anchored to the faked instant.
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date('2026-07-10T23:30:00Z'))

  let resolveSettings!: (response: Response) => void
  const settingsPromise = new Promise<Response>((resolve) => {
    resolveSettings = resolve
  })

  const calls: { method: string; path: string; search: string }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost')
      const method = init?.method ?? 'GET'
      calls.push({ method, path: url.pathname, search: url.search })

      if (url.pathname === '/api/settings') return settingsPromise
      if (url.pathname === '/api/cats') return jsonResponse([misza])
      if (url.pathname === '/api/reports/range') {
        return jsonResponse({
          cat_id: 1,
          cat_name: 'Misza',
          start: '2026-06-12',
          end: '2026-07-11',
          timezone: 'Pacific/Kiritimati',
          target_kcal: 250,
          daily_kcal: [],
          avg_kcal_per_day: 0,
          trend_pct: null,
          timing_pattern: Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0)),
          portion_history: [],
          weight_series: [],
          goal_weight_kg: null,
        })
      }
      if (url.pathname === '/api/reports/comparison') {
        return jsonResponse({ start: '2026-06-12', end: '2026-07-11', timezone: 'Pacific/Kiritimati', cats: [] })
      }
      return jsonResponse({ detail: `unmocked ${url.pathname}` }, 404)
    }),
  )

  renderWithProviders(<HistoryPage />)

  // Cats load fine independent of settings — the tab is visible.
  await screen.findByRole('tab', { name: 'Misza' })

  // Settings is still pending: the range/comparison fetches must not have
  // fired yet (they would otherwise run against the UTC-fallback default).
  expect(calls.some((c) => c.path === '/api/reports/range')).toBe(false)
  expect(calls.some((c) => c.path === '/api/reports/comparison')).toBe(false)

  // Settings resolves with a household timezone a day ahead of UTC.
  resolveSettings(
    jsonResponse({
      timezone: 'Pacific/Kiritimati',
      portion_suggestions_enabled: false,
      meals_per_day: 2,
    }),
  )

  const rangeCall = await waitFor(() => {
    const call = calls.find((c) => c.path === '/api/reports/range')
    expect(call).toBeDefined()
    return call!
  })
  // The default 30-day preset ends on the household's "today" (the 11th),
  // not the UTC date (the 10th) baked in before settings resolved.
  expect(rangeCall.search).toContain('end=2026-07-11')

  const comparisonCall = await waitFor(() => {
    const call = calls.find((c) => c.path === '/api/reports/comparison')
    expect(call).toBeDefined()
    return call!
  })
  expect(comparisonCall.search).toContain('end=2026-07-11')
})
