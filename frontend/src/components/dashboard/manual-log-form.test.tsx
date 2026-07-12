import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { expect, test } from 'vitest'
import { createQueryClient } from '@/api/query-client'
import type { Cat, Food } from '@/api/types'
import { ManualLogForm } from './manual-log-form'

const cat: Cat = {
  id: 1,
  name: 'Misza',
  target_kcal: 300,
  goal_weight_kg: null,
  default_wet_food_id: 10,
  default_dry_food_id: null,
  current_weight_kg: 6,
  meal_count: 0,
}

const foods: Food[] = [
  {
    id: 10,
    name: 'Chicken Pâté',
    type: 'WET',
    calorie_basis: 'PER_100G',
    kcal_per_basis: 80,
    archived_at: null,
  },
]

test('fills in the default food once the library arrives after the form already mounted', () => {
  const queryClient = createQueryClient()
  const { rerender } = render(
    <MemoryRouter initialEntries={['/']}>
      <QueryClientProvider client={queryClient}>
        <ManualLogForm cat={cat} foods={[]} />
      </QueryClientProvider>
    </MemoryRouter>,
  )

  // Foods query still pending when the cat was selected: nothing to pick yet.
  expect(screen.getByText(/No foods yet/)).toBeInTheDocument()

  rerender(
    <MemoryRouter initialEntries={['/']}>
      <QueryClientProvider client={queryClient}>
        <ManualLogForm cat={cat} foods={foods} />
      </QueryClientProvider>
    </MemoryRouter>,
  )

  // The cat's default wet food is now selected, not left stuck empty.
  expect(screen.getByRole('combobox')).toHaveTextContent('Chicken Pâté')
})
