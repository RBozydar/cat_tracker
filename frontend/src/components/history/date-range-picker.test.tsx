import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { DateRangePicker } from './date-range-picker'
import { presetRange } from './date-range'

const TODAY = '2026-07-10'

test('preset buttons compute their range from the household-local "today" prop, not the browser clock', async () => {
  const onChange = vi.fn()
  render(<DateRangePicker value={presetRange(30, TODAY)} onChange={onChange} today={TODAY} />)

  await userEvent.click(screen.getByRole('button', { name: '7 days' }))

  expect(onChange).toHaveBeenCalledWith(presetRange(7, TODAY))
})

test('the custom calendar keeps the household-local "today" selectable regardless of the browser clock', async () => {
  // A `today` far past the real system clock: under the old
  // `disabled: { after: startOfLocalDay() }` boundary (the browser's own
  // date), this day would always be disabled. The fix anchors the boundary
  // to the `today` prop instead, so it must stay selectable.
  const today = '2099-12-31'
  const range = { start: '2099-12-25', end: today }
  render(<DateRangePicker value={range} onChange={vi.fn()} today={today} />)

  await userEvent.click(screen.getByRole('button', { name: 'Custom' }))

  const cell = document.querySelector(`[data-day="${today}"]`)
  expect(cell).not.toBeNull()
  expect(cell).not.toHaveAttribute('data-disabled')
})
