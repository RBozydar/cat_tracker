/**
 * Theme mode: `light` | `dark` | `system`, persisted in localStorage and applied
 * to `<html>` via a `data-theme` attribute.
 *
 * The CSS (see `index.css`) is class-strategy with a system fallback: dark tokens
 * live under both `[data-theme="dark"]` and `@media (prefers-color-scheme: dark)`
 * scoped to `:root:not([data-theme])`. So `system` mode means "no attribute" and
 * the media query drives the flip automatically — no JS repaint needed.
 *
 * `mode`/`systemDark` live in one module-level store (below `useThemeMode`)
 * rather than per-hook `useState`, so every consumer (the Settings toggle, the
 * Toaster, ...) re-renders together on a change instead of drifting out of sync
 * until a remount. `useSyncExternalStore` is React's binding for exactly this
 * shape of external mutable state.
 *
 * `index.html` runs a tiny inline copy of {@link applyThemeMode}'s logic in
 * `<head>` before paint so the stored theme lands without a flash.
 */
import { useSyncExternalStore } from 'react'

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

// --- Shared store ------------------------------------------------------------
//
// One `mode`/`systemDark` pair for the whole app. `subscribe` lazily (re)syncs
// from localStorage and starts tracking `matchMedia` the moment the *first*
// consumer mounts, and tears the `matchMedia` listener down once the *last* one
// unmounts — so `systemDark` is never stale (fixes the "switch back to system
// mode shows the wrong theme until the OS preference changes again" case: it's
// now tracked unconditionally, not just while `mode === 'system'`), and nothing
// leaks a `matchMedia` subscription for the lifetime of the page when no
// consumer is mounted.
type Listener = () => void

let mode: ThemeMode = getStoredThemeMode()
let systemDark = false
let unsubscribeFromSystemTheme: (() => void) | null = null
const listeners = new Set<Listener>()

function notify(): void {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: Listener): () => void {
  if (listeners.size === 0) {
    mode = getStoredThemeMode()
    systemDark = systemPrefersDark()
    unsubscribeFromSystemTheme = subscribeToSystemTheme(() => {
      systemDark = systemPrefersDark()
      notify()
    })
  }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && unsubscribeFromSystemTheme) {
      unsubscribeFromSystemTheme()
      unsubscribeFromSystemTheme = null
    }
  }
}

function getModeSnapshot(): ThemeMode {
  return mode
}

function getSystemDarkSnapshot(): boolean {
  return systemDark
}

/** Persist, apply, and broadcast a mode to every `useThemeMode` consumer. */
export function setThemeMode(next: ThemeMode): void {
  persistThemeMode(next)
  applyThemeMode(next)
  mode = next
  notify()
}

/**
 * React binding for the theme: current `mode`, the `resolvedTheme` it renders as,
 * and a `setMode` that persists the choice. Every instance reads the same shared
 * store, so a change made through one component (e.g. the Settings toggle) is
 * immediately visible to every other mounted consumer (e.g. the Toaster).
 */
export function useThemeMode(): {
  mode: ThemeMode
  resolvedTheme: ResolvedTheme
  setMode: (mode: ThemeMode) => void
} {
  const currentMode = useSyncExternalStore(subscribe, getModeSnapshot)
  const currentSystemDark = useSyncExternalStore(subscribe, getSystemDarkSnapshot)
  const resolvedTheme: ResolvedTheme =
    currentMode === 'system' ? (currentSystemDark ? 'dark' : 'light') : currentMode
  return { mode: currentMode, resolvedTheme, setMode: setThemeMode }
}
