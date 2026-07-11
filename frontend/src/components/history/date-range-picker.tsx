/**
 * Range picker: preset buttons (7 / 30 / 90 days, computed in LOCAL dates) plus
 * a custom range via a calendar popover. Presets and custom both emit a
 * `{ start, end }` of LOCAL `YYYY-MM-DD` strings — the shape the reports
 * endpoints expect.
 */
import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'
import type { DateRange as CalendarRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDayTick } from '@/components/charts/chart-utils'
import {
  PRESETS,
  matchingPreset,
  parseLocalISO,
  presetRange,
  rangeFromCalendarSelection,
  startOfLocalDay,
  type DateRange,
} from './date-range'

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  /** Household-local "today" (`YYYY-MM-DD`) that presets are computed from. */
  today: string
}

export function DateRangePicker({ value, onChange, today }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const activePreset = matchingPreset(value, today)

  function handleCalendarSelect(selected: CalendarRange | undefined) {
    const range = rangeFromCalendarSelection(selected)
    if (!range) return
    onChange(range)
    setOpen(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map(({ days, label }) => (
        <Button
          key={days}
          size="sm"
          variant={activePreset === days ? 'default' : 'outline'}
          onClick={() => onChange(presetRange(days, today))}
        >
          {label}
        </Button>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" variant={activePreset === null ? 'default' : 'outline'}>
            <CalendarIcon data-icon="inline-start" aria-hidden />
            {activePreset === null
              ? `${formatDayTick(value.start)} – ${formatDayTick(value.end)}`
              : 'Custom'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto" align="start">
          <Calendar
            mode="range"
            required={false}
            defaultMonth={parseLocalISO(value.start)}
            selected={{ from: parseLocalISO(value.start), to: parseLocalISO(value.end) }}
            onSelect={handleCalendarSelect}
            disabled={{ after: startOfLocalDay() }}
            numberOfMonths={2}
            className="p-0"
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
