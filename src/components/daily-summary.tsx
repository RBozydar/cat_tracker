import { MealSummary } from './meal-summary'
import { DailySummarySkeleton } from './daily-summary-skeleton'

export function DailySummary() {
  return <MealSummary days={1} SkeletonComponent={DailySummarySkeleton} />
} 