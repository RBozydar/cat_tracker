'use client'

import { Card } from "@/components/ui/card"
import type { Meal } from '@/lib/types'
import { CalorieSummary } from './calorie-summary'

export function WeeklySummary({ meals }: { meals: Meal[] }) {
  // Group meals by date and cat
  const mealsByDateAndCat = meals.reduce((acc, meal) => {
    const date = meal.createdAt.split('T')[0]
    if (!acc.has(date)) {
      acc.set(date, new Set())
    }
    acc.get(date)!.add(meal.cat.id)
    return acc
  }, new Map<string, Set<number>>())

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Last 7 Days Summary</h2>
      {Array.from(mealsByDateAndCat.entries()).map(([date, catIds]) => (
        <Card key={date} className="p-4">
          <div className="space-y-3">
            <h3 className="font-medium">{date}</h3>
            <div className="space-y-4 pl-4">
              {Array.from(catIds).map((catId) => (
                <CalorieSummary 
                  key={catId} 
                  selectedCatId={catId} 
                  date={date}
                />
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
} 