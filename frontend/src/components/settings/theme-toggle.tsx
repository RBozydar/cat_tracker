import { Monitor, Moon, Sun } from 'lucide-react'
import type { ComponentType } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { type ThemeMode, useThemeMode } from '@/lib/theme'

const OPTIONS: { mode: ThemeMode; label: string; Icon: ComponentType }[] = [
  { mode: 'system', label: 'System', Icon: Monitor },
  { mode: 'light', label: 'Light', Icon: Sun },
  { mode: 'dark', label: 'Dark', Icon: Moon },
]

/**
 * Compact three-way light/dark/system control. Applies immediately (persisted to
 * localStorage), independent of the household-settings save. Lives in Settings so
 * it stays out of the mobile dashboard's space.
 */
export function ThemeToggle() {
  const { mode, setMode } = useThemeMode()
  return (
    <div className="grid gap-2">
      <Label htmlFor="theme-toggle">Theme</Label>
      <div
        id="theme-toggle"
        role="radiogroup"
        aria-label="Theme"
        className="inline-flex w-fit gap-0.5 rounded-lg border p-0.5"
      >
        {OPTIONS.map(({ mode: optionMode, label, Icon }) => (
          <Button
            key={optionMode}
            type="button"
            role="radio"
            aria-checked={mode === optionMode}
            variant={mode === optionMode ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setMode(optionMode)}
          >
            <Icon data-icon="inline-start" aria-hidden />
            {label}
          </Button>
        ))}
      </div>
    </div>
  )
}
