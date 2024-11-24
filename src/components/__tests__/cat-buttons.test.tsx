import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CatButtons } from '../cat-buttons'

// Mock fetch
global.fetch = jest.fn()

describe('CatButtons', () => {
  const user = userEvent.setup()
  const mockOnChange = jest.fn()

  const mockCats = [
    { 
      id: 1, 
      name: 'Ahmed',
      wetFoodId: 1,
      dryFoodId: 2,
      wetFood: { id: 1, name: 'Wet Food', foodType: 'WET', calories: 100 },
      dryFood: { id: 2, name: 'Dry Food', foodType: 'DRY', calories: 300 },
      targetCalories: 250,
      weight: 4.5,
      weightUnit: 'kg'
    },
    { 
      id: 2, 
      name: 'Knypson',
      wetFoodId: 1,
      dryFoodId: 2,
      wetFood: { id: 1, name: 'Wet Food', foodType: 'WET', calories: 100 },
      dryFood: { id: 2, name: 'Dry Food', foodType: 'DRY', calories: 300 },
      targetCalories: 220,
      weight: 3.8,
      weightUnit: 'kg'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCats)
    })
  })

  it('renders buttons for each cat', async () => {
    await act(async () => {
      render(<CatButtons onChange={mockOnChange} />)
    })

    expect(screen.getByRole('button', { name: 'Ahmed' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Knypson' })).toBeInTheDocument()
  })

  it('shows "All Cats" button when includeAll is true', async () => {
    await act(async () => {
      render(<CatButtons onChange={mockOnChange} includeAll />)
    })

    expect(screen.getByRole('button', { name: 'All Cats' })).toBeInTheDocument()
  })

  it('calls onChange with correct value when clicked', async () => {
    await act(async () => {
      render(<CatButtons onChange={mockOnChange} />)
    })

    await user.click(screen.getByRole('button', { name: 'Ahmed' }))
    expect(mockOnChange).toHaveBeenCalledWith(1)
  })

  it('shows error message when no cats are found', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([])
    })

    await act(async () => {
      render(<CatButtons onChange={mockOnChange} />)
    })

    expect(screen.getByText('No cats found. Please add cats in settings.')).toBeInTheDocument()
  })

  it('handles fetch error gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'))

    await act(async () => {
      render(<CatButtons onChange={mockOnChange} />)
    })

    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('applies correct variant to selected button', async () => {
    await act(async () => {
      render(<CatButtons onChange={mockOnChange} value={1} />)
    })

    const selectedButton = screen.getByRole('button', { name: 'Ahmed' })
    const unselectedButton = screen.getByRole('button', { name: 'Knypson' })

    expect(selectedButton).toHaveClass('bg-primary')
    expect(unselectedButton).not.toHaveClass('bg-primary')
  })
}) 