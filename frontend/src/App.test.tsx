import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import { createQueryClient } from '@/api/query-client'
import { installFetchMock } from '@/test/mock-api'
import App from './App'

afterEach(() => {
  vi.unstubAllGlobals()
})

test('renders the dashboard page inside the app shell', () => {
  // The dashboard now reads live data, so it needs the query provider (supplied
  // by main.tsx in the real app) and a stub for its first request.
  installFetchMock([{ method: 'GET', path: '/api/cats', body: [] }])

  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )

  expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
  // The shell renders both the desktop and mobile nav in the DOM, so each
  // destination appears as more than one link.
  expect(screen.getAllByRole('link', { name: /history/i }).length).toBeGreaterThan(0)
  expect(screen.getAllByRole('link', { name: /settings/i }).length).toBeGreaterThan(0)
})
