/**
 * Theme mode: `light` | `dark` | `system`, persisted in localStorage and applied
 * to `<html>` via a `data-theme` attribute.
 *
 * The CSS (see `index.css`) is class-strategy with a system fallback: dark tokens
 * live under both `[data-theme="dark"]` and `@media (prefers-color-scheme: dark)`
 * scoped to `:root:not([data-theme])`. So `system` mode means "no attribute" and
 * the media query drives the flip automatically — no JS repaint needed. The
 * `matchMedia` subscription here exists only to keep React state (`resolvedTheme`)
 * in sync when the OS preference changes while in system mode.
 *
 * `index.html` runs a tiny inline copy of {@link applyThemeMode}'s logic in
 * `<head>` before paint so the stored theme lands without a flash.
 */
import { useCallback, useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

/** localStorage key; kept in sync with the inline pre-paint script in index.html. */
export const THEME_STORAGE_KEY = 'cat-tracker-theme'

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system'
}

/** The persisted mode; `system` when absent or invalid (the default behavior). */
export function getStoredThemeMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isThemeMode(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

/** Apply a mode to `<html>`: set `data-theme` for light/dark, remove it for system. */
export function applyThemeMode(mode: ThemeMode): void {
  const root = document.documentElement
  if (mode === 'system') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', mode)
  }
}

/** Persist a mode to localStorage (tolerating storage being unavailable). */
export function persistThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode)
  } catch {
    // Private-mode / disabled storage: the in-memory state still drives this session.
  }
}

/** Persist and apply a mode in one step (imperative callers and tests). */
export function setThemeMode(mode: ThemeMode): void {
  persistThemeMode(mode)
  applyThemeMode(mode)
}

export function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return mode
}

/**
 * Subscribe to OS light/dark changes. Returns an unsubscribe function. Used only
 * while in system mode, where the CSS media query already handles the visual flip.
 */
export function subscribeToSystemTheme(listener: () => void): () => void {
  const mql = window.matchMedia('(prefers-color-scheme: dark)')
  mql.addEventListener('change', listener)
  return () => mql.removeEventListener('change', listener)
}

/**
 * React binding for the theme: current `mode`, the `resolvedTheme` it renders as,
 * and a `setMode` that persists the choice. Applies the mode to `<html>` on mount
 * and on change; while in system mode, re-renders when the OS preference flips.
 */
export function useThemeMode(): {
  mode: ThemeMode
  resolvedTheme: ResolvedTheme
  setMode: (mode: ThemeMode) => void
} {
  const [mode, setModeState] = useState<ThemeMode>(getStoredThemeMode)
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark)

  useEffect(() => {
    applyThemeMode(mode)
  }, [mode])

  useEffect(() => {
    if (mode !== 'system') return undefined
    return subscribeToSystemTheme(() => setSystemDark(systemPrefersDark()))
  }, [mode])

  const setMode = useCallback((next: ThemeMode) => {
    persistThemeMode(next)
    setModeState(next)
  }, [])

  const resolvedTheme: ResolvedTheme = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode
  return { mode, resolvedTheme, setMode }
}
