import { screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { installFetchMock } from '@/test/mock-api'
import { renderWithProviders } from '@/test/render'
import { WeeklySummary } from './weekly-summary'

afterEach(() => {
  vi.unstubAllGlobals()
})

test('surfaces the settings error instead of loading forever when settings fails', async () => {
  // A 400 is deterministic (no retry) — the comparison query stays disabled
  // (gated on settings.isSuccess) and, without the fix, isPending forever.
  installFetchMock([
    { method: 'GET', path: '/api/settings', status: 400, body: { detail: 'Settings unavailable' } },
  ])

  renderWithProviders(<WeeklySummary />)

  expect(await screen.findByText('Settings unavailable')).toBeInTheDocument()
  expect(screen.queryByText('Loading weekly summary…')).not.toBeInTheDocument()
})
