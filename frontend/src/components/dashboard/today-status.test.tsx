import { screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import type { TodayReport } from '@/api/types'
import { installFetchMock } from '@/test/mock-api'
import { renderWithProviders } from '@/test/render'
import { TodayStatus } from './today-status'

const report: TodayReport = {
  date: '2026-07-10',
  timezone: 'Europe/Warsaw',
  cats: [
    {
      cat_id: 1,
      cat_name: 'Misza',
      target_kcal: 300,
      consumed_kcal: 350,
      remaining_kcal: -50,
      over: true,
      // Grams clamp to 0 server-side when over; the card hides them regardless.
      grams_equivalents: [{ food_id: 10, food_name: 'Chicken Pâté', food_type: 'WET', grams: 0 }],
      portion_suggestions: [],
    },
    {
      cat_id: 2,
      cat_name: 'Fela',
      target_kcal: 250,
      consumed_kcal: 100,
      remaining_kcal: 150,
      over: false,
      grams_equivalents: [
        { food_id: 10, food_name: 'Chicken Pâté', food_type: 'WET', grams: 120 },
        { food_id: 11, food_name: 'Kibble', food_type: 'DRY', grams: 25 },
      ],
      portion_suggestions: [],
    },
  ],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

test('renders an over-target cat distinctly and a remaining cat with grams left', async () => {
  installFetchMock([{ method: 'GET', path: '/api/reports/today', body: report }])

  renderWithProviders(<TodayStatus />)

  const over = await screen.findByText('Over by 50 kcal')
  expect(over).toBeInTheDocument()
  expect(over).toHaveClass('text-destructive')

  // The over cat suppresses the (zero) grams-equivalent line.
  expect(screen.queryByText(/≈ 0 g wet left/)).not.toBeInTheDocument()

  // The under-target cat shows remaining kcal and its grams-equivalents.
  expect(screen.getByText('150 kcal left')).toBeInTheDocument()
  expect(screen.getByText('≈ 120 g wet · 25 g dry left')).toBeInTheDocument()
})
