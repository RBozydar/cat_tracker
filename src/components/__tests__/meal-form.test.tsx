import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MealFormWrapper } from '../meal-form'
import { ResponsiveCatSelectorProps } from '../responsive-cat-selector'
import '@testing-library/jest-dom'

// Mock the CalorieSummary component
jest.mock('../calorie-summary', () => ({
  CalorieSummary: () => null
}))

// Mock MealFormCalorieSummary component
jest.mock('../meal-form-calorie-summary', () => ({
  MealFormCalorieSummary: () => null
}))

// Mock date-utils
jest.mock('@/lib/date-utils', () => ({
  getUserTimezone: () => 'Europe/London'
}))

const mockAddMeal = jest.fn()

// Mock MealContext
jest.mock('@/contexts/meal-context', () => ({
  useMeals: () => ({
    addMeal: mockAddMeal,
    loading: false
  })
}))

// Mock ResponsiveCatSelector with proper types
jest.mock('../responsive-cat-selector', () => ({
  ResponsiveCatSelector: ({ onChange }: Pick<ResponsiveCatSelectorProps, 'onChange'>) => (
    <div>
      <button onClick={() => onChange(1)}>Ahmed</button>
    </div>
  )
}))

// Mock ErrorAlert component
jest.mock('../error-alert', () => ({
  ErrorAlert: ({ description }: { description: string }) => (
    <div role="alert">{description}</div>
  )
}))

describe('MealFormWrapper', () => {
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
      render(<MealFormWrapper />)
    })

    // Find submit button and verify initial state
    const submitButton = screen.getByRole('button', { name: /record meal/i })
    expect(submitButton).toBeDisabled()

    // Select a cat
    await act(async () => {
      await user.click(screen.getByText('Ahmed'))
    })
    expect(submitButton).toBeDisabled()

    // Add food type
    await act(async () => {
      await user.click(screen.getByText('Wet Food'))
    })
    expect(submitButton).toBeDisabled()

    // Add weight
    const input = screen.getByLabelText('Weight (grams)')
    await act(async () => {
      await user.clear(input)
      await user.type(input, '0')
    })
    
    // Button should still be disabled with weight of 0
    expect(submitButton).toBeDisabled()
  })

  it('handles failed cats fetch', async () => {
    // Mock the fetch to fail
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('Failed to fetch'))

    await act(async () => {
      render(<MealFormWrapper />)
    })

    // Wait for error state to be set
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })
    
    // Check for error message
    expect(screen.getByText('No cats found. Please add cats in settings.')).toBeInTheDocument()
  })

  it('submits form with correct data and timezone', async () => {
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
      render(<MealFormWrapper />)
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
    
    // Check that timezone was included in the request
    expect(global.fetch).toHaveBeenLastCalledWith('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        catId: 1,
        foodType: 'WET',
        weight: 100,
        timezone: 'Europe/London'  // Using mocked timezone
      })
    })
    
    expect(mockAddMeal).toHaveBeenCalled()
  })

  it('shows error message when submission fails', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500
      })

    render(<MealFormWrapper />)
    
    // Fill and submit form
    await user.click(screen.getByText('Ahmed'))
    await user.click(screen.getByText('Wet Food'))
    await user.type(screen.getByLabelText('Weight (grams)'), '100')
    await user.click(screen.getByRole('button', { name: /record meal/i }))
    
    const errorAlert = await screen.findByRole('alert')
    expect(errorAlert).toHaveTextContent('Could not save the meal, please try again later!')
  })
}) 