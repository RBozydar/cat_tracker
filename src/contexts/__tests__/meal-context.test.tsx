import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MealProvider, useMeals } from '../meal-context'
import { useEffect } from 'react'

// Mock fetch
global.fetch = jest.fn()

// Test component that uses the context
function TestComponent({ onLoad }: { onLoad?: () => void }) {
  const { meals, updateMeal, addMeal, loading } = useMeals()
  
  useEffect(() => {
    if (!loading && onLoad) {
      onLoad()
    }
  }, [loading, onLoad])

  if (loading) return <div>Loading...</div>
  
  return (
    <div>
      <div data-testid="meal-count">{meals.length}</div>
      <button 
        onClick={() => updateMeal({
          ...meals[0],
          weight: 200
        })}
      >
        Update Meal
      </button>
      <button
        onClick={() => addMeal({
          id: 2,
          catId: 1,
          cat: mockCats[0],
          foodType: 'WET',
          weight: 150,
          createdAt: new Date().toISOString()
        })}
      >
        Add Meal
      </button>
    </div>
  )
}

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

const mockMeals = [
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
    
    // Check loading state
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    
    // Wait for loading to complete and check final state
    await screen.findByTestId('meal-count')
    expect(screen.getByTestId('meal-count')).toHaveTextContent('1')
  })

  it('updates meals correctly', async () => {
    render(
      <MealProvider>
        <TestComponent />
      </MealProvider>
    )
    
    // Wait for loading to complete
    const addButton = await screen.findByText('Add Meal')
    await user.click(addButton)
    
    // Check meal count after adding
    expect(screen.getByTestId('meal-count')).toHaveTextContent('2')
    
    // Update meal
    const updateButton = screen.getByText('Update Meal')
    await user.click(updateButton)
    
    // Check meal count hasn't changed after update
    expect(screen.getByTestId('meal-count')).toHaveTextContent('2')
  })

  it('handles fetch errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'))

    render(
      <MealProvider>
        <TestComponent />
      </MealProvider>
    )
    
    // Check loading state
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    
    // Wait for error handling to complete
    await screen.findByTestId('meal-count')
    
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
}) 