import { render, screen, waitFor } from '@testing-library/react'
import { PortionHistory } from '../portion-history'

interface MealData {
  time: number
  weight: number
  foodType: 'WET' | 'DRY'
  formattedTime: string
}

// Mock recharts components
jest.mock('recharts', () => {
  const MockResponsiveContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  )
  const MockScatterChart = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scatter-chart">{children}</div>
  )
  const MockScatter = ({ data }: { data: MealData[] }) => (
    <div data-testid="scatter" data-points={data.length} />
  )
  const MockXAxis = ({ tickFormatter }: { tickFormatter?: (value: number) => string }) => (
    <div data-testid="x-axis">
      {tickFormatter && tickFormatter(new Date('2023-11-28').getTime())}
    </div>
  )
  const MockYAxis = () => <div data-testid="y-axis" />
  const MockTooltip = ({ content }: { content: (props: { payload: Array<{ payload: MealData }> }) => React.ReactNode }) => {
    // Test tooltip with sample data
    const samplePayload = [{
      payload: {
        weight: 100,
        foodType: 'WET',
        formattedTime: 'Nov 28, 12:00 PM',
        time: new Date('2023-11-28T12:00:00Z').getTime()
      } as MealData
    }]
    return content({ payload: samplePayload })
  }

  return {
    ResponsiveContainer: MockResponsiveContainer,
    ScatterChart: MockScatterChart,
    Scatter: MockScatter,
    XAxis: MockXAxis,
    YAxis: MockYAxis,
    Tooltip: MockTooltip
  }
})

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date: Date | number, formatStr: string) => {
    if (formatStr === 'MMM d') return 'Nov 28'
    if (formatStr === 'MMM d, h:mm a') return 'Nov 28, 12:00 PM'
    return new Date(date).toString()
  })
}))

describe('PortionHistory', () => {
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

  const mockMeals = [
    {
      createdAt: '2023-11-28T12:00:00Z',
      weight: 100,
      foodType: 'WET' as const
    },
    {
      createdAt: '2023-11-28T18:00:00Z',
      weight: 50,
      foodType: 'DRY' as const
    }
  ]

  beforeEach(() => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockCat)
      })
    ) as jest.Mock
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('fetches and renders cat data', async () => {
    render(<PortionHistory meals={mockMeals} catId={1} />)

    // Wait for cat data to load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/cats/1')
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
      expect(screen.getByTestId('scatter-chart')).toBeInTheDocument()
      expect(screen.getByTestId('scatter')).toBeInTheDocument()
    })
  })

  it('renders nothing when cat data is not loaded', async () => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(null)
      })
    ) as jest.Mock

    const { container } = render(<PortionHistory meals={mockMeals} catId={1} />)
    
    await waitFor(() => {
      expect(container).toBeEmptyDOMElement()
    })
  })

  it('formats data points correctly', async () => {
    render(<PortionHistory meals={mockMeals} catId={1} />)

    await waitFor(() => {
      expect(screen.getByTestId('scatter')).toHaveAttribute('data-points', '2')
      expect(screen.getByTestId('x-axis')).toHaveTextContent('Nov 28')
    })
  })

  it('handles fetch errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })
    ) as jest.Mock

    const { container } = render(<PortionHistory meals={mockMeals} catId={1} />)

    await waitFor(() => {
      expect(container).toBeEmptyDOMElement()
    })

    consoleError.mockRestore()
  })

  it('refetches cat data when catId changes', async () => {
    const { rerender } = render(<PortionHistory meals={mockMeals} catId={1} />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/cats/1')
    })

    // Reset fetch mock and rerender with new catId
    jest.clearAllMocks()
    
    // Setup new mock for second fetch
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ...mockCat, id: 2 })
      })
    ) as jest.Mock

    rerender(<PortionHistory meals={mockMeals} catId={2} />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/cats/2')
    })
  })
}) 