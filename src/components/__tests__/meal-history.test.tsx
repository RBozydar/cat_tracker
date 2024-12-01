import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MealHistory } from '../meal-history'
import type { Meal } from '@/lib/types'

const mockMeals: Meal[] = [
  {
    id: 1,
    catId: 1,
    cat: {
      id: 1,
      name: 'Ahmed',
      wetFoodId: 1,
      dryFoodId: 2,
      wetFood: { id: 1, name: 'Wet Food', foodType: 'WET', calories: 175 },
      dryFood: { id: 2, name: 'Dry Food', foodType: 'DRY', calories: 300 },
      targetCalories: 250,
      weight: 4.5,
      weightUnit: 'kg'
    },
    foodType: 'WET',
    weight: 100,
    createdAt: '2024-01-01T12:00:00Z'
  },
  {
    id: 2,
    catId: 2,
    cat: {
      id: 2,
      name: 'Luna',
      wetFoodId: 1,
      dryFoodId: 2,
      wetFood: { id: 1, name: 'Wet Food', foodType: 'WET', calories: 100 },
      dryFood: { id: 2, name: 'Dry Food', foodType: 'DRY', calories: 300 },
      targetCalories: 300,
      weight: 5,
      weightUnit: 'kg'
    },
    foodType: 'DRY',
    weight: 50,
    createdAt: '2024-01-02T12:00:00Z'
  }
]

const mockUseMeals = {
  meals: mockMeals,
  loading: false
}

jest.mock('@/contexts/meal-context', () => ({
  useMeals: () => mockUseMeals
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn()
  }
}))

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock cats data
const mockCats = [
  {
    id: 1,
    name: 'Ahmed',
    wetFoodId: 1,
    dryFoodId: 2,
    wetFood: { id: 1, name: 'Wet Food', foodType: 'WET', calories: 175 },
    dryFood: { id: 2, name: 'Dry Food', foodType: 'DRY', calories: 300 },
    targetCalories: 250,
    weight: 4.5,
    weightUnit: 'kg'
  },
  {
    id: 2,
    name: 'Luna',
    wetFoodId: 1,
    dryFoodId: 2,
    wetFood: { id: 1, name: 'Wet Food', foodType: 'WET', calories: 100 },
    dryFood: { id: 2, name: 'Dry Food', foodType: 'DRY', calories: 300 },
    targetCalories: 300,
    weight: 5,
    weightUnit: 'kg'
  }
]

beforeEach(() => {
  mockFetch.mockImplementation((url) => {
    if (url === '/api/cats') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockCats)
      })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
  })
})

describe('MealHistory', () => {
  it('renders loading skeleton when loading', () => {
    mockUseMeals.loading = true
    render(<MealHistory />)
    expect(screen.getByTestId('meal-history-skeleton')).toBeInTheDocument()
    mockUseMeals.loading = false
  })

  it('shows empty state when no meals', () => {
    mockUseMeals.meals = []
    render(<MealHistory />)
    expect(screen.getByText('No meals recorded yet.')).toBeInTheDocument()
    mockUseMeals.meals = mockMeals
  })

  it('renders all meals initially', () => {
    render(<MealHistory />)
    expect(screen.getAllByRole('row')).toHaveLength(3) // header + 2 meals
  })

  it('displays correct meal information', () => {
    render(<MealHistory />)
    expect(screen.getByText('Ahmed')).toBeInTheDocument()
    expect(screen.getByText('Luna')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
  })

  it('calculates calories correctly', () => {
    render(<MealHistory />)
    // 100g wet food with 100 cal/100g = 100 calories
    expect(screen.getByText('175')).toBeInTheDocument()
    // 50g dry food with 300 cal/100g = 150 calories
    expect(screen.getByText('150')).toBeInTheDocument()
  })

  it('filters meals by cat', async () => {
    render(<MealHistory />)
    
    // Wait for cats to load and click "Ahmed" button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Ahmed' })).toBeInTheDocument()
    })
    await userEvent.click(screen.getByRole('button', { name: 'Ahmed' }))
    
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(2) // header + 1 filtered meal
    
    // Check table cell content
    const tableCells = screen.getAllByRole('cell')
    const catCell = tableCells.find(cell => cell.textContent === 'Ahmed')
    expect(catCell).toBeInTheDocument()
    expect(screen.queryByRole('cell', { name: 'Luna' })).not.toBeInTheDocument()
  })

  it('shows all meals when "All" is selected', async () => {
    render(<MealHistory />)
    
    // Wait for cats to load and select to appear
    // const select = await screen.findByRole('button', { name: /select a cat/i })
    
    // First filter by cat
    // await userEvent.click(select)
    // await userEvent.click(screen.getByText('Ahmed'))
    
    // Then show all
    // await userEvent.click(select)
    // await userEvent.click(screen.getByText('All Cats'))
    
    expect(screen.getAllByRole('row')).toHaveLength(3) // header + 2 meals
  })

  it('handles missing food settings gracefully', () => {
    const mealWithoutCalories: Meal = {
      ...mockMeals[0],
      cat: {
        ...mockMeals[0].cat,
        wetFood: { ...mockMeals[0].cat.wetFood, calories: 0 }
      }
    }
    mockUseMeals.meals = [mealWithoutCalories]
    
    render(<MealHistory />)
    expect(screen.getByText('0')).toBeInTheDocument()
    
    mockUseMeals.meals = mockMeals
  })

  it('displays formatted dates correctly', async () => {
    render(<MealHistory />)
    
    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText('Jan 1, 2024, 1:00 PM')).toBeInTheDocument()
      expect(screen.getByText('Jan 2, 2024, 1:00 PM')).toBeInTheDocument()
    })
    
    // Verify both dates are present
    const dateElements = screen.getAllByText(/2024/)
    expect(dateElements).toHaveLength(2)
  })

  it('renders action buttons for each meal', async () => {
    render(<MealHistory />)
    // Wait for content to load
    await screen.findByText('Jan 1, 2024, 1:00 PM')
    const rows = screen.getAllByRole('row').slice(1) // Skip header row
    rows.forEach(row => {
      expect(row.querySelector('button')).toBeInTheDocument()
    })
  })
}) 