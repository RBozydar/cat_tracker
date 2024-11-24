import { render, screen, act } from '@testing-library/react'
import { CatSelect } from '../cat-select'

// Mock Radix UI Select components
jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: {
    children: React.ReactNode;
    value?: string;
    onValueChange: (value: string) => void;
  }) => (
    <div data-testid="mock-select" data-value={value} onClick={() => onValueChange('1')}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: { placeholder: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div data-testid="select-content">{children}</div>,
  SelectGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode, value: string | number }) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
}))

// Mock fetch
global.fetch = jest.fn()

describe('CatSelect', () => {
  const mockOnChange = jest.fn()

  const mockCats = [
    { 
      id: 1, 
      name: 'Ahmed',
      wetFoodId: 1,
      dryFoodId: 2,
      wetFood: { id: 1, name: 'Wet Food', foodType: 'WET', calories: 100 },
      dryFood: { id: 2, name: 'Dry Food', foodType: 'DRY', calories: 300 },
      targetCalories: 250,
      weight: 4.5,
      weightUnit: 'kg'
    },
    { 
      id: 2, 
      name: 'Knypson',
      wetFoodId: 1,
      dryFoodId: 2,
      wetFood: { id: 1, name: 'Wet Food', foodType: 'WET', calories: 100 },
      dryFood: { id: 2, name: 'Dry Food', foodType: 'DRY', calories: 300 },
      targetCalories: 220,
      weight: 3.8,
      weightUnit: 'kg'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCats)
    })
  })

  it('renders select with cats', async () => {
    await act(async () => {
      render(<CatSelect onChange={mockOnChange} />)
    })

    expect(screen.getByText('Select a cat...')).toBeInTheDocument()
    expect(screen.getByTestId('select-item-1')).toHaveTextContent('Ahmed')
    expect(screen.getByTestId('select-item-2')).toHaveTextContent('Knypson')
  })

  it('shows "All Cats" option when includeAll is true', async () => {
    await act(async () => {
      render(<CatSelect onChange={mockOnChange} includeAll />)
    })

    expect(screen.getByTestId('select-item-all')).toHaveTextContent('All Cats')
  })

  it('calls onChange with correct value when selected', async () => {
    await act(async () => {
      render(<CatSelect onChange={mockOnChange} />)
    })

    const select = screen.getByTestId('mock-select')
    await act(async () => {
      select.click()
    })

    expect(mockOnChange).toHaveBeenCalledWith(1)
  })

  it('shows error message when no cats are found', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([])
    })

    await act(async () => {
      render(<CatSelect onChange={mockOnChange} />)
    })

    expect(screen.getByText('No cats found. Please add cats in settings.')).toBeInTheDocument()
  })

  it('handles fetch error gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'))

    await act(async () => {
      render(<CatSelect onChange={mockOnChange} />)
    })

    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
}) 