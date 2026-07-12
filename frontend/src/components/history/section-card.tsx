/** A titled card wrapping one History chart, with an optional header action. */
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface SectionCardProps {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: SectionCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      {/* overflow-hidden keeps wide charts (heatmap) from pushing the page wide. */}
      <CardContent className="overflow-hidden">{children}</CardContent>
    </Card>
  )
}

/** Placeholder shown while a chart's data loads; matches the chart footprint. */
export function ChartSkeleton({ height = 'h-64' }: { height?: string }) {
  return (
    <div className={`w-full animate-pulse rounded-lg bg-muted/50 ${height}`} aria-hidden />
  )
}

/** Friendly empty state for a section with no data in range. */
export function ChartEmpty({ children }: { children: React.ReactNode }) {
  return <p className="py-12 text-center text-sm text-muted-foreground">{children}</p>
}
