import { render, screen, act } from '@testing-library/react'
import { DailySummary } from '../daily-summary'

describe('DailySummary', () => {
  const mockMeals = [
    {
      id: 1,
      catId: 1,
      cat: { id: 1, name: 'Ahmed' },
      foodType: 'WET',
      weight: 100,
      createdAt: new Date().toISOString()
    }
  ]

  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          { foodType: 'WET', calories: 100 },
          { foodType: 'DRY', calories: 300 }
        ])
      })
    ) as jest.Mock
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders today\'s summary', async () => {
    await act(async () => {
      render(<DailySummary meals={mockMeals} />)
    })
    
    expect(screen.getByText('Today\'s Summary')).toBeInTheDocument()
    expect(screen.getByText('Ahmed')).toBeInTheDocument()
    expect(screen.getByText(/100g/)).toBeInTheDocument()
  })

  it('shows empty state when no meals', async () => {
    await act(async () => {
      render(<DailySummary meals={[]} />)
    })
    
    expect(screen.getByText('Today\'s Summary')).toBeInTheDocument()
    expect(screen.queryByText('Ahmed')).not.toBeInTheDocument()
  })
}) 