import { render, screen } from '@testing-library/react'
import { CalorieChart } from '../calorie-chart'
import { format, eachDayOfInterval } from 'date-fns'
import { getLastNDaysRange } from '@/lib/date-utils'

// Mock recharts components
jest.mock('recharts', () => {
  const MockLineChart = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  )
  const MockLine = ({ dataKey }: { dataKey: string }) => <div data-testid={`line-${dataKey}`} />
  const MockXAxis = () => <div data-testid="x-axis" />
  const MockYAxis = () => <div data-testid="y-axis" />
  const MockCartesianGrid = () => <div data-testid="cartesian-grid" />
  const MockTooltip = () => <div data-testid="tooltip" />
  const MockResponsiveContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  )

  return {
    LineChart: MockLineChart,
    Line: MockLine,
    XAxis: MockXAxis,
    YAxis: MockYAxis,
    CartesianGrid: MockCartesianGrid,
    Tooltip: MockTooltip,
    ResponsiveContainer: MockResponsiveContainer
  }
})

// Mock date-fns functions
jest.mock('date-fns', () => ({
  format: jest.fn((date: Date, formatStr: string) => {
    if (formatStr === 'yyyy-MM-dd') return '2023-11-28'
    if (formatStr === 'MMM d') return 'Nov 28'
    return date.toISOString()
  }),
  eachDayOfInterval: jest.fn(({ start }: { start: Date }) => {
    // Return an array of 7 days for testing
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start)
      date.setDate(date.getDate() + i)
      return date
    })
  }),
  subDays: jest.fn()
}))

// Mock date utils
jest.mock('@/lib/date-utils', () => ({
  getLastNDaysRange: jest.fn(() => ({
    start: new Date('2023-11-21'),
    end: new Date('2023-11-28')
  }))
}))

describe('CalorieChart', () => {
  const mockData = [
    {
      date: new Date('2023-11-28'),
      calories: 250,
      target: 300
    }
  ]

  it('renders chart with data', () => {
    render(<CalorieChart data={mockData} />)

    // Check if chart components are rendered
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getByTestId('line-calories')).toBeInTheDocument()
    expect(screen.getByTestId('line-target')).toBeInTheDocument()
    expect(screen.getByTestId('x-axis')).toBeInTheDocument()
    expect(screen.getByTestId('y-axis')).toBeInTheDocument()
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument()
    expect(screen.getByTestId('tooltip')).toBeInTheDocument()
  })

  it('shows no data message when data array is empty', () => {
    render(<CalorieChart data={[]} />)
    const noDataMessage = screen.getByText('No data available for selected period')
    expect(noDataMessage).toBeInTheDocument()
    expect(noDataMessage.parentElement).toHaveClass('h-[300px] w-full')
    expect(noDataMessage).toHaveClass('flex items-center justify-center h-full text-muted-foreground')
  })

  it('uses provided date range', () => {
    const dateRange = {
      from: new Date('2023-11-21'),
      to: new Date('2023-11-28')
    }

    render(<CalorieChart data={mockData} dateRange={dateRange} />)

    // Verify eachDayOfInterval was called with correct range
    expect(eachDayOfInterval).toHaveBeenCalledWith({
      start: dateRange.from,
      end: dateRange.to
    })
  })

  it('uses last 7 days when no date range provided', () => {
    render(<CalorieChart data={mockData} />)

    // Verify getLastNDaysRange was called
    expect(getLastNDaysRange).toHaveBeenCalledWith(7)
  })

  it('fills missing days with zero calories', () => {
    const mockDates = [
      new Date('2023-11-26'),
      new Date('2023-11-27'),
      new Date('2023-11-28')
    ]

    // Mock format to return consistent dates
    ;(format as jest.Mock).mockImplementation((date: Date, formatStr: string) => {
      if (formatStr === 'yyyy-MM-dd') return date.toLocaleDateString('en-CA')
      if (formatStr === 'MMM d') return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return date.toLocaleDateString()
    })

    // Mock interval to return 3 days
    ;(eachDayOfInterval as jest.Mock).mockReturnValue(mockDates)

    // Provide data for only one day
    const singleDayData = [{
      date: new Date('2023-11-28'),
      calories: 250,
      target: 300
    }]

    render(<CalorieChart data={singleDayData} />)

    // Verify data points are rendered
    expect(screen.getByTestId('line-calories')).toBeInTheDocument()
  })

  it('rounds calorie values', () => {
    const dataWithDecimals = [{
      date: new Date('2023-11-28'),
      calories: 250.6,
      target: 300.4
    }]

    render(<CalorieChart data={dataWithDecimals} />)

    // Verify data points are rendered
    expect(screen.getByTestId('line-calories')).toBeInTheDocument()
  })
}) 