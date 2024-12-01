"use client"

import { CalendarIcon } from "@radix-ui/react-icons"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { format, subDays, subMonths } from "date-fns"
import { DateRange } from "react-day-picker"

interface DateRangePickerProps {
  date: DateRange | undefined
  onChange: (date: DateRange | undefined) => void
}

const presets = [
  {
    label: 'Last 7 days',
    getValue: () => ({
      from: subDays(new Date(), 7),
      to: new Date(),
    }),
  },
  {
    label: 'Last 30 days',
    getValue: () => ({
      from: subDays(new Date(), 30),
      to: new Date(),
    }),
  },
  {
    label: 'Last 3 months',
    getValue: () => ({
      from: subMonths(new Date(), 3),
      to: new Date(),
    }),
  },
]

export function DateRangePicker({ date, onChange }: DateRangePickerProps) {
  return (
    <div className="grid gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="space-y-4 p-3">
            <Select
              onValueChange={(value) => {
                const preset = presets.find((p) => p.label === value)
                if (preset) {
                  onChange(preset.getValue())
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a preset" />
              </SelectTrigger>
              <SelectContent position="popper">
                {presets.map((preset) => (
                  <SelectItem key={preset.label} value={preset.label}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="border rounded-md">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={onChange}
                numberOfMonths={2}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
