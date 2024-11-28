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

//   it('shows loading state while deleting', async () => {
//     // Make the delete operation take longer
//     mockDeleteMeal.mockImplementationOnce(() => 
//       new Promise(resolve => setTimeout(resolve, 500))
//     )
    
//     render(<DeleteMealDialog {...mockProps} />)
    
//     // Open dialog first
//     await user.click(screen.getByRole('button'))
//     await screen.findByRole('alertdialog') // Wait for dialog to open
    
//     // Click delete and check loading state
//     const deleteButton = screen.getByRole('button', { name: /delete/i })
//     await user.click(deleteButton)
    
//     // Now check for loading state
//     await screen.findByText('Deleting...')
//   })

//   it('handles delete errors gracefully', async () => {
//     const error = new Error('Failed to delete')
//     mockDeleteMeal.mockRejectedValueOnce(error)
//     const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    
//     render(<DeleteMealDialog {...mockProps} />)
    
//     // Open dialog and wait for it
//     await user.click(screen.getByRole('button'))
//     await screen.findByRole('alertdialog')
    
//     // Now click delete
//     await user.click(screen.getByRole('button', { name: /delete/i }))
    
//     // Dialog should stay open on error
//     expect(screen.getByRole('alertdialog')).toBeInTheDocument()
//     expect(consoleError).toHaveBeenCalledWith(error)
    
//     consoleError.mockRestore()
//   })

//   it('supports different button variants', () => {
//     render(<DeleteMealDialog {...mockProps} variant="destructive" />)
//     expect(screen.getByRole('button')).toHaveClass('bg-destructive')
//   })
// }) 
})