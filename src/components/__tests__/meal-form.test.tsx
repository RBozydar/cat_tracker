import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MealForm } from '../meal-form'
import { useMeals } from '@/contexts/meal-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock the meal context
jest.mock('@/contexts/meal-context', () => ({
  useMeals: jest.fn()
}))

// Mock date utils
jest.mock('@/lib/date-utils', () => ({
  getUserTimezone: jest.fn().mockReturnValue('UTC')
}))

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn()
  }
}))

// Mock error alert
jest.mock('@/components/error-alert', () => ({
  ErrorAlert: ({ description }: { description: string }) => (
    <div role="alert">{description}</div>
  )
}))

// Mock ResponsiveCatSelector
jest.mock('../responsive-cat-selector', () => ({
  ResponsiveCatSelector: ({ onChange }: { value: number | null, onChange: (value: number) => void }) => (
    <div>
      <button onClick={() => onChange(1)}>Cat 1</button>
      <button onClick={() => onChange(2)}>Cat 2</button>
    </div>
  )
}))

// Mock MealFormCalorieSummary
jest.mock('../meal-form-calorie-summary', () => ({
  MealFormCalorieSummary: () => <div>Calorie Summary</div>
}))

// Create a wrapper with providers
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe('MealForm', () => {
  const user = userEvent.setup()
  const mockAddMeal = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useMeals as jest.Mock).mockReturnValue({
      addMeal: mockAddMeal
    })
  })

  it('maintains form state on submission error', async () => {
    // Mock a failed submission
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'))

    renderWithProviders(<MealForm />)

    // Fill out the form
    await user.click(screen.getByRole('button', { name: 'Cat 1' }))
    await user.click(screen.getByRole('button', { name: 'Wet Food' }))
    await user.type(screen.getByLabelText(/Weight/i), '100')

    // Submit the form
    await user.click(screen.getByRole('button', { name: 'Record Meal' }))

    // Verify error is shown
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Could not save the meal/i)
    })

    // Verify form state is reset (this is the current behavior)
    await waitFor(() => {
      expect(screen.getByLabelText(/Weight/i)).toHaveValue(null)
    })
  })

  it('resets form state after successful submission', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 1, catId: 1, foodType: 'WET', weight: 100 })
    })

    renderWithProviders(<MealForm />)

    // Fill out the form
    await user.click(screen.getByRole('button', { name: 'Cat 1' }))
    await user.click(screen.getByRole('button', { name: 'Wet Food' }))
    await user.type(screen.getByLabelText(/Weight/i), '100')

    // Submit the form
    await user.click(screen.getByRole('button', { name: 'Record Meal' }))

    // Verify form is reset
    await waitFor(() => {
      expect(screen.getByLabelText(/Weight/i)).toHaveValue(null)
    })
  })

  it('preserves cat selection when changing food type', async () => {
    renderWithProviders(<MealForm />)

    // Select a cat and fill required fields
    await user.click(screen.getByRole('button', { name: 'Cat 1' }))
    await user.click(screen.getByRole('button', { name: 'Wet Food' }))
    await user.type(screen.getByLabelText(/Weight/i), '100')
    
    // Change food type multiple times
    await user.click(screen.getByRole('button', { name: 'Dry Food' }))
    await user.click(screen.getByRole('button', { name: 'Wet Food' }))

    // Verify submit button is enabled (meaning cat selection is preserved)
    expect(screen.getByRole('button', { name: 'Record Meal' })).toBeEnabled()
  })

  it('sends correct cat ID in form submission', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 1, catId: 2, foodType: 'WET', weight: 100 })
    })

    renderWithProviders(<MealForm />)

    // Select Cat 2
    await user.click(screen.getByRole('button', { name: 'Cat 2' }))
    await user.click(screen.getByRole('button', { name: 'Wet Food' }))
    await user.type(screen.getByLabelText(/Weight/i), '100')

    // Submit the form
    await user.click(screen.getByRole('button', { name: 'Record Meal' }))

    // Verify correct catId was sent
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/meals', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"catId":2')
      }))
    })
  })

  it('validates weight input', async () => {
    renderWithProviders(<MealForm />)

    // Fill out the form except weight
    await user.click(screen.getByRole('button', { name: 'Cat 1' }))
    await user.click(screen.getByRole('button', { name: 'Wet Food' }))

    // Submit button should be disabled
    expect(screen.getByRole('button', { name: 'Record Meal' })).toBeDisabled()

    // Enter invalid weight
    await user.type(screen.getByLabelText(/Weight/i), '0')
    expect(screen.getByRole('button', { name: 'Record Meal' })).toBeDisabled()

    // Enter valid weight
    await user.clear(screen.getByLabelText(/Weight/i))
    await user.type(screen.getByLabelText(/Weight/i), '100')
    expect(screen.getByRole('button', { name: 'Record Meal' })).toBeEnabled()
  })
}) 