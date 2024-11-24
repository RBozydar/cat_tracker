import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteMealDialog } from '../delete-meal-dialog'

// Mock MealContext
const mockDeleteMeal = jest.fn()
jest.mock('@/contexts/meal-context', () => ({
  useMeals: () => ({
    deleteMeal: mockDeleteMeal
  })
}))

describe('DeleteMealDialog', () => {
  const user = userEvent.setup()
  const mockProps = {
    mealId: 1,
    mealDescription: '100g of WET food for Ahmed'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders delete button', () => {
    render(<DeleteMealDialog {...mockProps} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('opens dialog when clicked', async () => {
    render(<DeleteMealDialog {...mockProps} />)
    
    await user.click(screen.getByRole('button'))
    
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText('Delete Meal')).toBeInTheDocument()
    expect(screen.getByText(mockProps.mealDescription)).toBeInTheDocument()
  })

  it('calls deleteMeal when confirmed', async () => {
    render(<DeleteMealDialog {...mockProps} />)
    
    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    
    expect(mockDeleteMeal).toHaveBeenCalledWith(mockProps.mealId)
  })

  it('closes without deleting when cancelled', async () => {
    render(<DeleteMealDialog {...mockProps} />)
    
    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    
    expect(mockDeleteMeal).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('shows loading state while deleting', async () => {
    mockDeleteMeal.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    render(<DeleteMealDialog {...mockProps} />)
    
    await user.click(screen.getByRole('button'))
    
    const deleteButton = screen.getByRole('button', { name: 'Delete' })
    await user.click(deleteButton)
    
    expect(deleteButton).toBeDisabled()
    expect(screen.getByText('Deleting...')).toBeInTheDocument()
  })

  it('handles delete errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockDeleteMeal.mockRejectedValueOnce(new Error('Failed to delete'))
    
    render(<DeleteMealDialog {...mockProps} />)
    
    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    
    expect(consoleError).toHaveBeenCalled()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument() // Dialog stays open on error
    
    consoleError.mockRestore()
  })

  it('supports different button variants', () => {
    render(<DeleteMealDialog {...mockProps} variant="destructive" />)
    expect(screen.getByRole('button')).toHaveClass('bg-destructive')
  })
}) 