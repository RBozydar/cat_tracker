import { render, screen, waitFor } from '@testing-library/react'
import { MealSummary } from '../meal-summary'
import { MealProvider } from '@/contexts/meal-context'
import type { Meal } from '@/lib/types'
import { TZDate } from '@date-fns/tz'
import { toUserLocaleDateString } from '@/lib/date-utils'

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
    const todayISODate = today.toISOString().split('T')[0]
    console.log('Initial date check:', {
      today,
      todayISODate,
      mockMeal: mockMeals[0],
      mealDate: new Date(mockMeals[0].createdAt),
    })

    // Create a response that matches the API format
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve([mockMeals[0]])
    }

    mockFetch.mockResolvedValue(mockResponse)

    render(
      <MealProvider>
        <MealSummary days={1} SkeletonComponent={MockSkeleton} />
      </MealProvider>
    )

    // Wait for loading state to appear and disappear
    await waitFor(() => {
      expect(screen.getByTestId('mock-skeleton')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByTestId('mock-skeleton')).not.toBeInTheDocument()
    })

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
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve([
        {
          ...mockMeals[0],
          createdAt: today.toISOString()
        },
        {
          ...mockMeals[1],
          createdAt: yesterday.toISOString()
        }
      ])
    }

    mockFetch.mockResolvedValue(mockResponse)

    render(
      <MealProvider>
        <MealSummary days={7} SkeletonComponent={MockSkeleton} />
      </MealProvider>
    )

    expect(screen.getByTestId('mock-skeleton')).toBeInTheDocument()

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
    mockFetch.mockReturnValue(new Promise(() => {})) // Never resolves

    render(
      <MealProvider initialMeals={[]} loading={true}>
        <MealSummary days={1} SkeletonComponent={MockSkeleton} />
      </MealProvider>
    )
    
    expect(screen.getByTestId('mock-skeleton')).toBeInTheDocument()
  })

  it('shows empty state for no meals', async () => {
    mockFetch.mockReturnValue(Promise.resolve({
      ok: true,
      json: () => Promise.resolve([])
    }))

    render(
      <MealProvider>
        <MealSummary days={1} SkeletonComponent={MockSkeleton} />
      </MealProvider>
    )

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByTestId('mock-skeleton')).not.toBeInTheDocument()
    })

    expect(screen.getByText(/no meals recorded/i)).toBeInTheDocument()
  })
}) 