import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { Switch } from './switch'

test('the track and thumb react to Radix state, not an unmatched data-checked attribute', async () => {
  render(<Switch aria-label="test switch" />)
  const track = screen.getByRole('switch')

  expect(track).toHaveAttribute('data-state', 'unchecked')
  expect(track.className).toContain('data-[state=unchecked]:bg-input')
  expect(track).not.toHaveClass('bg-primary')

  await userEvent.click(track)

  expect(track).toHaveAttribute('data-state', 'checked')
  expect(track.className).toContain('data-[state=checked]:bg-primary')
})
