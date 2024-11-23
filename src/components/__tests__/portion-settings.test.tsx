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
    await user.click(toggle)

    expect(global.fetch).toHaveBeenCalledWith('/api/portion-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestPortionSizes: true })
    })
  })

  it('handles errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    
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
        new Response(JSON.stringify({ error: 'Failed to update' }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      )

    await act(async () => {
      render(<PortionSettingsForm />)
    })

    const toggle = screen.getByRole('switch')
    await user.click(toggle)

    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('validates meals per day input', async () => {
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

    await act(async () => {
      render(<PortionSettingsForm />)
    })

    const input = screen.getByLabelText('Meals per Day:') as HTMLInputElement
    await user.clear(input)
    await user.type(input, '11')

    expect(input.value).toBe('2') // Should not allow values > 10
    await user.clear(input)
    await user.type(input, '0')
    expect(input.value).toBe('2') // Should not allow values < 1
  })
}) 