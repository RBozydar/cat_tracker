import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function CalorieSummarySkeleton() {
  return (
    <Card className="p-4 space-y-3">
      <Skeleton className="h-5 w-40" />
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </Card>
  )
} 