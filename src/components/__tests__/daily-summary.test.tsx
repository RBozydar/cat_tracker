import { render, screen } from '@testing-library/react'
import { DailySummary } from '../daily-summary'

// Mock the CalorieSummary component
jest.mock('../calorie-summary', () => ({
  CalorieSummary: ({ selectedCatId }: { selectedCatId: number }) => (
    <div data-testid={`calorie-summary-${selectedCatId}`}>Mocked Calorie Summary</div>
  )
}))

describe('DailySummary', () => {
  const mockMeals = [
    {
      id: 1,
      catId: 1,
      cat: {
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
      foodType: 'WET',
      weight: 100,
      createdAt: new Date().toISOString()
    }
  ]

  it('renders today\'s summary', () => {
    render(<DailySummary meals={mockMeals} />)
    
    expect(screen.getByText('Today\'s Summary')).toBeInTheDocument()
    expect(screen.getByTestId('calorie-summary-1')).toBeInTheDocument()
  })

  it('handles empty meals array', () => {
    render(<DailySummary meals={[]} />)
    expect(screen.getByText('Today\'s Summary')).toBeInTheDocument()
    expect(screen.queryByTestId(/calorie-summary-/)).not.toBeInTheDocument()
  })
}) 