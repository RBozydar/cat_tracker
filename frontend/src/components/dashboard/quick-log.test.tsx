import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import type {
  Cat,
  ComparisonReport,
  Food,
  MealSuggestion,
  Settings,
  TodayReport,
} from '@/api/types'
import type { MockRoute } from '@/test/mock-api'
import { installFetchMock } from '@/test/mock-api'
import { renderWithProviders } from '@/test/render'
import DashboardPage from '@/pages/dashboard'
import { QuickLogCard } from './quick-log-card'

const cats: Cat[] = [
  {
    id: 1,
    name: 'Misza',
    target_kcal: 300,
    goal_weight_kg: null,
    default_wet_food_id: 10,
    default_dry_food_id: 11,
    current_weight_kg: 6,
    meal_count: 5,
  },
  {
    id: 2,
    name: 'Fela',
    target_kcal: 250,
    goal_weight_kg: 4,
    default_wet_food_id: 10,
    default_dry_food_id: 11,
    current_weight_kg: 5,
    meal_count: 2,
  },
]

const foods: Food[] = [
  { id: 10, name: 'Chicken Pâté', type: 'WET', calorie_basis: 'PER_100G', kcal_per_basis: 80, archived_at: null },
  { id: 11, name: 'Kibble', type: 'DRY', calorie_basis: 'PER_100G', kcal_per_basis: 350, archived_at: null },
  { id: 12, name: 'Dental Stick', type: 'TREAT', calorie_basis: 'PER_PIECE', kcal_per_basis: 5, archived_at: null },
]

const suggestions: MealSuggestion[] = [
  { food_id: 10, food_name: 'Chicken Pâté', food_type: 'WET', quantity: 30, basis: 'PER_100G', kcal: 24 },
]

const settings: Settings = {
  timezone: 'Europe/Warsaw',
  portion_suggestions_enabled: false,
  meals_per_day: 2,
}

const todayReport: TodayReport = {
  date: '2026-07-10',
  timezone: 'Europe/Warsaw',
  cats: [
    {
      cat_id: 1,
      cat_name: 'Misza',
      target_kcal: 300,
      consumed_kcal: 100,
      remaining_kcal: 200,
      over: false,
      grams_equivalents: [{ food_id: 10, food_name: 'Chicken Pâté', food_type: 'WET', grams: 250 }],
      portion_suggestions: [],
    },
  ],
}

const comparison: ComparisonReport = {
  start: '2026-07-04',
  end: '2026-07-10',
  timezone: 'Europe/Warsaw',
  cats: [{ cat_id: 1, cat_name: 'Misza', avg_kcal_per_day: 210, target_kcal: 300, adherence_pct: 70 }],
}

function getRoutes(extra: MockRoute[] = []): MockRoute[] {
  return [
    { method: 'GET', path: '/api/cats', body: cats },
    { method: 'GET', path: '/api/foods', body: foods },
    { method: 'GET', path: '/api/settings', body: settings },
    { method: 'GET', path: '/api/meals', body: [] },
    { method: 'GET', path: '/api/meals/suggestions', body: suggestions },
    { method: 'GET', path: '/api/reports/today', body: todayReport },
    { method: 'GET', path: '/api/reports/comparison', body: comparison },
    ...extra,
  ]
}

afterEach(() => {
  vi.unstubAllGlobals()
})

test('re-log chip posts the exact meal and fires invalidations', async () => {
  const created = { id: 99, cat_id: 1, food_id: 10, food_name: 'Chicken Pâté', quantity: 30, basis: 'PER_100G', kcal_per_basis: 80, kcal: 24, fed_at: '2026-07-10T10:00:00Z' }
  const calls = installFetchMock(getRoutes([{ method: 'POST', path: '/api/meals', status: 201, body: created }]))

  renderWithProviders(<DashboardPage />)

  // Two taps + confirm: select the cat, tap its re-log chip, confirm.
  await userEvent.click(await screen.findByRole('button', { name: 'Misza' }))
  await userEvent.click(await screen.findByRole('button', { name: /Chicken Pâté · 24 kcal/ }))
  await userEvent.click(await screen.findByRole('button', { name: /log meal/i }))

  const post = await waitFor(() => {
    const call = calls.find((c) => c.method === 'POST' && c.path === '/api/meals')
    expect(call).toBeDefined()
    return call!
  })
  // Payload is exactly cat/food/quantity; the server stamps fed_at.
  expect(post.body).toEqual({ cat_id: 1, food_id: 10, quantity: 30 })

  expect(await screen.findByText('Logged 30 g Chicken Pâté for Misza')).toBeInTheDocument()

  // Invalidation fired: the recent-meals list refetched after the POST.
  await waitFor(() => {
    const mealsFetches = calls.filter((c) => c.method === 'GET' && c.path === '/api/meals')
    expect(mealsFetches.length).toBeGreaterThanOrEqual(2)
  })
})

test('manual form logs a treat by piece count', async () => {
  const created = { id: 100, cat_id: 1, food_id: 12, food_name: 'Dental Stick', quantity: 2, basis: 'PER_PIECE', kcal_per_basis: 5, kcal: 10, fed_at: '2026-07-10T10:00:00Z' }
  // No suggestions for this cat, so the chip row hides and only the manual form shows.
  const calls = installFetchMock([
    { method: 'GET', path: '/api/cats', body: cats },
    { method: 'GET', path: '/api/foods', body: foods },
    { method: 'GET', path: '/api/meals/suggestions', body: [] },
    { method: 'POST', path: '/api/meals', status: 201, body: created },
  ])

  renderWithProviders(<QuickLogCard />)

  await userEvent.click(await screen.findByRole('button', { name: 'Misza' }))

  // Pick the treat from the food select, then log 2 pieces.
  await userEvent.click(await screen.findByRole('combobox'))
  await userEvent.click(await screen.findByRole('option', { name: 'Dental Stick' }))
  await userEvent.type(screen.getByLabelText('Pieces'), '2')
  await userEvent.click(screen.getByRole('button', { name: /^log$/i }))

  const post = await waitFor(() => {
    const call = calls.find((c) => c.method === 'POST' && c.path === '/api/meals')
    expect(call).toBeDefined()
    return call!
  })
  expect(post.body).toEqual({ cat_id: 1, food_id: 12, quantity: 2 })
  expect(await screen.findByText('Logged 2 pieces Dental Stick for Misza')).toBeInTheDocument()
})

test('surfaces a failed food-library request instead of claiming the library is empty', async () => {
  installFetchMock([
    { method: 'GET', path: '/api/cats', body: cats },
    { method: 'GET', path: '/api/foods', status: 400, body: { detail: 'Foods unavailable' } },
    { method: 'GET', path: '/api/meals/suggestions', body: [] },
  ])

  renderWithProviders(<QuickLogCard />)

  await userEvent.click(await screen.findByRole('button', { name: 'Misza' }))

  expect(await screen.findByText('Foods unavailable')).toBeInTheDocument()
  // Not the empty-library setup message — logging is blocked by a request
  // failure, not because the library is genuinely empty.
  expect(screen.queryByText(/no foods yet/i)).not.toBeInTheDocument()
})
