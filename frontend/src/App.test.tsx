import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { expect, test } from 'vitest'
import App from './App'

test('renders the dashboard page inside the app shell', () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  )

  expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
  // The shell renders both the desktop and mobile nav in the DOM, so each
  // destination appears as more than one link.
  expect(screen.getAllByRole('link', { name: /history/i }).length).toBeGreaterThan(0)
  expect(screen.getAllByRole('link', { name: /settings/i }).length).toBeGreaterThan(0)
})
