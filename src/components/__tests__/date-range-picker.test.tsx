import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DateRangePicker } from '../date-range-picker'

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}

interface CalendarProps {
  onSelect: (date: { from: Date; to: Date }) => void
  selected?: { from?: Date; to?: Date }
}

interface SelectProps {
  onValueChange: (value: string) => void
  children: React.ReactNode
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
}

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date: Date, formatStr: string) => {
    if (formatStr === 'LLL dd, y') return 'Nov 28, 2023'
    return date.toISOString()
  }),
  subDays: jest.fn((date: Date, days: number) => {
    const result = new Date(date)
    result.setDate(result.getDate() - days)
    return result
  }),
  subMonths: jest.fn((date: Date, months: number) => {
    const result = new Date(date)
    result.setMonth(result.getMonth() - months)
    return result
  })
}))

// Mock shadcn components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className }: ButtonProps) => (
    <button onClick={onClick} data-testid="date-picker-button" className={className}>
      {children}
    </button>
  )
}))

jest.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onSelect, selected }: CalendarProps) => (
    <div data-testid="calendar">
      <button
        onClick={() => onSelect({
          from: new Date('2023-11-21'),
          to: new Date('2023-11-28')
        })}
      >
        Select Range
      </button>
      <div data-testid="selected-range">
        {selected?.from?.toISOString()} - {selected?.to?.toISOString()}
      </div>
    </div>
  )
}))

jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div data-testid="popover">{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="popover-trigger">{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div data-testid="popover-content">{children}</div>
}))

// Fixed Select mock to avoid DOM nesting issues
jest.mock('@/components/ui/select', () => ({
  Select: ({ onValueChange, children }: SelectProps) => (
    <div data-testid="select">
      <button onClick={() => onValueChange('Last 7 days')} data-testid="select-button">
        Select Preset
      </button>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ children }: { children: React.ReactNode }) => <div data-testid="select-value">{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ value, children }: SelectItemProps) => (
    <div data-testid={`preset-option-${value}`}>
      {children}
    </div>
  )
}))

describe('DateRangePicker', () => {
  const user = userEvent.setup()

  it('renders default state correctly', () => {
    render(<DateRangePicker date={undefined} onChange={() => {}} />)
    expect(screen.getByText('Pick a date range')).toBeInTheDocument()
  })

  it('displays selected date range', () => {
    const dateRange = {
      from: new Date('2023-11-21'),
      to: new Date('2023-11-28')
    }

    render(<DateRangePicker date={dateRange} onChange={() => {}} />)
    expect(screen.getByText(/Nov 28, 2023/)).toBeInTheDocument()
    expect(screen.getByTestId('date-picker-button')).toHaveTextContent(/Nov 28, 2023.*-.*Nov 28, 2023/)
  })

  it('calls onChange when preset is selected', async () => {
    const handleChange = jest.fn()
    render(<DateRangePicker date={undefined} onChange={handleChange} />)

    const selectButton = screen.getByTestId('select-button')
    await user.click(selectButton)

    expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({
      from: expect.any(Date),
      to: expect.any(Date)
    }))
  })

  it('calls onChange when date range is selected in calendar', async () => {
    const handleChange = jest.fn()
    render(<DateRangePicker date={undefined} onChange={handleChange} />)

    const calendarButton = screen.getByText('Select Range')
    await user.click(calendarButton)

    expect(handleChange).toHaveBeenCalledWith({
      from: expect.any(Date),
      to: expect.any(Date)
    })
  })

  it('handles single date selection', () => {
    const dateRange = {
      from: new Date('2023-11-21'),
      to: undefined
    }

    render(<DateRangePicker date={dateRange} onChange={() => {}} />)
    expect(screen.getByText(/Nov 28, 2023/)).toBeInTheDocument()
  })

  it('renders all preset options', () => {
    render(<DateRangePicker date={undefined} onChange={() => {}} />)

    expect(screen.getByTestId('preset-option-Last 7 days')).toHaveTextContent('Last 7 days')
    expect(screen.getByTestId('preset-option-Last 30 days')).toHaveTextContent('Last 30 days')
    expect(screen.getByTestId('preset-option-Last 3 months')).toHaveTextContent('Last 3 months')
  })

  it('applies correct styling when date is selected', () => {
    const dateRange = {
      from: new Date('2023-11-21'),
      to: new Date('2023-11-28')
    }

    render(<DateRangePicker date={dateRange} onChange={() => {}} />)
    const button = screen.getByTestId('date-picker-button')
    expect(button).not.toHaveClass('text-muted-foreground')
  })

  it('applies muted styling when no date is selected', () => {
    render(<DateRangePicker date={undefined} onChange={() => {}} />)
    const button = screen.getByTestId('date-picker-button')
    expect(button).toHaveClass('text-muted-foreground')
  })
}) 