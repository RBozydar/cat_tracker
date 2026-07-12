import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  applyThemeMode,
  getStoredThemeMode,
  isThemeMode,
  resolveTheme,
  setThemeMode,
  subscribeToSystemTheme,
  systemPrefersDark,
  THEME_STORAGE_KEY,
  useThemeMode,
} from './theme'

let mediaMatches = false
const changeListeners = new Set<() => void>()

beforeEach(() => {
  mediaMatches = false
  changeListeners.clear()
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return mediaMatches
    },
    media: query,
    onchange: null,
    addEventListener: (_type: string, cb: () => void) => changeListeners.add(cb),
    removeEventListener: (_type: string, cb: () => void) => changeListeners.delete(cb),
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

test('isThemeMode narrows only the three valid modes', () => {
  expect(isThemeMode('light')).toBe(true)
  expect(isThemeMode('dark')).toBe(true)
  expect(isThemeMode('system')).toBe(true)
  expect(isThemeMode('sepia')).toBe(false)
  expect(isThemeMode(null)).toBe(false)
})

test('getStoredThemeMode defaults to system when absent or invalid', () => {
  expect(getStoredThemeMode()).toBe('system')
  localStorage.setItem(THEME_STORAGE_KEY, 'nonsense')
  expect(getStoredThemeMode()).toBe('system')
  localStorage.setItem(THEME_STORAGE_KEY, 'dark')
  expect(getStoredThemeMode()).toBe('dark')
})

test('applyThemeMode sets data-theme for light/dark and removes it for system', () => {
  applyThemeMode('dark')
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  applyThemeMode('light')
  expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  applyThemeMode('system')
  expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
})

test('setThemeMode persists and applies across a light -> dark -> system transition', () => {
  setThemeMode('light')
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  expect(document.documentElement.getAttribute('data-theme')).toBe('light')

  setThemeMode('dark')
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

  setThemeMode('system')
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system')
  expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
})

test('resolveTheme follows the OS preference only in system mode', () => {
  mediaMatches = true
  expect(systemPrefersDark()).toBe(true)
  expect(resolveTheme('system')).toBe('dark')
  expect(resolveTheme('light')).toBe('light')
  mediaMatches = false
  expect(resolveTheme('system')).toBe('light')
  expect(resolveTheme('dark')).toBe('dark')
})

test('subscribeToSystemTheme fires on matchMedia change and stops after unsubscribe', () => {
  const listener = vi.fn()
  const unsubscribe = subscribeToSystemTheme(listener)

  changeListeners.forEach((cb) => cb())
  expect(listener).toHaveBeenCalledTimes(1)

  unsubscribe()
  changeListeners.forEach((cb) => cb())
  expect(listener).toHaveBeenCalledTimes(1)
})

function ModeReadout({ testId }: { testId: string }) {
  const { mode } = useThemeMode()
  return <span data-testid={testId}>{mode}</span>
}

function ModeToggleButton() {
  const { setMode } = useThemeMode()
  return (
    <button type="button" onClick={() => setMode('dark')}>
      Set dark
    </button>
  )
}

// Regression test for the desync bug: separate useThemeMode instances (e.g. the
// Settings toggle and the Toaster) used to each hold independent useState, so a
// change from one left the others stale until a remount. All instances now read
// one shared store via useSyncExternalStore.
test('a mode change from one useThemeMode consumer is immediately visible to another', async () => {
  const user = userEvent.setup()
  render(
    <>
      <ModeToggleButton />
      <ModeReadout testId="a" />
      <ModeReadout testId="b" />
    </>,
  )

  expect(screen.getByTestId('a')).toHaveTextContent('system')
  expect(screen.getByTestId('b')).toHaveTextContent('system')

  await user.click(screen.getByRole('button', { name: 'Set dark' }))

  expect(screen.getByTestId('a')).toHaveTextContent('dark')
  expect(screen.getByTestId('b')).toHaveTextContent('dark')
})
