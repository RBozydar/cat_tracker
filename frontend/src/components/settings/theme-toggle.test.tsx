import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test } from 'vitest'
import { THEME_STORAGE_KEY } from '@/lib/theme'
import { ThemeToggle } from './theme-toggle'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

test('defaults to system and applies the chosen theme on click', async () => {
  render(<ThemeToggle />)

  expect(screen.getByRole('radio', { name: /system/i })).toHaveAttribute('aria-checked', 'true')
  expect(document.documentElement.hasAttribute('data-theme')).toBe(false)

  await userEvent.click(screen.getByRole('radio', { name: /dark/i }))
  expect(screen.getByRole('radio', { name: /dark/i })).toHaveAttribute('aria-checked', 'true')
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')

  await userEvent.click(screen.getByRole('radio', { name: /light/i }))
  expect(document.documentElement.getAttribute('data-theme')).toBe('light')

  await userEvent.click(screen.getByRole('radio', { name: /system/i }))
  expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system')
})
