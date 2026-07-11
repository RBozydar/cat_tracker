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
