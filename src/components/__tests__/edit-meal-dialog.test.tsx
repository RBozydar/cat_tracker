import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditMealDialog } from '../edit-meal-dialog'
import type { Meal } from '@/lib/types'
import { formatDateTime } from '@/lib/date-utils'
import { logger } from '@/lib/logger'
const mockUpdateMeal = jest.fn()
const mockDeleteMeal = jest.fn()

// Mock fetch globally
global.fetch = jest.fn()

jest.mock('@/contexts/meal-context', () => ({
  useMeals: () => ({
    updateMeal: mockUpdateMeal,
    deleteMeal: mockDeleteMeal
  })
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn()
  }
}))

// Mock fetch responses
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

const mockMeal: Meal = {
  id: 1,
  catId: 1,
  foodType: 'WET',
  weight: 100,
  createdAt: new Date().toISOString(),
  cat: {
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
}

// Mock timezone
const mockTimezone = 'UTC'
jest.mock('@/lib/date-utils', () => {
  const actual = jest.requireActual('@/lib/date-utils')
  return {
    ...actual,
    getUserTimezone: () => mockTimezone,
    formatDateTime: jest.fn(),
    TZDate: {
      tz: (timezone: string, date?: Date) => {
        if (!date) return new Date()
        const newDate = new Date(date)
        // Preserve UTC time
        return newDate
      }
    }
  }
})

// Mock console.error to suppress act() warnings
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' && 
      (args[0].includes('Warning: An update to') || 
       args[0].includes('Warning: The current testing environment'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Mock the Calendar component
jest.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onSelect }: { onSelect: (date: Date) => void }) => (
    <div data-testid="mock-calendar">
      <button
        onClick={() => {
          console.log('Selecting new date in mock calendar')
          const newDate = new Date(Date.UTC(2024, 10, 28, 12, 0, 0))
          onSelect(newDate)
        }}
        aria-label="thursday, november 28th, 2024"
      >
        28
      </button>
    </div>
  )
}))

describe('EditMealDialog', () => {
  const user = userEvent.setup({ delay: null })

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock fetch to return cats data for CatSelect component
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('/api/cats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCats)
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockMeal)
      })
    })
    
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-11-27T12:00:00Z'))
  })

  afterEach(async () => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
    // Wait for any pending state updates
    await waitFor(() => {})
  })

  it('disables submit button when form is incomplete', async () => {
    render(<EditMealDialog meal={mockMeal} />)
    
    // Open dialog and wait for it to be ready
    await user.click(screen.getByRole('button', { name: /edit meal/i }))
    
    // Wait for cats data to load and form to be ready
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Verify initial state
    const submitButton = screen.getByRole('button', { name: /save changes/i })
    expect(submitButton).toBeEnabled() // Should be enabled initially
    
    // Clear weight input
    const weightInput = screen.getByLabelText(/weight/i)
    await user.clear(weightInput)
    await user.type(weightInput, '0')
    
    // Verify button is disabled
    await waitFor(() => {
      expect(submitButton).toBeDisabled()
    })
  })

  it('shows loading state while submitting', async () => {
    // Mock fetch to be slow to show loading state
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('/api/cats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCats)
        })
      }
      // Make the meal update slow
      return new Promise(resolve => 
        setTimeout(() => 
          resolve({ 
            ok: true, 
            json: () => Promise.resolve(mockMeal) 
          }), 
        100)
      )
    })

    render(<EditMealDialog meal={mockMeal} />)
    
    await user.click(screen.getByRole('button', { name: /edit meal/i }))
    
    // Wait for dialog to be ready
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    
    // Click save and check for loading state
    const saveButton = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveButton)
    
    // Check for loading state
    expect(saveButton).toHaveTextContent(/saving/i)
  })

  it('updates meal with new values when submitted', async () => {
    render(<EditMealDialog meal={mockMeal} />)
    
    // Open dialog
    await user.click(screen.getByRole('button', { name: /edit meal/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    
    // Change food type
    await user.click(screen.getByRole('button', { name: 'DRY' }))
    
    // Change weight
    const weightInput = screen.getByLabelText(/weight/i)
    await user.clear(weightInput)
    await user.type(weightInput, '150')
    
    // Submit form and wait for completion
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(`/api/meals/${mockMeal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"foodType":"DRY","weight":150')
      })
    })

    await waitFor(() => {
      expect(mockUpdateMeal).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('handles submission errors gracefully', async () => {
    const mockLoggerError = jest.fn()
    jest.spyOn(logger, 'error').mockImplementation(mockLoggerError)
    
    // Mock fetch to return an error response
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('/api/cats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCats)
        })
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to update' })
      })
    })

    render(<EditMealDialog meal={mockMeal} />)
    
    // Open dialog
    await user.click(screen.getByRole('button', { name: /edit meal/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    
    // Submit form and wait for error handling
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    
    await waitFor(() => {
      expect(mockLoggerError).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('updates date when calendar is used', async () => {
    // Mock fetch responses
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('/api/cats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCats)
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockMeal)
      })
    })

    // Set up initial date with explicit UTC time
    const initialDate = new Date(Date.UTC(2024, 10, 27, 12, 0, 0))
    jest.setSystemTime(initialDate)
    const mockFormattedDate = 'Nov 27, 2024, 12:00 PM'
    ;(formatDateTime as jest.Mock).mockReturnValue(mockFormattedDate)

    // Create meal with specific UTC date
    const testMeal = {
      ...mockMeal,
      createdAt: initialDate.toISOString()
    }

    render(<EditMealDialog meal={testMeal} />)
    
    // Open dialog
    await user.click(screen.getByRole('button', { name: /edit meal/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    
    // Find and click the date picker button
    const datePickerButton = screen.getByRole('button', { name: mockFormattedDate })
    await user.click(datePickerButton)
    
    // Find and click tomorrow's date in our mock calendar
    const tomorrowButton = screen.getByRole('button', {
      name: /thursday, november 28th, 2024/i
    })
    await user.click(tomorrowButton)
    
    // Mock the formatted date for the new selection
    ;(formatDateTime as jest.Mock).mockReturnValue('Nov 28, 2024, 12:00 PM')
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /save changes/i })
    await user.click(submitButton)
    
    // Verify the API call
    await waitFor(() => {
      const lastCall = (global.fetch as jest.Mock).mock.calls.slice(-1)[0]
      expect(lastCall[0]).toBe(`/api/meals/${mockMeal.id}`)
      expect(lastCall[1].method).toBe('PATCH')
      
      const requestBody = JSON.parse(lastCall[1].body)
      console.log('Request body date:', requestBody.createdAt)
      const date = new Date(requestBody.createdAt)
      expect(date.getUTCDate()).toBe(28)
      expect(date.getUTCMonth()).toBe(10) // November is 10 in zero-based months
      expect(date.getUTCFullYear()).toBe(2024)
    })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('closes dialog when cancel is clicked', async () => {
    render(<EditMealDialog meal={mockMeal} />)
    
    await user.click(screen.getByRole('button', { name: /edit meal/i }))
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('preserves initial values when reopening dialog', async () => {
    render(<EditMealDialog meal={mockMeal} />)
    
    // Open dialog, make changes, then cancel
    await user.click(screen.getByRole('button', { name: /edit meal/i }))
    
    const weightInput = screen.getByLabelText(/weight/i)
    await user.clear(weightInput)
    await user.type(weightInput, '999')
    
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    
    // Reopen dialog and check values
    await user.click(screen.getByRole('button', { name: /edit meal/i }))
    
    // Wait for form to reset and verify initial value
    await waitFor(() => {
      const newWeightInput = screen.getByLabelText(/weight/i)
      expect(newWeightInput).toHaveValue(mockMeal.weight)
    })
  })

  // it('updates meal with new time when hour and minute are changed', async () => {
  //   render(<EditMealDialog meal={mockMeal} />)
    
  //   // Open dialog
  //   await user.click(screen.getByRole('button', { name: /edit meal/i }))
  //   await waitFor(() => {
  //     expect(screen.getByRole('dialog')).toBeInTheDocument()
  //   })
    
  //   // Find the Select triggers and click them
  //   const hourTrigger = screen.getByRole('combobox', { name: /hour/i })
  //   const minuteTrigger = screen.getByRole('combobox', { name: /minute/i })
    
  //   // Click triggers to open selects
  //   await user.click(hourTrigger)
  //   await user.click(screen.getByRole('option', { name: '15' }))
    
  //   await user.click(minuteTrigger)
  //   await user.click(screen.getByRole('option', { name: '30' }))
    
  //   // Submit form
  //   await user.click(screen.getByRole('button', { name: /save changes/i }))
    
  //   // Verify the API call includes the new time
  //   await waitFor(() => {
  //     const fetchCall = (global.fetch as jest.Mock).mock.calls.find(
  //       call => call[0] === `/api/meals/${mockMeal.id}`
  //     )
  //     expect(fetchCall).toBeDefined()
  //     const body = JSON.parse(fetchCall[1].body)
  //     const date = new Date(body.createdAt)
  //     expect(date.getUTCHours()).toBe(15)
  //     expect(date.getUTCMinutes()).toBe(30)
  //   })
  // })

  it('preserves time when only date is changed', async () => {
    const initialDate = new Date('2024-01-01T14:30:00Z')
    const mealWithTime = {
      ...mockMeal,
      createdAt: initialDate.toISOString()
    }
    
    render(<EditMealDialog meal={mealWithTime} />)
    
    // Open dialog
    await user.click(screen.getByRole('button', { name: /edit meal/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    
    // Find the date button and click it
    const dateButton = screen.getByRole('button', { name: new RegExp(formatDateTime(initialDate, mockTimezone), 'i') })
    await user.click(dateButton)
    
    // Find the mock calendar and trigger date selection
    const calendarSelect = screen.getByTestId('mock-calendar')
    const selectButton = within(calendarSelect).getByRole('button')
    await user.click(selectButton)
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    
    // Verify the API call preserves the original time
    await waitFor(() => {
      const fetchCall = (global.fetch as jest.Mock).mock.calls.find(
        call => call[0] === `/api/meals/${mockMeal.id}`
      )
      expect(fetchCall).toBeDefined()
      const body = JSON.parse(fetchCall[1].body)
      const date = new Date(body.createdAt)
      expect(date.getUTCHours()).toBe(14)
      expect(date.getUTCMinutes()).toBe(30)
    })
  })
}) 