import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import type { Food, TargetSuggestion } from '@/api/types'
import { installFetchMock } from '@/test/mock-api'
import { renderWithProviders } from '@/test/render'
import { CatFormDialog } from './cat-form-dialog'

const wet: Food = {
  id: 1,
  name: 'Tuna Feast',
  type: 'WET',
  calorie_basis: 'PER_100G',
  kcal_per_basis: 85,
  archived_at: null,
}
const dry: Food = {
  id: 2,
  name: 'Kibble',
  type: 'DRY',
  calorie_basis: 'PER_100G',
  kcal_per_basis: 350,
  archived_at: null,
}

// By-weight suggestion (cat_id null); Math.round(280.9) → 281 for the fill.
const suggestion: TargetSuggestion = {
  cat_id: null,
  current_weight_kg: 5.0,
  goal_weight_kg: null,
  rer_kcal: 234.1,
  factor: 1.2,
  basis: 'CURRENT_WEIGHT',
  suggested_target_kcal: 280.9,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

test('entering a weight fetches the suggestion and prefills the target', async () => {
  installFetchMock([
    { method: 'GET', path: '/api/foods', body: [] },
    { method: 'GET', path: '/api/target-suggestion', body: suggestion },
  ])

  renderWithProviders(<CatFormDialog open onOpenChange={() => {}} />)

  await userEvent.type(screen.getByLabelText('Initial weight (kg)'), '5')

  expect(await screen.findByText('Suggested target')).toBeInTheDocument()
  await waitFor(() =>
    expect(screen.getByLabelText('Daily target (kcal)')).toHaveValue(281),
  )
})

test('the Use button fills the target and a manual edit overrides the suggestion', async () => {
  installFetchMock([
    { method: 'GET', path: '/api/foods', body: [] },
    { method: 'GET', path: '/api/target-suggestion', body: suggestion },
  ])

  renderWithProviders(<CatFormDialog open onOpenChange={() => {}} />)

  await userEvent.type(screen.getByLabelText('Initial weight (kg)'), '5')
  const target = screen.getByLabelText('Daily target (kcal)')
  await waitFor(() => expect(target).toHaveValue(281))

  // Manual override wins: the auto-prefill must not clobber a hand-typed value.
  await userEvent.clear(target)
  await userEvent.type(target, '150')
  expect(target).toHaveValue(150)

  // The Use button re-applies the suggestion on demand.
  await userEvent.click(screen.getByRole('button', { name: /use 281 kcal/i }))
  expect(target).toHaveValue(281)
})

test('degrades gracefully with no weight: no suggestion, manual target still submits', async () => {
  const created = {
    id: 7,
    name: 'Whiskers',
    target_kcal: 200,
    goal_weight_kg: null,
    default_wet_food_id: null,
    default_dry_food_id: null,
    current_weight_kg: null,
    meal_count: 0,
  }
  const calls = installFetchMock([
    { method: 'GET', path: '/api/foods', body: [] },
    { method: 'POST', path: '/api/cats', status: 201, body: created },
  ])
  const onOpenChange = vi.fn()

  renderWithProviders(<CatFormDialog open onOpenChange={onOpenChange} />)

  await userEvent.type(screen.getByLabelText('Name'), 'Whiskers')
  await userEvent.type(screen.getByLabelText('Daily target (kcal)'), '200')

  expect(screen.queryByText('Suggested target')).not.toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: 'Add cat' }))

  const post = await waitFor(() => {
    const call = calls.find((c) => c.method === 'POST')
    expect(call).toBeDefined()
    return call!
  })
  expect(post.body).toMatchObject({ name: 'Whiskers', target_kcal: 200 })
  // No weight was entered, so the calculator was never called.
  expect(calls.some((c) => c.path === '/api/target-suggestion')).toBe(false)
  expect(onOpenChange).toHaveBeenCalledWith(false)
})

test('create mode offers default-food selects and sends the chosen wet default', async () => {
  const created = {
    id: 7,
    name: 'Whiskers',
    target_kcal: 200,
    goal_weight_kg: null,
    default_wet_food_id: 1,
    default_dry_food_id: null,
    current_weight_kg: null,
    meal_count: 0,
  }
  const calls = installFetchMock([
    { method: 'GET', path: '/api/foods', body: [wet, dry] },
    { method: 'POST', path: '/api/cats', status: 201, body: created },
  ])

  renderWithProviders(<CatFormDialog open onOpenChange={() => {}} />)

  await userEvent.type(screen.getByLabelText('Name'), 'Whiskers')
  await userEvent.type(screen.getByLabelText('Daily target (kcal)'), '200')

  await userEvent.click(await screen.findByRole('combobox', { name: 'Default wet food' }))
  await userEvent.click(await screen.findByRole('option', { name: 'Tuna Feast' }))

  await userEvent.click(screen.getByRole('button', { name: 'Add cat' }))

  const post = await waitFor(() => {
    const call = calls.find((c) => c.method === 'POST')
    expect(call).toBeDefined()
    return call!
  })
  expect(post.body).toMatchObject({ default_wet_food_id: 1, default_dry_food_id: null })
})

test('an empty food library shows the add-foods empty state for both selects', async () => {
  installFetchMock([{ method: 'GET', path: '/api/foods', body: [] }])

  renderWithProviders(<CatFormDialog open onOpenChange={() => {}} />)

  expect(await screen.findAllByText('Add foods in Settings first')).toHaveLength(2)
})
