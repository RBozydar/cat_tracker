import { render } from '@testing-library/react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../card'

describe('Card Components', () => {
  it('renders Card with children', () => {
    const { container } = render(
      <Card>
        <div>Test content</div>
      </Card>
    )
    expect(container.firstChild).toHaveClass('rounded-xl border bg-card text-card-foreground shadow')
  })

  it('renders CardHeader with children', () => {
    const { container } = render(
      <CardHeader>
        <div>Test header</div>
      </CardHeader>
    )
    expect(container.firstChild).toHaveClass('flex flex-col space-y-1.5 p-6')
  })

  it('renders CardTitle with children', () => {
    const { container } = render(
      <CardTitle>Test title</CardTitle>
    )
    expect(container.firstChild).toHaveClass('font-semibold leading-none tracking-tight')
  })

  it('renders CardDescription with children', () => {
    const { container } = render(
      <CardDescription>Test description</CardDescription>
    )
    expect(container.firstChild).toHaveClass('text-sm text-muted-foreground')
  })

  it('renders CardContent with children', () => {
    const { container } = render(
      <CardContent>Test content</CardContent>
    )
    expect(container.firstChild).toHaveClass('p-6 pt-0')
  })

  it('renders CardFooter with children', () => {
    const { container } = render(
      <CardFooter>Test footer</CardFooter>
    )
    expect(container.firstChild).toHaveClass('flex items-center p-6 pt-0')
  })

  it('combines Card components correctly', () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    )
    expect(container.firstChild).toBeInTheDocument()
  })
}) 