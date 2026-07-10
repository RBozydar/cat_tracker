import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import type { TargetSuggestion } from '@/api/target-suggestion.types'
import type { Cat } from '@/api/types'
import { installFetchMock } from '@/test/mock-api'
import { renderWithProviders } from '@/test/render'
import { TargetCalculatorDialog } from './target-calculator-dialog'

const misza: Cat = {
  id: 1,
  name: 'Misza',
  target_kcal: 300,
  goal_weight_kg: 4.5,
  default_wet_food_id: null,
  default_dry_food_id: null,
  current_weight_kg: 6.2,
  meal_count: 0,
}

const goalSuggestion: TargetSuggestion = {
  cat_id: 1,
  current_weight_kg: 6.2,
  goal_weight_kg: 4.5,
  rer_kcal: 216.3,
  factor: 0.8,
  basis: 'GOAL_WEIGHT',
  suggested_target_kcal: 173.0,
}

const maintenanceSuggestion: TargetSuggestion = {
  cat_id: 1,
  current_weight_kg: 6.2,
  goal_weight_kg: null,
  rer_kcal: 275.0,
  factor: 1.2,
  basis: 'CURRENT_WEIGHT',
  suggested_target_kcal: 330.1,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

test('shows the RER breakdown based on goal weight', async () => {
  installFetchMock([
    { method: 'GET', path: '/api/target-suggestion', body: goalSuggestion },
  ])

  renderWithProviders(<TargetCalculatorDialog open onOpenChange={() => {}} cat={misza} />)

  expect(await screen.findByText('Goal weight 4.5 kg')).toBeInTheDocument()
  expect(screen.getByText('216 kcal')).toBeInTheDocument()
  expect(screen.getByText(/× 0.8\s*\(weight loss\)/)).toBeInTheDocument()
  expect(screen.getByText('173 kcal')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /apply suggestion/i })).toBeEnabled()
})

test('falls back to current weight and maintenance factor without a goal', async () => {
  installFetchMock([
    { method: 'GET', path: '/api/target-suggestion', body: maintenanceSuggestion },
  ])

  renderWithProviders(<TargetCalculatorDialog open onOpenChange={() => {}} cat={misza} />)

  expect(await screen.findByText('Current weight 6.2 kg')).toBeInTheDocument()
  expect(screen.getByText('275 kcal')).toBeInTheDocument()
  expect(screen.getByText(/× 1.2\s*\(maintenance\)/)).toBeInTheDocument()
  expect(screen.getByText('330 kcal')).toBeInTheDocument()
})

test('explains the 400 no-data case and disables Apply', async () => {
  installFetchMock([
    {
      method: 'GET',
      path: '/api/target-suggestion',
      status: 400,
      body: { detail: 'Cat 1 has no goal weight and no weight entries' },
    },
  ])

  renderWithProviders(<TargetCalculatorDialog open onOpenChange={() => {}} cat={misza} />)

  expect(
    await screen.findByText(/add a weigh-in or set a goal weight for Misza first/i),
  ).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /apply suggestion/i })).toBeDisabled()
})

test('Apply PATCHes the suggested target and closes the dialog', async () => {
  const calls = installFetchMock([
    { method: 'GET', path: '/api/target-suggestion', body: goalSuggestion },
    { method: 'PATCH', path: '/api/cats/1', body: { ...misza, target_kcal: 173.0 } },
  ])
  const onOpenChange = vi.fn()

  renderWithProviders(<TargetCalculatorDialog open onOpenChange={onOpenChange} cat={misza} />)

  const apply = await screen.findByRole('button', { name: /apply suggestion/i })
  await userEvent.click(apply)

  const patch = calls.find((call) => call.method === 'PATCH')
  expect(patch).toMatchObject({
    path: '/api/cats/1',
    body: { target_kcal: 173.0 },
  })
  expect(onOpenChange).toHaveBeenCalledWith(false)
})
