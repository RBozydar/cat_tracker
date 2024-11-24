import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CalorieSummarySkeleton } from './calorie-summary-skeleton'

export function WeeklySummarySkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="p-4">
          <div className="space-y-3">
            <Skeleton className="h-6 w-24" />
            <div className="space-y-4 pl-4">
              {[...Array(2)].map((_, j) => (
                <CalorieSummarySkeleton key={j} />
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
} 