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

test('only the checked option is tabbable, and arrow keys move focus and selection', async () => {
  render(<ThemeToggle />)

  const system = screen.getByRole('radio', { name: /system/i })
  const light = screen.getByRole('radio', { name: /light/i })
  const dark = screen.getByRole('radio', { name: /dark/i })

  expect(system).toHaveAttribute('tabindex', '0')
  expect(light).toHaveAttribute('tabindex', '-1')
  expect(dark).toHaveAttribute('tabindex', '-1')

  system.focus()
  await userEvent.keyboard('{ArrowRight}')
  expect(light).toHaveFocus()
  expect(light).toHaveAttribute('aria-checked', 'true')
  expect(light).toHaveAttribute('tabindex', '0')
  expect(system).toHaveAttribute('tabindex', '-1')

  await userEvent.keyboard('{ArrowLeft}')
  expect(system).toHaveFocus()
  expect(system).toHaveAttribute('aria-checked', 'true')

  await userEvent.keyboard('{ArrowLeft}')
  expect(dark).toHaveFocus()
  expect(dark).toHaveAttribute('aria-checked', 'true')
})
