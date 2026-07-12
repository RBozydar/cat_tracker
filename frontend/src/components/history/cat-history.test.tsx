import { screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import type { RangeReport } from '@/api/reports'
import type { Cat } from '@/api/types'
import { installFetchMock } from '@/test/mock-api'
import { renderWithProviders } from '@/test/render'
import { CatHistory } from './cat-history'

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

const RANGE = { start: '2026-06-10', end: '2026-07-09' }

/** A payload with no activity in range → every section shows an empty state. */
function emptyReport(overrides: Partial<RangeReport> = {}): RangeReport {
  return {
    cat_id: 1,
    cat_name: 'Misza',
    start: RANGE.start,
    end: RANGE.end,
    timezone: 'Europe/Warsaw',
    target_kcal: 250,
    daily_kcal: [
      { date: '2026-06-10', kcal: 0 },
      { date: '2026-06-11', kcal: 0 },
    ],
    avg_kcal_per_day: 0,
    trend_pct: null,
    timing_pattern: Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0)),
    portion_history: [],
    weight_series: [],
    goal_weight_kg: null,
    ...overrides,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

test('renders "—" for a null trend and empty states per section', async () => {
  installFetchMock([{ method: 'GET', path: '/api/reports/range', body: emptyReport() }])

  renderWithProviders(<CatHistory cat={misza} range={RANGE} enabled />)

  // trend_pct === null → em dash, not 0% and not a crash.
  expect(await screen.findByText('—')).toBeInTheDocument()

  // Each section degrades to a friendly empty message.
  expect(screen.getByText(/no meals logged in this range\./i)).toBeInTheDocument()
  expect(screen.getByText(/no meals logged in this range yet/i)).toBeInTheDocument()
  expect(screen.getByText(/no wet or dry portions logged/i)).toBeInTheDocument()
  expect(screen.getByText(/no weigh-ins in this range/i)).toBeInTheDocument()

  // The weigh-in entry point is always available.
  expect(screen.getByRole('button', { name: /weigh in/i })).toBeInTheDocument()
})

test('renders a signed trend and the avg/day tile when there is data', async () => {
  installFetchMock([
    {
      method: 'GET',
      path: '/api/reports/range',
      body: emptyReport({
        avg_kcal_per_day: 231.7,
        trend_pct: 12.6,
        daily_kcal: [
          { date: '2026-06-10', kcal: 210 },
          { date: '2026-06-11', kcal: 253.4 },
        ],
      }),
    },
  ])

  renderWithProviders(<CatHistory cat={misza} range={RANGE} enabled />)

  // avg_kcal_per_day rounded for display, and a positive trend as "+13%".
  expect(await screen.findByText('232 kcal')).toBeInTheDocument()
  expect(screen.getByText('+13%')).toBeInTheDocument()
})

test('does not fetch while the tab is inactive (enabled=false)', () => {
  const calls = installFetchMock([
    { method: 'GET', path: '/api/reports/range', body: emptyReport() },
  ])

  renderWithProviders(<CatHistory cat={misza} range={RANGE} enabled={false} />)

  expect(calls.filter((call) => call.path === '/api/reports/range')).toHaveLength(0)
})
