import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditMealDialog } from '../edit-meal-dialog'
import type { Meal } from '@/lib/types'

const mockUpdateMeal = jest.fn()
const mockDeleteMeal = jest.fn()

// Mock fetch globally
global.fetch = jest.fn()

jest.mock('@/contexts/meal-context', () => ({
  useMeals: () => ({
    updateMeal: mockUpdateMeal,
    deleteMeal: mockDeleteMeal
  })
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn()
  }
}))

describe('EditMealDialog', () => {
  const mockMeal: Meal = {
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

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  it('renders edit button initially', () => {
    render(<EditMealDialog meal={mockMeal} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('opens dialog when edit button is clicked', async () => {
    render(<EditMealDialog meal={mockMeal} />)
    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('displays current meal data in form', async () => {
    render(<EditMealDialog meal={mockMeal} />)
    await userEvent.click(screen.getByRole('button'))
    
    expect(screen.getByDisplayValue('100')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'WET' })).toHaveClass('bg-primary')
  })

  it('updates food type when clicking food type buttons', async () => {
    render(<EditMealDialog meal={mockMeal} />)
    await userEvent.click(screen.getByRole('button'))
    
    await userEvent.click(screen.getByRole('button', { name: 'DRY' }))
    expect(screen.getByRole('button', { name: 'DRY' })).toHaveClass('bg-primary')
  })

  it('handles weight input changes', async () => {
    render(<EditMealDialog meal={mockMeal} />)
    await userEvent.click(screen.getByRole('button'))
    
    const weightInput = screen.getByLabelText('Weight (g)')
    await userEvent.clear(weightInput)
    await userEvent.type(weightInput, '150')
    expect(weightInput).toHaveValue(150)
  })

  it('disables submit button for invalid weight', async () => {
    render(<EditMealDialog meal={mockMeal} />)
    await userEvent.click(screen.getByRole('button'))
    
    const weightInput = screen.getByLabelText('Weight (g)')
    await userEvent.clear(weightInput)
    await userEvent.type(weightInput, '0')
    
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled()
  })

  it('successfully updates meal', async () => {
    const updatedMeal = { ...mockMeal, weight: 150 }
    ;(global.fetch as jest.Mock).mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(updatedMeal)
      })
    )

    render(<EditMealDialog meal={mockMeal} />)
    await userEvent.click(screen.getByRole('button'))
    
    const weightInput = screen.getByLabelText('Weight (g)')
    await userEvent.clear(weightInput)
    await userEvent.type(weightInput, '150')
    
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(mockUpdateMeal).toHaveBeenCalledWith(updatedMeal)
    })
  })

  it('handles API error gracefully', async () => {
    ;(global.fetch as jest.Mock).mockImplementationOnce(() => 
      Promise.resolve({ ok: false })
    )

    render(<EditMealDialog meal={mockMeal} />)
    await userEvent.click(screen.getByRole('button'))
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(mockUpdateMeal).not.toHaveBeenCalled()
    })
  })

  it('closes dialog when clicking cancel', async () => {
    render(<EditMealDialog meal={mockMeal} />)
    await userEvent.click(screen.getByRole('button'))
    
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
}) 