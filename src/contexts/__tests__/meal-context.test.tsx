import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MealProvider, useMeals } from '../meal-context'
import { useEffect } from 'react'
import type { Meal } from '@/lib/types'

// Mock fetch
global.fetch = jest.fn()

// Test component that uses the context
function TestComponent() {
  const { meals, loading, fetchMeals, addMeal, updateMeal } = useMeals()
  
  useEffect(() => {
    fetchMeals({
      startDate: new Date().toISOString(),
      timezone: 'UTC'
    })
  }, [fetchMeals])

  const handleAddMeal = () => {
    const newMeal: Meal = {
      id: 2,
      catId: 1,
      cat: mockCats[0],
      foodType: 'WET',
      weight: 100,
      createdAt: new Date().toISOString()
    }
    addMeal(newMeal)
  }

  const handleUpdateMeal = () => {
    const updatedMeal: Meal = {
      ...mockMeals[0],
      weight: 200
    }
    updateMeal(updatedMeal)
  }

  if (loading) return <div>Loading...</div>
  
  return (
    <div>
      <div data-testid="meal-count">{meals?.length ?? 0}</div>
      <button onClick={handleAddMeal}>Add Meal</button>
      <button onClick={handleUpdateMeal}>Update Meal</button>
    </div>
  )
}

const mockCats = [
  { 
    id: 1, 
    name: 'Ahmed',
    wetFoodId: 1,
    dryFoodId: 2,
    wetFood: { id: 1, name: 'Wet Food', foodType: 'WET' as const, calories: 100 },
    dryFood: { id: 2, name: 'Dry Food', foodType: 'DRY' as const, calories: 300 },
    targetCalories: 250,
    weight: 4.5,
    weightUnit: 'kg'
  }
]

const mockMeals: Meal[] = [
  {
    id: 1,
    catId: 1,
    cat: mockCats[0],
    foodType: 'WET',
    weight: 100,
    createdAt: new Date().toISOString()
  }
]

describe('MealContext', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockMeals)
      })
    )
  })

  it('provides meals data and loading state', async () => {
    render(
      <MealProvider>
        <TestComponent />
      </MealProvider>
    )
    
    // Initial loading state
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('meal-count')).toHaveTextContent('1')
    })
  })

  it('updates meals correctly', async () => {
    render(
      <MealProvider>
        <TestComponent />
      </MealProvider>
    )

    // Wait for initial data to load
    await waitFor(() => {
      expect(screen.getByTestId('meal-count')).toHaveTextContent('1')
    })
    
    // Add meal
    await user.click(screen.getByText('Add Meal'))
    expect(screen.getByTestId('meal-count')).toHaveTextContent('2')
    
    // Update meal
    await user.click(screen.getByText('Update Meal'))
    expect(screen.getByTestId('meal-count')).toHaveTextContent('2')
  })

  it('handles fetch errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    // Mock fetch to return error response
    ;(global.fetch as jest.Mock).mockImplementationOnce(() => 
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: 'Server error' })
      })
    )

    render(
      <MealProvider>
        <TestComponent />
      </MealProvider>
    )

    // Wait for loading state
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    // Wait for error to be logged
    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Error fetching meals:',
        expect.any(Error)
      )
    })
    
    // Verify error was logged and cleanup
    consoleError.mockRestore()
  })
}) 