import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import type { Food, FoodMutationResult } from '@/api/types'
import { installFetchMock } from '@/test/mock-api'
import { renderWithProviders } from '@/test/render'
import { FoodFormDialog } from './food-form-dialog'

const dry: Food = {
  id: 2,
  name: 'Kibble',
  type: 'DRY',
  calorie_basis: 'PER_100G',
  kcal_per_basis: 350,
  archived_at: null,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

test('creating a wet food as default for all cats sends the flag and reports the count', async () => {
  const result: FoodMutationResult = {
    food: {
      id: 5,
      name: 'House Wet',
      type: 'WET',
      calorie_basis: 'PER_100G',
      kcal_per_basis: 80,
      archived_at: null,
    },
    defaulted_for_cat_count: 3,
  }
  const calls = installFetchMock([{ method: 'POST', path: '/api/foods', status: 201, body: result }])

  renderWithProviders(<FoodFormDialog open onOpenChange={vi.fn()} />)

  await userEvent.type(screen.getByLabelText('Name'), 'House Wet')
  await userEvent.type(screen.getByLabelText('kcal per 100 g'), '80')
  await userEvent.click(screen.getByRole('switch', { name: /set as default wet food for all cats/i }))
  await userEvent.click(screen.getByRole('button', { name: 'Add food' }))

  const post = await waitFor(() => {
    const call = calls.find((c) => c.method === 'POST')
    expect(call).toBeDefined()
    return call!
  })
  expect(post.body).toMatchObject({
    name: 'House Wet',
    type: 'WET',
    set_default_for_all_cats: true,
  })
  expect(await screen.findByText(/set as default wet food for 3 cats/i)).toBeInTheDocument()
})

test('the default-for-all-cats toggle is hidden for treats', async () => {
  installFetchMock([])

  renderWithProviders(<FoodFormDialog open onOpenChange={vi.fn()} />)

  // WET is the default type → the toggle is present.
  expect(screen.getByRole('switch', { name: /set as default/i })).toBeInTheDocument()

  await userEvent.click(screen.getByRole('combobox', { name: 'Type' }))
  await userEvent.click(await screen.findByRole('option', { name: 'Treat' }))

  expect(screen.queryByRole('switch', { name: /set as default/i })).not.toBeInTheDocument()
})

test('editing a dry food labels the toggle for the dry default', async () => {
  installFetchMock([])

  renderWithProviders(<FoodFormDialog open onOpenChange={vi.fn()} food={dry} />)

  expect(
    screen.getByRole('switch', { name: /set as default dry food for all cats/i }),
  ).toBeInTheDocument()
})
