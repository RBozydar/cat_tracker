import { render, screen } from '@testing-library/react'
import { PetComparison } from '../pet-comparison'
import type { Cat, FoodSetting } from '@/lib/types'
import { useMeals } from '@/contexts/meal-context'

interface ComparisonData {
  name: string
  average: number
  target: number
  adherence: number
}

// Mock recharts components
jest.mock('recharts', () => {
  const MockResponsiveContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  )
  const MockBarChart = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  )
  const MockBar = ({ dataKey }: { dataKey: string }) => (
    <div data-testid={`bar-${dataKey}`} />
  )
  const MockXAxis = () => <div data-testid="x-axis" />
  const MockYAxis = () => <div data-testid="y-axis" />
  const MockTooltip = ({ content }: { content: (props: { payload: Array<{ payload: ComparisonData }>, label: string }) => React.ReactNode }) => {
    // Test tooltip with sample data
    const samplePayload = [{
      payload: {
        name: 'Test Cat',
        average: 1200,
        target: 300,
        adherence: 400
      }
    }]
    return content({ payload: samplePayload, label: 'Test Cat' })
  }

  return {
    ResponsiveContainer: MockResponsiveContainer,
    BarChart: MockBarChart,
    Bar: MockBar,
    XAxis: MockXAxis,
    YAxis: MockYAxis,
    Tooltip: MockTooltip
  }
})

// Create 7 days worth of meals
const today = new Date()
const mockMeals = Array.from({ length: 7 }, (_, i) => {
  const date = new Date(today)
  date.setDate(date.getDate() - i)
  return {
    id: i + 1,
    catId: 1,
    foodType: 'WET' as const,
    weight: 250, // This will give us 250 calories per day (250g * 100cal/100g)
    createdAt: date.toISOString()
  }
})

const mockUseMeals = {
  meals: mockMeals
}

// Mock meal context
jest.mock('@/contexts/meal-context', () => ({
  useMeals: jest.fn(() => mockUseMeals)
}))

describe('PetComparison', () => {
  const mockCat: Cat = {
    id: 1,
    name: 'Test Cat',
    wetFoodId: 1,
    dryFoodId: 2,
    wetFood: { id: 1, name: 'Wet Food', foodType: 'WET', calories: 100 } as FoodSetting,
    dryFood: { id: 2, name: 'Dry Food', foodType: 'DRY', calories: 300 } as FoodSetting,
    targetCalories: 300,
    weight: 4.5,
    weightUnit: 'kg'
  }

  it('renders nothing when no cats are provided', () => {
    const { container } = render(<PetComparison initialCats={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('handles missing meals data', async () => {
    // Mock meals as undefined to trigger the early return in useEffect
    const mockUseMealsEmpty = {
      meals: undefined
    };
    (useMeals as jest.Mock).mockReturnValueOnce(mockUseMealsEmpty)
    
    render(<PetComparison initialCats={[mockCat]} />)
    
    // Add a small delay to allow state updates
    await new Promise(resolve => setTimeout(resolve, 0))
    
    expect(screen.getByText('No data available for selected period')).toBeInTheDocument()
  })

  it('applies correct color classes based on adherence', () => {
    const overMeals = Array(7).fill({
      id: 1,
      catId: 1,
      foodType: 'WET' as const,
      weight: 1200, // This will give us 1200g * (100cal/100g) = 1200 calories per day
      createdAt: new Date().toISOString()
    })
    mockUseMeals.meals = overMeals

    render(<PetComparison initialCats={[mockCat]} />)
    
    // With 1200 calories per day vs 300 target, adherence should be 400%
    const adherenceText = screen.getByText(/\d+% of target/)
    expect(adherenceText).toHaveClass('text-red-500')
    mockUseMeals.meals = mockMeals
  })
}) 