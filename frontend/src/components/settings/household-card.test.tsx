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

test('saving does not flash back to stale data while the invalidation refetch is in flight', async () => {
  let getCalls = 0
  let releaseSlowRefetch: () => void = () => {}
  const slowRefetchGate = new Promise<void>((resolve) => {
    releaseSlowRefetch = resolve
  })

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost')
      const method = init?.method ?? 'GET'
      if (url.pathname === '/api/settings' && method === 'GET') {
        getCalls += 1
        if (getCalls === 2) {
          // The invalidation-triggered refetch: hold it open so the race window
          // between "save succeeded" and "refetch resolved" is observable.
          await slowRefetchGate
        }
        // The server already committed the save by the time either GET runs.
        return new Response(
          JSON.stringify({
            timezone: 'Europe/Warsaw',
            portion_suggestions_enabled: false,
            meals_per_day: getCalls === 1 ? 2 : 9,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      if (url.pathname === '/api/settings' && method === 'PUT') {
        return new Response(
          JSON.stringify({
            timezone: 'Europe/Warsaw',
            portion_suggestions_enabled: false,
            meals_per_day: 9,
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

  // Picking the timezone through the real combobox (rather than relying on
  // the auto-seeded value) keeps this test's form-submit path unaffected by
  // Radix Select's own async item-registration timing.
  await userEvent.click(screen.getByRole('combobox', { name: 'Timezone' }))
  await userEvent.click(await screen.findByRole('option', { name: 'Europe/Warsaw' }))

  await userEvent.clear(input)
  await userEvent.type(input, '9')
  await userEvent.click(screen.getByRole('button', { name: 'Save settings' }))

  // The save resolved and the invalidation refetch has started (and is stuck
  // open) — the just-saved value must not flash back to the pre-save 2.
  await waitFor(() => expect(getCalls).toBe(2))
  expect(input).toHaveValue(9)

  releaseSlowRefetch()
  await waitFor(() => expect(input).toHaveValue(9))
})
