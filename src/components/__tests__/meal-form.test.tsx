import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MealForm } from '../meal-form'

describe('MealForm', () => {
  const mockOnMealAdded = jest.fn()
  const user = userEvent.setup()

  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 1, cat: { name: 'Ahmed' } })
      })
    ) as jest.Mock
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders all form elements', async () => {
    await act(async () => {
      render(<MealForm onMealAdded={mockOnMealAdded} />)
    })
    
    expect(screen.getByText('Ahmed')).toBeInTheDocument()
    expect(screen.getByText('Wet Food')).toBeInTheDocument()
    expect(screen.getByText('Dry Food')).toBeInTheDocument()
    expect(screen.getByLabelText('Weight (grams)')).toBeInTheDocument()
    expect(screen.getByText('Record Meal')).toBeInTheDocument()
  })

  it('submit button is disabled when form is incomplete', async () => {
    await act(async () => {
      render(<MealForm onMealAdded={mockOnMealAdded} />)
    })
    
    expect(screen.getByText('Record Meal')).toBeDisabled()
  })

  it('submits form with correct data', async () => {
    await act(async () => {
      render(<MealForm onMealAdded={mockOnMealAdded} />)
    })
    
    // Fill form
    await user.click(screen.getByText('Ahmed'))
    await user.click(screen.getByText('Wet Food'))
    await user.type(screen.getByLabelText('Weight (grams)'), '100')
    
    // Submit form
    await user.click(screen.getByText('Record Meal'))
    
    expect(global.fetch).toHaveBeenCalledWith('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        catId: 1,
        foodType: 'WET',
        weight: 100
      })
    })
    
    expect(mockOnMealAdded).toHaveBeenCalled()
  })
}) 