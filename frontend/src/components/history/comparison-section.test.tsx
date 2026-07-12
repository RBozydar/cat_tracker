import { screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import type { ComparisonReport } from '@/api/reports'
import { installFetchMock } from '@/test/mock-api'
import { renderWithProviders } from '@/test/render'
import { ComparisonSection } from './comparison-section'

const RANGE = { start: '2026-06-10', end: '2026-07-09' }

afterEach(() => {
  vi.unstubAllGlobals()
})

test('shows each cat with its adherence % and an over/on-track state', async () => {
  const report: ComparisonReport = {
    start: RANGE.start,
    end: RANGE.end,
    timezone: 'Europe/Warsaw',
    cats: [
      // Over target: adherence > 100.
      {
        cat_id: 1,
        cat_name: 'Misza',
        avg_kcal_per_day: 260.4,
        target_kcal: 200,
        adherence_pct: 130.2,
      },
      // Under target.
      {
        cat_id: 2,
        cat_name: 'Fela',
        avg_kcal_per_day: 180,
        target_kcal: 240,
        adherence_pct: 75,
      },
    ],
  }
  installFetchMock([{ method: 'GET', path: '/api/reports/comparison', body: report }])

  renderWithProviders(<ComparisonSection range={RANGE} />)

  // Over-target cat: rounded adherence and the "Over" badge.
  expect(await screen.findByText('130%')).toBeInTheDocument()
  expect(screen.getByText('Over')).toBeInTheDocument()
  expect(screen.getByLabelText(/Misza at 130 percent of target/i)).toBeInTheDocument()

  // Under-target cat: "On track" and its own %.
  expect(screen.getByText('75%')).toBeInTheDocument()
  expect(screen.getByText('On track')).toBeInTheDocument()
})

test('renders a friendly empty state when there are no cats', async () => {
  const report: ComparisonReport = {
    start: RANGE.start,
    end: RANGE.end,
    timezone: 'Europe/Warsaw',
    cats: [],
  }
  installFetchMock([{ method: 'GET', path: '/api/reports/comparison', body: report }])

  renderWithProviders(<ComparisonSection range={RANGE} />)

  expect(await screen.findByText(/no cats to compare yet/i)).toBeInTheDocument()
})

test('surfaces a 400 (end before start) as an error message', async () => {
  installFetchMock([
    {
      method: 'GET',
      path: '/api/reports/comparison',
      status: 400,
      body: { detail: 'end must be on or after start' },
    },
  ])

  renderWithProviders(<ComparisonSection range={{ start: '2026-07-09', end: '2026-06-10' }} />)

  expect(await screen.findByText(/end must be on or after start/i)).toBeInTheDocument()
})
