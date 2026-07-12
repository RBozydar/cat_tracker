import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import type { Cat, Food, FoodDeleteResult } from '@/api/types'
import { installFetchMock } from '@/test/mock-api'
import { renderWithProviders } from '@/test/render'
import { FoodsCard } from './foods-card'

const tuna: Food = {
  id: 1,
  name: 'Tuna Feast',
  type: 'WET',
  calorie_basis: 'PER_100G',
  kcal_per_basis: 85,
  archived_at: null,
}

const cats: Cat[] = [
  {
    id: 1,
    name: 'Misza',
    target_kcal: 250,
    goal_weight_kg: null,
    default_wet_food_id: 1,
    default_dry_food_id: null,
    current_weight_kg: null,
    meal_count: 3,
  },
  {
    id: 2,
    name: 'Fela',
    target_kcal: 220,
    goal_weight_kg: 4,
    default_wet_food_id: 1,
    default_dry_food_id: null,
    current_weight_kg: 5.1,
    meal_count: 1,
  },
]

afterEach(() => {
  vi.unstubAllGlobals()
})

test('archiving a food warns and names the cats whose defaults were cleared', async () => {
  const archiveResult: FoodDeleteResult = {
    archived: true,
    food: { ...tuna, archived_at: '2026-07-10T12:00:00Z' },
    cleared_default_for_cat_ids: [1, 2],
  }
  installFetchMock([
    { method: 'GET', path: '/api/foods', body: [tuna] },
    { method: 'GET', path: '/api/cats', body: cats },
    { method: 'DELETE', path: '/api/foods/1', body: archiveResult },
  ])

  renderWithProviders(<FoodsCard />)

  await userEvent.click(await screen.findByRole('button', { name: 'Delete Tuna Feast' }))
  await userEvent.click(await screen.findByRole('button', { name: /^delete$/i }))

  // Warning toast: archived (not hard-deleted) + the affected cats by name.
  expect(
    await screen.findByText(/Tuna Feast was archived because meals reference it/i),
  ).toBeInTheDocument()
  expect(
    await screen.findByText(/No longer the default food for Misza, Fela\./i),
  ).toBeInTheDocument()
})

test('hard delete without cleared defaults shows a plain success toast', async () => {
  const deleteResult: FoodDeleteResult = {
    archived: false,
    food: null,
    cleared_default_for_cat_ids: [],
  }
  installFetchMock([
    { method: 'GET', path: '/api/foods', body: [tuna] },
    { method: 'GET', path: '/api/cats', body: [] },
    { method: 'DELETE', path: '/api/foods/1', body: deleteResult },
  ])

  renderWithProviders(<FoodsCard />)

  await userEvent.click(await screen.findByRole('button', { name: 'Delete Tuna Feast' }))
  await userEvent.click(await screen.findByRole('button', { name: /^delete$/i }))

  expect(await screen.findByText('Tuna Feast deleted')).toBeInTheDocument()
  expect(screen.queryByText(/No longer the default food/i)).not.toBeInTheDocument()
})

test('empty food library prompts to add the first food', async () => {
  installFetchMock([
    { method: 'GET', path: '/api/foods', body: [] },
    { method: 'GET', path: '/api/cats', body: [] },
  ])

  renderWithProviders(<FoodsCard />)

  expect(await screen.findByText(/No foods yet/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /add your first food/i })).toBeInTheDocument()
})
