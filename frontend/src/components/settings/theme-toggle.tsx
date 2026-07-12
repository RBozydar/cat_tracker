import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { type ThemeMode, useThemeMode } from '@/lib/theme'

const OPTIONS: { mode: ThemeMode; label: string; Icon: LucideIcon }[] = [
  { mode: 'system', label: 'System', Icon: Monitor },
  { mode: 'light', label: 'Light', Icon: Sun },
  { mode: 'dark', label: 'Dark', Icon: Moon },
]

/**
 * Compact three-way light/dark/system control. Applies immediately (persisted to
 * localStorage), independent of the household-settings save. Lives in Settings so
 * it stays out of the mobile dashboard's space.
 *
 * Follows the ARIA radiogroup keyboard pattern: only the checked option is a tab
 * stop (roving tabindex), and arrow keys move focus and selection together
 * between options, wrapping at the ends.
 */
export function ThemeToggle() {
  const { mode, setMode } = useThemeMode()
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  function moveTo(index: number) {
    const wrapped = (index + OPTIONS.length) % OPTIONS.length
    const option = OPTIONS[wrapped]
    if (!option) return
    setMode(option.mode)
    buttonRefs.current[wrapped]?.focus()
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        moveTo(index + 1)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        moveTo(index - 1)
        break
      default:
        break
    }
  }

  return (
    <div className="grid gap-2">
      <Label id="theme-toggle-label">Theme</Label>
      <div
        role="radiogroup"
        aria-labelledby="theme-toggle-label"
        className="inline-flex w-fit gap-0.5 rounded-lg border p-0.5"
      >
        {OPTIONS.map(({ mode: optionMode, label, Icon }, index) => (
          <Button
            key={optionMode}
            ref={(element) => {
              buttonRefs.current[index] = element
            }}
            type="button"
            role="radio"
            aria-checked={mode === optionMode}
            tabIndex={mode === optionMode ? 0 : -1}
            variant={mode === optionMode ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setMode(optionMode)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <Icon data-icon="inline-start" aria-hidden />
            {label}
          </Button>
        ))}
      </div>
    </div>
  )
}
