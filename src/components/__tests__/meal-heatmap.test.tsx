import { render, screen } from '@testing-library/react'
import { MealHeatmap } from '../meal-heatmap'

interface MealTime {
  hour: number
  day: number
  value: number
  actualTime: string
  actualDay: string
}

// Mock recharts components
jest.mock('recharts', () => {
  const MockResponsiveContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  )
  const MockScatterChart = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scatter-chart">{children}</div>
  )
  const MockScatter = ({ data }: { data: MealTime[] }) => (
    <div data-testid="scatter" data-points={data.length} />
  )
  const MockXAxis = ({ tickFormatter }: { tickFormatter?: (value: number) => string }) => (
    <div data-testid="x-axis">
      {tickFormatter && tickFormatter(12)} {/* Test with noon */}
    </div>
  )
  const MockYAxis = ({ tickFormatter }: { tickFormatter?: (value: number) => string }) => (
    <div data-testid="y-axis">
      {tickFormatter && tickFormatter(1)} {/* Test with Monday */}
    </div>
  )
  const MockZAxis = () => <div data-testid="z-axis" />
  const MockTooltip = ({ content }: { content: (props: { payload: Array<{ payload: MealTime }> }) => React.ReactNode }) => {
    // Test tooltip with sample data
    const samplePayload = [{
      payload: {
        actualDay: 'Mon',
        actualTime: '12 PM',
        value: 2,
        hour: 12,
        day: 1
      }
    }]
    return content({ payload: samplePayload })
  }

  return {
    ResponsiveContainer: MockResponsiveContainer,
    ScatterChart: MockScatterChart,
    Scatter: MockScatter,
    XAxis: MockXAxis,
    YAxis: MockYAxis,
    ZAxis: MockZAxis,
    Tooltip: MockTooltip
  }
})

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'h a') return '12 PM'
    return date.toString()
  })
}))

describe('MealHeatmap', () => {
  const mockMeals = [
    {
      createdAt: '2023-11-28T12:00:00Z',
      weight: 100
    },
    {
      createdAt: '2023-11-28T12:00:00Z', // Same time to test grouping
      weight: 150
    },
    {
      createdAt: '2023-11-28T18:00:00Z',
      weight: 100
    }
  ]

  it('renders chart components', () => {
    render(<MealHeatmap meals={[]} />)

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    expect(screen.getByTestId('scatter-chart')).toBeInTheDocument()
    expect(screen.getByTestId('scatter')).toBeInTheDocument()
    expect(screen.getByTestId('x-axis')).toBeInTheDocument()
    expect(screen.getByTestId('y-axis')).toBeInTheDocument()
    expect(screen.getByTestId('z-axis')).toBeInTheDocument()
  })

  it('groups meals at the same time', () => {
    render(<MealHeatmap meals={mockMeals} />)

    // Should have 24 * 7 = 168 points (all hours filled with zeros)
    expect(screen.getByTestId('scatter')).toHaveAttribute('data-points', '168')
  })

  it('formats axis labels correctly', () => {
    render(<MealHeatmap meals={mockMeals} />)

    // Check if time is formatted
    expect(screen.getByTestId('x-axis')).toHaveTextContent('12 PM')
    
    // Check if day is formatted
    expect(screen.getByTestId('y-axis')).toHaveTextContent('Mon')
  })

  it('renders tooltip with correct content', () => {
    render(<MealHeatmap meals={mockMeals} />)

    // Check tooltip content
    const tooltip = screen.getByText('Mon at 12 PM')
    expect(tooltip).toBeInTheDocument()
    expect(screen.getByText('2 meals')).toBeInTheDocument()
  })

  it('handles empty meals array', () => {
    render(<MealHeatmap meals={[]} />)

    // Should still render the chart with all zero values
    expect(screen.getByTestId('scatter')).toHaveAttribute('data-points', '168')
  })

  it('fills missing hours with zero values', () => {
    const singleMeal = [{
      createdAt: '2023-11-28T12:00:00Z',
      weight: 100
    }]

    render(<MealHeatmap meals={singleMeal} />)

    // Should have points for all hours (24 * 7 = 168)
    expect(screen.getByTestId('scatter')).toHaveAttribute('data-points', '168')
  })
}) 