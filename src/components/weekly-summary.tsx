import { MealSummary } from './meal-summary'
import { WeeklySummarySkeleton } from './weekly-summary-skeleton' 

export function WeeklySummary() {
  return <MealSummary days={7} SkeletonComponent={WeeklySummarySkeleton} />
} 