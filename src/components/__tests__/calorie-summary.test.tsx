import { render, screen } from '@testing-library/react'
import { CalorieSummary } from '../calorie-summary'
import type { Meal } from '@/lib/types'
import type { Mock } from 'jest-mock'

// Mock the queries hook
const mockUseCat = jest.fn() as Mock
jest.mock('@/lib/queries', () => ({
  useCat: () => mockUseCat()
}))

// Mock the meal context
const mockUseMeals = jest.fn() as Mock
jest.mock('@/contexts/meal-context', () => ({
  useMeals: () => mockUseMeals()
}))

// Mock date utils to ensure consistent testing
const mockIsSameDay = jest.fn() as Mock
const mockGetUserTimezone = jest.fn() as Mock
jest.mock('@/lib/date-utils', () => ({
  isSameDay: (...args: unknown[]) => mockIsSameDay(...args),
  getUserTimezone: () => mockGetUserTimezone()
}))

const mockCat = {
  id: 1,
  name: 'Test Cat',
  wetFoodId: 1,
  dryFoodId: 2,
  wetFood: { id: 1, name: 'Wet Food', foodType: 'WET', calories: 100 },
  dryFood: { id: 2, name: 'Dry Food', foodType: 'DRY', calories: 300 },
  targetCalories: 250,
  weight: 4.5,
  weightUnit: 'kg'
}

const mockMeals: Meal[] = [
  {
    id: 1,
    catId: 1,
    foodType: 'WET' as const,
    weight: 100,
    createdAt: new Date().toISOString(),
    cat: mockCat
  },
  {
    id: 2,
    catId: 1,
    foodType: 'DRY' as const,
    weight: 50,
    createdAt: new Date().toISOString(),
    cat: mockCat
  }
]

describe('CalorieSummary', () => {
  beforeEach(() => {
    // Clear all mocks
    mockUseCat.mockReset();
    mockUseMeals.mockReset();
    mockIsSameDay.mockReset();
    mockGetUserTimezone.mockReset();
    
    // Setup default mocks
    mockUseCat.mockReturnValue({
      data: mockCat,
      isLoading: false
    });
    mockUseMeals.mockReturnValue({
      meals: mockMeals
    });
    mockIsSameDay.mockReturnValue(true);
    mockGetUserTimezone.mockReturnValue('UTC');
  })

  it('renders loading skeleton when cat data is loading', () => {
    mockUseCat.mockReturnValue({
      data: null,
      isLoading: true
    })

    render(<CalorieSummary selectedCatId={1} />)
    expect(screen.getByTestId('calorie-summary-skeleton')).toBeInTheDocument()
  })

  it('renders nothing when cat data is not found', () => {
    mockUseCat.mockReturnValue({
      data: null,
      isLoading: false
    })

    const { container } = render(<CalorieSummary selectedCatId={1} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('calculates and displays correct calorie information', () => {
    render(<CalorieSummary selectedCatId={1} />)

    // Target calories
    expect(screen.getByText((content, element) => 
      element?.tagName.toLowerCase() === 'span' && 
      content.includes('250') && 
      content.includes('kcal') &&
      element.previousSibling?.textContent === 'Target:'
    )).toBeInTheDocument()

    // Consumed calories
    expect(screen.getByText((content, element) => 
      element?.tagName.toLowerCase() === 'span' && 
      content.includes('250') && 
      content.includes('kcal') &&
      element.previousSibling?.textContent === 'Consumed:'
    )).toBeInTheDocument()

    // Status text
    expect(screen.getByText((content) => content.includes('0 left'))).toBeInTheDocument()
  })

  it('shows over target status when calories exceeded', () => {
    const extraMeal: Meal = {
      id: 3,
      catId: 1,
      foodType: 'WET',
      weight: 100,
      createdAt: new Date().toISOString(),
      cat: mockCat
    }
    
    mockUseMeals.mockReturnValue({
      meals: [...mockMeals, extraMeal]
    })

    render(<CalorieSummary selectedCatId={1} />)
    expect(screen.getByText(/100 over target/)).toBeInTheDocument()
  })

  it('hides title when hideTitle prop is true', () => {
    render(<CalorieSummary selectedCatId={1} hideTitle />)
    expect(screen.queryByText(mockCat.name)).not.toBeInTheDocument()
  })

  it('filters meals for specific date when date prop is provided', () => {
    const specificDate = '2023/11/28'
    render(<CalorieSummary selectedCatId={1} date={specificDate} />)
    
    // Verify that the date was parsed and used correctly
    expect(mockIsSameDay).toHaveBeenCalled()
  })

  it('handles empty meals array', () => {
    mockUseMeals.mockReturnValue({
      meals: []
    })

    render(<CalorieSummary selectedCatId={1} />)
    expect(screen.getByText((content) => content.includes('0 kcal') && content.includes('250 left'))).toBeInTheDocument()
  })

  it('handles null meals value', () => {
    mockUseMeals.mockReturnValue({
      meals: null
    })

    render(<CalorieSummary selectedCatId={1} />)
    expect(screen.getByText((content) => content.includes('0 kcal') && content.includes('250 left'))).toBeInTheDocument()
  })
}) 