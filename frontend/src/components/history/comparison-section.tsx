/**
 * Multi-cat comparison for the shared range: average kcal/day vs target with an
 * adherence % per cat. One `reports/comparison` call for all cats.
 */
import { useComparisonReport } from '@/api/reports'
import { ComparisonTable } from '@/components/charts/comparison-table'
import type { DateRange } from './date-range'
import { ChartEmpty, ChartSkeleton, SectionCard } from './section-card'

interface ComparisonSectionProps {
  range: DateRange
}

export function ComparisonSection({ range }: ComparisonSectionProps) {
  const comparison = useComparisonReport({ start: range.start, end: range.end })

  return (
    <SectionCard
      title="Multi-cat comparison"
      description="Average calories per day against each cat's target. Bars past the line are over target."
    >
      {comparison.isPending ? (
        <ChartSkeleton height="h-40" />
      ) : comparison.isError ? (
        <p className="py-8 text-center text-sm text-destructive">{comparison.error.message}</p>
      ) : comparison.data.cats.length === 0 ? (
        <ChartEmpty>No cats to compare yet. Add cats in Settings.</ChartEmpty>
      ) : (
        <ComparisonTable cats={comparison.data.cats} />
      )}
    </SectionCard>
  )
}
