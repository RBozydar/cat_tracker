import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ResponsiveCatSelectorSkeleton } from "./responsive-cat-selector-skeleton"

export function MealFormSkeleton() {
  return (
    <Card className="p-4 w-full max-w-md mx-auto">
      <div className="space-y-6">
        <div className="space-y-2 flex flex-col items-center">
          <Skeleton className="h-4 w-20" />
          <ResponsiveCatSelectorSkeleton breakpoint={300} />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </div>
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>

        <Skeleton className="h-10 w-full" />
      </div>
    </Card>
  )
} 