import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PortionSettingsForm } from '../portion-settings'

// Mock fetch
global.fetch = jest.fn()

describe('PortionSettingsForm', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders settings form with default values', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify({
        suggestPortionSizes: false,
        mealsPerDay: 2
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    )

    await act(async () => {
      render(<PortionSettingsForm />)
    })

    expect(screen.getByText('Suggest Portion Sizes')).toBeInTheDocument()
    expect(screen.getByRole('switch')).not.toBeChecked()
    expect(screen.queryByLabelText('Meals per Day:')).not.toBeInTheDocument()
  })

  it('shows meals per day input when portions are enabled', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify({
        suggestPortionSizes: true,
        mealsPerDay: 3
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    )

    await act(async () => {
      render(<PortionSettingsForm />)
    })

    const input = screen.getByLabelText('Meals per Day:') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.value).toBe('3')
  })

  it('updates settings when changed', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          suggestPortionSizes: false,
          mealsPerDay: 2
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          suggestPortionSizes: true,
          mealsPerDay: 2
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

    await act(async () => {
      render(<PortionSettingsForm />)
    })

    const toggle = screen.getByRole('switch')
    await act(async () => {
      await user.click(toggle)
      // Wait for all promises to resolve
      await Promise.resolve()
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/portion-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestPortionSizes: true })
    })
  })

  it('validates meals per day input', async () => {
    // Initial load
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify({
        suggestPortionSizes: true,
        mealsPerDay: 2
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    )

    // Mock responses for each update attempt
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          suggestPortionSizes: true,
          mealsPerDay: 2
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          suggestPortionSizes: true,
          mealsPerDay: 2
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

    await act(async () => {
      render(<PortionSettingsForm />)
    })

    const input = screen.getByLabelText('Meals per Day:') as HTMLInputElement

    // Type invalid value (11)
    await act(async () => {
      await user.clear(input)
      await user.type(input, '11')
      // Wait for fetch to complete
      await Promise.resolve()
    })

    expect(input.value).toBe('2') // Should not allow values > 10

    // Type invalid value (0)
    await act(async () => {
      await user.clear(input)
      await user.type(input, '0')
      // Wait for fetch to complete
      await Promise.resolve()
    })

    expect(input.value).toBe('2') // Should not allow values < 1
  })

  it('handles errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    // Initial load
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify({
        suggestPortionSizes: false,
        mealsPerDay: 2
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    )

    // Error response for update
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Failed to update' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    )

    await act(async () => {
      render(<PortionSettingsForm />)
    })

    const toggle = screen.getByRole('switch')
    await act(async () => {
      await user.click(toggle)
      // Wait for fetch to complete
      await Promise.resolve()
    })

    expect(consoleError).toHaveBeenCalled()
    expect(toggle).not.toBeChecked() // Should revert to original state
    consoleError.mockRestore()
  })

  it('handles network errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    // Initial load
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify({
        suggestPortionSizes: false,
        mealsPerDay: 2
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    )

    // Network error for update
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    await act(async () => {
      render(<PortionSettingsForm />)
    })

    const toggle = screen.getByRole('switch')
    await act(async () => {
      await user.click(toggle)
      // Wait for fetch to complete
      await Promise.resolve()
    })

    expect(consoleError).toHaveBeenCalled()
    expect(toggle).not.toBeChecked() // Should revert to original state
    consoleError.mockRestore()
  })
}) 