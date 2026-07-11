import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { queryKeys } from '@/api/query-keys'
import { HouseholdCard } from './household-card'

afterEach(() => {
  vi.unstubAllGlobals()
})

test('a background refetch does not clobber an unsaved edit', async () => {
  let settingsCalls = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), 'http://localhost')
      if (url.pathname === '/api/settings') {
        settingsCalls += 1
        // The second fetch simulates another device saving different settings
        // while this tab has an unsaved edit in progress.
        const mealsPerDay = settingsCalls === 1 ? 2 : 4
        return new Response(
          JSON.stringify({
            timezone: 'UTC',
            portion_suggestions_enabled: false,
            meals_per_day: mealsPerDay,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return new Response(JSON.stringify({ detail: `unmocked ${url.pathname}` }), { status: 404 })
    }),
  )

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <HouseholdCard />
    </QueryClientProvider>,
  )

  const input = await screen.findByLabelText('Meals per day')
  await waitFor(() => expect(input).toHaveValue(2))

  await userEvent.clear(input)
  await userEvent.type(input, '9')
  expect(input).toHaveValue(9)

  // Simulate a background refetch bringing in different server data.
  await queryClient.refetchQueries({ queryKey: queryKeys.settings.all })
  await waitFor(() => expect(settingsCalls).toBe(2))

  // The in-progress unsaved edit survives the refetch.
  expect(input).toHaveValue(9)
})
