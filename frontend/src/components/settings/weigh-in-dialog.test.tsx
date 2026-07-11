import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { createQueryClient } from '@/api/query-client'
import type { Cat } from '@/api/types'
import { Toaster } from '@/components/ui/sonner'
import { renderWithProviders } from '@/test/render'
import { WeighInDialog } from './weigh-in-dialog'

const cat: Cat = {
  id: 1,
  name: 'Misza',
  target_kcal: 300,
  goal_weight_kg: null,
  default_wet_food_id: null,
  default_dry_food_id: null,
  current_weight_kg: 6,
  meal_count: 5,
}

afterEach(() => {
  vi.useRealTimers()
})

test('defaults the weigh-in date from the household timezone, not the browser clock', () => {
  // 23:30 UTC on the 10th is already 00:30 on the 11th in Europe/Warsaw
  // (UTC+2 in July) — reports and history ranges interpret this as the 11th.
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-07-10T23:30:00Z'))

  renderWithProviders(
    <WeighInDialog open onOpenChange={vi.fn()} cat={cat} timezone="Europe/Warsaw" />,
  )

  expect(screen.getByLabelText('Date')).toHaveValue('2026-07-11')
})

test('re-defaults the date when the timezone changes while the dialog stays open', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-07-10T23:30:00Z'))

  const queryClient = createQueryClient()
  const renderWithTimezone = (timezone: string) => (
    <QueryClientProvider client={queryClient}>
      <WeighInDialog open onOpenChange={vi.fn()} cat={cat} timezone={timezone} />
      <Toaster />
    </QueryClientProvider>
  )

  const { rerender } = render(renderWithTimezone('UTC'))
  expect(screen.getByLabelText('Date')).toHaveValue('2026-07-10')

  rerender(renderWithTimezone('Europe/Warsaw'))
  expect(screen.getByLabelText('Date')).toHaveValue('2026-07-11')
})

test('an in-progress weight/date entry survives a timezone change (partner edits settings mid-entry)', async () => {
  const queryClient = createQueryClient()
  const renderWithTimezone = (timezone: string) => (
    <QueryClientProvider client={queryClient}>
      <WeighInDialog open onOpenChange={vi.fn()} cat={cat} timezone={timezone} />
      <Toaster />
    </QueryClientProvider>
  )

  const { rerender } = render(renderWithTimezone('UTC'))

  await userEvent.type(screen.getByLabelText('Weight (kg)'), '4.2')
  await userEvent.clear(screen.getByLabelText('Date'))
  await userEvent.type(screen.getByLabelText('Date'), '2026-07-05')
  expect(screen.getByLabelText('Date')).toHaveValue('2026-07-05')

  // The household timezone changes mid-entry (e.g. the partner just saved a
  // different one) — the in-progress date must not reset to today's default.
  rerender(renderWithTimezone('Europe/Warsaw'))
  expect(screen.getByLabelText('Date')).toHaveValue('2026-07-05')
  expect(screen.getByLabelText('Weight (kg)')).toHaveValue(4.2)
})
