import { render, screen, waitFor } from '@testing-library/react'
import { MealSummary } from '../meal-summary'
import { MealProvider, useMeals } from '@/contexts/meal-context'
import type { Meal } from '@/lib/types'
import { TZDate } from '@date-fns/tz'

// Mock components
jest.mock('../calorie-summary', () => ({
  CalorieSummary: ({ selectedCatId, date }: { selectedCatId: number, date: string }) => {
    console.log('Mock CalorieSummary rendered:', { selectedCatId, date })
    return (
      <div data-testid={`calorie-summary-${selectedCatId}-${date}`}>
        Calorie Summary for Cat {selectedCatId} on {date}
      </div>
    )
  }
}))

const MockSkeleton = () => <div data-testid="mock-skeleton">Loading...</div>

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock timezone
const mockTimezone = 'UTC'
jest.mock('@/lib/date-utils', () => {
  const actual = jest.requireActual('@/lib/date-utils')
  return {
    ...actual,
    getUserTimezone: () => mockTimezone,
    getUserLocale: () => 'en-US'
  }
})

// Mock the useMeals hook
jest.mock('@/contexts/meal-context', () => {
  const actual = jest.requireActual('@/contexts/meal-context')
  return {
    ...actual,
    useMeals: jest.fn()
  }
})

describe('MealSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Set a fixed date for all tests
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-11-28T12:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  const today = TZDate.tz(mockTimezone, new Date('2024-11-28T12:00:00Z'))
  const yesterday = TZDate.tz(mockTimezone, new Date('2024-11-27T12:00:00Z'))
  
  const mockMeals: Meal[] = [
    {
      id: 1,
      catId: 1,
      cat: {
        id: 1,
        name: 'Ahmed',
        wetFoodId: 1,
        dryFoodId: 2,
        wetFood: { 
          id: 1, 
          name: 'Wet Food',
          foodType: 'WET',
          calories: 100 
        },
        dryFood: { 
          id: 2, 
          name: 'Dry Food',
          foodType: 'DRY',
          calories: 300 
        },
        targetCalories: 250,
        weight: 4.5,
        weightUnit: 'kg'
      },
      foodType: 'WET',
      weight: 100,
      createdAt: today.toISOString()
    },
    {
      id: 2,
      catId: 2,
      cat: {
        id: 2,
        name: 'Luna',
        wetFoodId: 1,
        dryFoodId: 2,
        wetFood: { 
          id: 1, 
          name: 'Wet Food',
          foodType: 'WET',
          calories: 100 
        },
        dryFood: { 
          id: 2, 
          name: 'Dry Food',
          foodType: 'DRY',
          calories: 300 
        },
        targetCalories: 250,
        weight: 4.0,
        weightUnit: 'kg'
      },
      foodType: 'DRY',
      weight: 50,
      createdAt: yesterday.toISOString()
    }
  ]

  it('renders daily summary correctly', async () => {
    const todayISODate = today.toISOString().split('T')[0];

    // Mock useMeals hook
    (useMeals as jest.Mock).mockReturnValue({
      meals: [mockMeals[0]],
      loading: false,
      error: null,
      fetchMeals: jest.fn(),
      refetch: jest.fn(),
      addMeal: jest.fn(),
      updateMeal: jest.fn(),
      deleteMeal: jest.fn()
    })

    render(
      <MealProvider>
        <MealSummary days={1} SkeletonComponent={MockSkeleton} />
      </MealProvider>
    )

    // Wait for meals to be processed and rendered
    await waitFor(() => {
      const html = document.body.innerHTML
      console.log('Current HTML:', html)
      const element = screen.getByTestId(`calorie-summary-1-${todayISODate}`)
      console.log('Found element:', element)
      expect(element).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('renders weekly summary correctly', async () => {
    // Mock useMeals hook
    (useMeals as jest.Mock).mockReturnValue({
      meals: mockMeals,
      loading: false,
      error: null,
      fetchMeals: jest.fn(),
      refetch: jest.fn(),
      addMeal: jest.fn(),
      updateMeal: jest.fn(),
      deleteMeal: jest.fn()
    })

    render(
      <MealProvider>
        <MealSummary days={7} SkeletonComponent={MockSkeleton} />
      </MealProvider>
    )

    const todayISODate = today.toISOString().split('T')[0]
    const yesterdayISODate = yesterday.toISOString().split('T')[0]

    await waitFor(() => {
      const html = document.body.innerHTML
      console.log('Current HTML:', html)
      console.log('Looking for:', {
        today: `calorie-summary-1-${todayISODate}`,
        yesterday: `calorie-summary-2-${yesterdayISODate}`
      })
      expect(screen.getByText('Last 7 Days Summary')).toBeInTheDocument()
      expect(screen.getByTestId(`calorie-summary-1-${todayISODate}`)).toBeInTheDocument()
      expect(screen.getByTestId(`calorie-summary-2-${yesterdayISODate}`)).toBeInTheDocument()
    }, { timeout: 1000 })
  })

  it('shows loading state', () => {
    // Mock useMeals hook
    (useMeals as jest.Mock).mockReturnValue({
      meals: [],
      loading: true,
      error: null,
      fetchMeals: jest.fn(),
      refetch: jest.fn(),
      addMeal: jest.fn(),
      updateMeal: jest.fn(),
      deleteMeal: jest.fn()
    })

    render(
      <MealProvider>
        <MealSummary days={1} SkeletonComponent={MockSkeleton} />
      </MealProvider>
    )
    
    expect(screen.getByTestId('mock-skeleton')).toBeInTheDocument()
  })

  it('shows empty state for no meals', async () => {
    // Mock useMeals hook
    (useMeals as jest.Mock).mockReturnValue({
      meals: [],
      loading: false,
      error: null,
      fetchMeals: jest.fn(),
      refetch: jest.fn(),
      addMeal: jest.fn(),
      updateMeal: jest.fn(),
      deleteMeal: jest.fn()
    })

    render(
      <MealProvider>
        <MealSummary days={1} SkeletonComponent={MockSkeleton} />
      </MealProvider>
    )

    expect(screen.getByText(/no meals recorded/i)).toBeInTheDocument()
  })
}) 