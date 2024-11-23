import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MealForm } from '../meal-form'
import '@testing-library/jest-dom'

// Mock the CalorieSummary component
jest.mock('../calorie-summary', () => ({
  CalorieSummary: () => null
}))

// Mock timezone
const mockTimeZone = 'UTC'
const mockDateTimeFormat = {
  format: () => '',
  formatToParts: () => [],
  formatRange: () => '',
  formatRangeToParts: () => [],
  resolvedOptions: () => ({ timeZone: mockTimeZone }),
  supportedLocalesOf: () => []
} as unknown as Intl.DateTimeFormat

global.Intl.DateTimeFormat = jest.fn(() => mockDateTimeFormat) as unknown as typeof Intl.DateTimeFormat

describe('MealForm', () => {
  const mockOnMealAdded = jest.fn()
  const user = userEvent.setup()

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
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock fetch for initial cats load
    global.fetch = jest.fn()
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockCats)
      }))
  })

  it('disables submit button when form is incomplete', async () => {
    await act(async () => {
      render(<MealForm onMealAdded={mockOnMealAdded} />)
    })

    const submitButton = screen.getByRole('button', { name: /record meal/i })
    expect(submitButton).toHaveAttribute('disabled')

    // Select a cat but leave other fields empty
    await act(async () => {
      await user.click(screen.getByText('Ahmed'))
    })
    expect(submitButton).toHaveAttribute('disabled')

    // Add food type but leave weight empty
    await act(async () => {
      await user.click(screen.getByText('Wet Food'))
    })
    expect(submitButton).toHaveAttribute('disabled')

    // Add weight of 0 (should still be disabled)
    const input = screen.getByLabelText('Weight (grams)')
    await act(async () => {
      await user.clear(input)
      await user.type(input, '0')
    })
    
    // Wait for next tick to allow React to update
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })
    
    expect(submitButton).toHaveAttribute('disabled')
  })

  it('prevents form submission with invalid weight', async () => {
    await act(async () => {
      render(<MealForm onMealAdded={mockOnMealAdded} />)
    })

    const input = screen.getByLabelText('Weight (grams)') as HTMLInputElement
    
    // Try typing negative number
    await user.clear(input)
    await user.type(input, '-')
    expect(input.value).toBe('')  // Should reject the minus sign
    
    await user.clear(input)
    await user.type(input, '0')
    expect(input.value).toBe('0')

    const submitButton = screen.getByRole('button', { name: /record meal/i })
    expect(submitButton).toHaveAttribute('disabled') // Still disabled because cat and food type not selected
  })

  it('handles failed cats fetch', async () => {
    global.fetch = jest.fn().mockImplementationOnce(() => 
      Promise.reject(new Error('Failed to fetch'))
    )

    await act(async () => {
      render(<MealForm onMealAdded={mockOnMealAdded} />)
    })

    expect(screen.getByText('No cats found. Please add cats in the settings page.')).toBeInTheDocument()
  })

  it('submits form with correct data', async () => {
    global.fetch = jest.fn()
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockCats)
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          id: 1, 
          catId: 1,
          foodType: 'WET',
          weight: 100,
          cat: mockCats[0]
        })
      }))

    await act(async () => {
      render(<MealForm onMealAdded={mockOnMealAdded} />)
    })
    
    // Fill form
    await user.click(screen.getByText('Ahmed'))
    await user.click(screen.getByText('Wet Food'))
    
    const input = screen.getByLabelText('Weight (grams)')
    await user.clear(input)
    await user.type(input, '100')
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /record meal/i })
    expect(submitButton).not.toHaveAttribute('disabled')
    await user.click(submitButton)
    
    expect(global.fetch).toHaveBeenLastCalledWith('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        catId: 1,
        foodType: 'WET',
        weight: 100,
        timezone: 'UTC'
      })
    })
    
    expect(mockOnMealAdded).toHaveBeenCalled()
  })

  it('shows error message when submission fails', async () => {
    global.fetch = jest.fn()
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockCats)
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: false,
        status: 500
      }))

    await act(async () => {
      render(<MealForm onMealAdded={mockOnMealAdded} />)
    })
    
    // Fill and submit form
    await user.click(screen.getByText('Ahmed'))
    await user.click(screen.getByText('Wet Food'))
    
    const input = screen.getByLabelText('Weight (grams)')
    await user.clear(input)
    await user.type(input, '100')
    
    await user.click(screen.getByRole('button', { name: /record meal/i }))
    
    expect(await screen.findByText('Could not save the meal, please try again later!')).toBeInTheDocument()
  })
}) 