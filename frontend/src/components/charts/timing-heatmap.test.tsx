import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { buildHeatmapCells, TimingHeatmap } from './timing-heatmap'

/** A zeroed 7×24 matrix with a few `[weekday][hour]` cells set. */
function matrixWith(entries: [weekday: number, hour: number, count: number][]): number[][] {
  const matrix = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0))
  for (const [weekday, hour, count] of entries) {
    const row = matrix[weekday]
    if (row) row[hour] = count
  }
  return matrix
}

test('buildHeatmapCells flattens [weekday][hour] in row-major order with the peak', () => {
  const matrix = matrixWith([
    [0, 8, 3], // Monday 08:00
    [6, 23, 5], // Sunday 23:00
  ])
  const { cells, max } = buildHeatmapCells(matrix)

  expect(cells).toHaveLength(7 * 24)
  expect(max).toBe(5)
  // Monday 08:00 lands at index 0*24 + 8.
  expect(cells[8]).toEqual({ weekday: 0, hour: 8, count: 3 })
  // Sunday 23:00 lands at index 6*24 + 23 (the last cell).
  expect(cells[6 * 24 + 23]).toEqual({ weekday: 6, hour: 23, count: 5 })
})

test('buildHeatmapCells tolerates a ragged matrix (missing cells → 0)', () => {
  const { cells, max } = buildHeatmapCells([[1]]) // only weekday 0, hour 0
  expect(cells).toHaveLength(7 * 24)
  expect(max).toBe(1)
  expect(cells[0]?.count).toBe(1)
  expect(cells[8]?.count).toBe(0)
})

test('renders each weekday/hour cell with a count label', () => {
  render(<TimingHeatmap matrix={matrixWith([[0, 8, 3]])} />)
  // Monday 08:00 → "Mon 08:00, 3 meals" (weekday 0 = Monday).
  expect(screen.getByLabelText('Mon 08:00, 3 meals')).toBeInTheDocument()
  // A different, empty cell still renders with a zero count.
  expect(screen.getByLabelText('Tue 09:00, 0 meals')).toBeInTheDocument()
})

test('shows a friendly empty state when no meals were logged', () => {
  render(<TimingHeatmap matrix={matrixWith([])} />)
  expect(screen.getByText(/no meals logged in this range/i)).toBeInTheDocument()
  expect(screen.queryByLabelText(/meals$/)).not.toBeInTheDocument()
})
