import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { createQueryClient } from '@/api/query-client'
import type { Cat, Food, Meal } from '@/api/types'
import { Toaster } from '@/components/ui/sonner'
import { installFetchMock } from '@/test/mock-api'
import { renderWithProviders } from '@/test/render'
import { MealDetailSheet } from './meal-detail-sheet'

const cats: Cat[] = [
  { id: 1, name: 'Misza', target_kcal: 300, goal_weight_kg: null, default_wet_food_id: 10, default_dry_food_id: 11, current_weight_kg: 6, meal_count: 5 },
]

const foods: Food[] = [
  { id: 10, name: 'Chicken Pâté', type: 'WET', calorie_basis: 'PER_100G', kcal_per_basis: 80, archived_at: null },
  { id: 11, name: 'Kibble', type: 'DRY', calorie_basis: 'PER_100G', kcal_per_basis: 350, archived_at: null },
]

// 12:30 UTC on 2026-07-09 is 14:30 wall-clock in Europe/Warsaw (UTC+2, DST).
const meal: Meal = {
  id: 55,
  cat_id: 1,
  food_id: 10,
  food_name: 'Chicken Pâté',
  quantity: 30,
  basis: 'PER_100G',
  kcal_per_basis: 80,
  kcal: 24,
  fed_at: '2026-07-09T12:30:00Z',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

test('edits interpret wall-clock in the household timezone and PATCH a UTC instant', async () => {
  const calls = installFetchMock([
    { method: 'GET', path: '/api/cats', body: cats },
    { method: 'GET', path: '/api/foods', body: foods },
    { method: 'PATCH', path: '/api/meals/55', body: { ...meal, fed_at: '2026-07-09T13:30:00Z' } },
  ])
  const onClose = vi.fn()

  renderWithProviders(<MealDetailSheet meal={meal} timezone="Europe/Warsaw" onClose={onClose} />)

  // The instant renders as household wall-clock, not UTC.
  const time = (await screen.findByLabelText('Time')) as HTMLInputElement
  expect(time.value).toBe('14:30')

  // Move it one hour later (still 2026-07-09 local) and save.
  fireEvent.change(time, { target: { value: '15:30' } })
  await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

  const patch = await waitFor(() => {
    const call = calls.find((c) => c.method === 'PATCH' && c.path === '/api/meals/55')
    expect(call).toBeDefined()
    return call!
  })
  // 15:30 Europe/Warsaw (UTC+2) === 13:30 UTC.
  expect(patch.body).toMatchObject({
    cat_id: 1,
    food_id: 10,
    quantity: 30,
    fed_at: '2026-07-09T13:30:00.000Z',
  })
  await waitFor(() => expect(onClose).toHaveBeenCalled())
})

test('delete asks for confirmation, then removes the meal', async () => {
  const calls = installFetchMock([
    { method: 'GET', path: '/api/cats', body: cats },
    { method: 'GET', path: '/api/foods', body: foods },
    { method: 'DELETE', path: '/api/meals/55', status: 204 },
  ])
  const onClose = vi.fn()

  renderWithProviders(<MealDetailSheet meal={meal} timezone="Europe/Warsaw" onClose={onClose} />)

  await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))

  // A confirm dialog gates the destructive action.
  const confirm = await screen.findByRole('alertdialog')
  expect(within(confirm).getByText('Delete this meal?')).toBeInTheDocument()
  await userEvent.click(within(confirm).getByRole('button', { name: 'Delete' }))

  await waitFor(() => {
    const del = calls.find((c) => c.method === 'DELETE' && c.path === '/api/meals/55')
    expect(del).toBeDefined()
  })
  await waitFor(() => expect(onClose).toHaveBeenCalled())
})

test('falls back to the meal snapshot basis when the live food is archived (excluded from useFoods(false))', async () => {
  // The foods list omits food 10 entirely, simulating `useFoods(false)`
  // excluding an archived food that this meal still references.
  installFetchMock([
    { method: 'GET', path: '/api/cats', body: cats },
    { method: 'GET', path: '/api/foods', body: [] },
  ])
  const perPieceMeal: Meal = { ...meal, basis: 'PER_PIECE' }

  renderWithProviders(
    <MealDetailSheet meal={perPieceMeal} timezone="Europe/Warsaw" onClose={vi.fn()} />,
  )

  // Labeled and keyboarded for pieces (the meal's own snapshot basis), not
  // grams — even though the live food list can't resolve `selectedFood`.
  expect(await screen.findByLabelText('Pieces')).toBeInTheDocument()
  expect(screen.queryByLabelText('Grams')).not.toBeInTheDocument()
})

test('reinitializes date/time once the real household timezone arrives', async () => {
  // 12:30 UTC on 2026-07-09 is 14:30 wall-clock in Europe/Warsaw (see `meal`).
  installFetchMock([
    { method: 'GET', path: '/api/cats', body: cats },
    { method: 'GET', path: '/api/foods', body: foods },
  ])
  const queryClient = createQueryClient()
  const renderWithTimezone = (timezone: string) => (
    <QueryClientProvider client={queryClient}>
      <MealDetailSheet meal={meal} timezone={timezone} onClose={vi.fn()} />
      <Toaster />
    </QueryClientProvider>
  )

  // Opened while settings is still pending: RecentMeals falls back to UTC.
  const { rerender } = render(renderWithTimezone('UTC'))
  const time = (await screen.findByLabelText('Time')) as HTMLInputElement
  expect(time.value).toBe('12:30')

  // Settings resolves with the real household timezone; the same open sheet
  // must recompute, not keep the UTC-seeded value.
  rerender(renderWithTimezone('Europe/Warsaw'))
  await waitFor(() => expect(time.value).toBe('14:30'))
})

test('an in-progress date/time edit survives a timezone refetch mid-edit', async () => {
  installFetchMock([
    { method: 'GET', path: '/api/cats', body: cats },
    { method: 'GET', path: '/api/foods', body: foods },
  ])
  const queryClient = createQueryClient()
  const renderWithTimezone = (timezone: string) => (
    <QueryClientProvider client={queryClient}>
      <MealDetailSheet meal={meal} timezone={timezone} onClose={vi.fn()} />
      <Toaster />
    </QueryClientProvider>
  )

  const { rerender } = render(renderWithTimezone('Europe/Warsaw'))
  const time = (await screen.findByLabelText('Time')) as HTMLInputElement
  expect(time.value).toBe('14:30')

  // The user starts editing the time before a background refetch (e.g. the
  // partner changing the household timezone) resolves.
  fireEvent.change(time, { target: { value: '16:00' } })
  expect(time.value).toBe('16:00')

  // `timezone` is live query data — a refetch bringing in a new value must
  // not clobber the in-progress edit with a recompute from the old fed_at.
  rerender(renderWithTimezone('America/New_York'))
  expect(time.value).toBe('16:00')
})
