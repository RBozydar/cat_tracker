import { render, screen, act } from '@testing-library/react'
import { ResponsiveCatSelector } from '../responsive-cat-selector'

// Mock child components
jest.mock('../cat-buttons', () => ({
  CatButtons: () => <div data-testid="cat-buttons">Cat Buttons</div>
}))

jest.mock('../cat-select', () => ({
  CatSelect: () => <div data-testid="cat-select">Cat Select</div>
}))

describe('ResponsiveCatSelector', () => {
  const mockOnChange = jest.fn()
  let originalInnerWidth: number

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
    jest.clearAllMocks()
  })

  afterEach(() => {
    // Restore original innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth
    })
  })

  it('shows buttons on desktop', async () => {
    // Set desktop width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    })

    await act(async () => {
      render(<ResponsiveCatSelector onChange={mockOnChange} />)
    })

    expect(screen.getByTestId('cat-buttons')).toBeInTheDocument()
    expect(screen.queryByTestId('cat-select')).not.toBeInTheDocument()
  })

  it('shows select on mobile', async () => {
    // Set mobile width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 320
    })

    await act(async () => {
      render(<ResponsiveCatSelector onChange={mockOnChange} />)
    })

    expect(screen.getByTestId('cat-select')).toBeInTheDocument()
    expect(screen.queryByTestId('cat-buttons')).not.toBeInTheDocument()
  })

  it('responds to window resize', async () => {
    // Start with desktop width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    })

    await act(async () => {
      render(<ResponsiveCatSelector onChange={mockOnChange} />)
    })

    expect(screen.getByTestId('cat-buttons')).toBeInTheDocument()

    // Simulate resize to mobile width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 320
    })

    // Trigger resize event
    await act(async () => {
      window.dispatchEvent(new Event('resize'))
    })

    expect(screen.getByTestId('cat-select')).toBeInTheDocument()
  })

  it('uses custom breakpoint', async () => {
    // Set width between default and custom breakpoint
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800
    })

    await act(async () => {
      render(<ResponsiveCatSelector onChange={mockOnChange} breakpoint={1000} />)
    })

    expect(screen.getByTestId('cat-select')).toBeInTheDocument()
  })
}) 