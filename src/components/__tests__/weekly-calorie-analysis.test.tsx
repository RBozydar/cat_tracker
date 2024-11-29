import { render, screen } from '@testing-library/react'
import { WeeklyCalorieAnalysis } from '../weekly-calorie-analysis'
import { useCalorieStats } from '@/hooks/use-calorie-stats'
import { useMeals } from '@/contexts/meal-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock the hooks
jest.mock('@/hooks/use-calorie-stats', () => ({
  useCalorieStats: jest.fn()
}))

jest.mock('@/contexts/meal-context', () => ({
  useMeals: jest.fn()
}))

// Mock child components to avoid rendering issues
jest.mock('../calorie-chart', () => ({
  CalorieChart: () => <div data-testid="calorie-chart">Calorie Chart</div>
}))

jest.mock('../meal-heatmap', () => ({
  MealHeatmap: () => <div data-testid="meal-heatmap">Meal Heatmap</div>
}))

jest.mock('../portion-history', () => ({
  PortionHistory: () => <div data-testid="portion-history">Portion History</div>
}))

const mockStats = {
  weeklyAverage: 250,
  trend: 5,
  isIncreasing: true,
  chartData: [
    {
      date: new Date('2024-01-01'),
      calories: 250,
      target: 300
    },
    {
      date: new Date('2024-01-02'),
      calories: 275,
      target: 300
    }
  ],
  recentMeals: []
}

const mockUseMeals = {
  meals: [],
  loading: false,
  error: null
}

// Create a wrapper with providers
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe('WeeklyCalorieAnalysis', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useCalorieStats as jest.Mock).mockReturnValue(mockStats)
    ;(useMeals as jest.Mock).mockReturnValue(mockUseMeals)
  })

  it('shows loading state when meals are loading', () => {
    const loadingMeals = { ...mockUseMeals, loading: true }
    ;(useMeals as jest.Mock).mockReturnValue(loadingMeals)
    
    renderWithProviders(<WeeklyCalorieAnalysis catId={1} />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders all child components when data is loaded', () => {
    renderWithProviders(<WeeklyCalorieAnalysis catId={1} />)

    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('Period Average')).toBeInTheDocument()
    expect(screen.getByTestId('calorie-chart')).toBeInTheDocument()
    expect(screen.getByTestId('meal-heatmap')).toBeInTheDocument()
    expect(screen.getByTestId('portion-history')).toBeInTheDocument()
  })

  it('displays weekly average correctly', () => {
    renderWithProviders(<WeeklyCalorieAnalysis catId={1} />)
    expect(screen.getByText('250')).toBeInTheDocument()
    expect(screen.getByText('calories/day')).toBeInTheDocument()
  })

  it('shows increasing trend with correct styling', () => {
    renderWithProviders(<WeeklyCalorieAnalysis catId={1} />)
    const trendContainer = screen.getByText('5%').parentElement
    expect(trendContainer).toHaveClass('text-red-600')
    expect(screen.getByText('5%')).toBeInTheDocument()
  })

  it('shows decreasing trend with correct styling', () => {
    const decreasingStats = { ...mockStats, isIncreasing: false }
    ;(useCalorieStats as jest.Mock).mockReturnValue(decreasingStats)
    
    renderWithProviders(<WeeklyCalorieAnalysis catId={1} />)
    const trendContainer = screen.getByText('5%').parentElement
    expect(trendContainer).toHaveClass('text-green-600')
    expect(screen.getByText('5%')).toBeInTheDocument()
  })

  it('passes date range to child components', () => {
    const dateRange = { from: new Date('2024-01-01'), to: new Date('2024-01-07') }
    renderWithProviders(<WeeklyCalorieAnalysis catId={1} dateRange={dateRange} />)
    expect(useCalorieStats).toHaveBeenCalledWith(1, dateRange)
  })

  it('passes correct data to child components', () => {
    renderWithProviders(<WeeklyCalorieAnalysis catId={1} />)
    expect(screen.getByText('250')).toBeInTheDocument()
    expect(screen.getByText('5%')).toBeInTheDocument()
  })
}) 