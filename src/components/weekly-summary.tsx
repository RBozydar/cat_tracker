'use client'

import { Card } from "@/components/ui/card"
import { useMeals } from '@/contexts/meal-context'
import { CalorieSummary } from './calorie-summary'
import { getLastNDaysRange, isDateInRange, toUserLocaleDateString } from '@/lib/date-utils'
import { useState, useEffect } from 'react'
import { WeeklySummarySkeleton } from './weekly-summary-skeleton'

export function WeeklySummary() {
  const { meals, loading } = useMeals()
  const [mealsByDateAndCat, setMealsByDateAndCat] = useState(new Map<string, Set<number>>())

  useEffect(() => {
    // DO NOT REMOVE - TZ HANDLING
    const { start, end } = getLastNDaysRange(7)
    
    const filtered = meals.filter(meal => 
      isDateInRange(meal.createdAt, start, end)
    )

    // Group meals by local date
    const grouped = filtered.reduce((acc, meal) => {
      const localDate = toUserLocaleDateString(meal.createdAt)
      if (!acc.has(localDate)) {
        acc.set(localDate, new Set())
      }
      acc.get(localDate)!.add(meal.cat.id)
      return acc
    }, new Map<string, Set<number>>())
    
    setMealsByDateAndCat(grouped)
  }, [meals])

  if (loading) {
    return <WeeklySummarySkeleton />
  }

  if (mealsByDateAndCat.size === 0) {
    return <div className="text-center text-muted-foreground">No meals recorded in the last 7 days.</div>
  }

  // Sort dates in descending order
  const sortedDates = Array.from(mealsByDateAndCat.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Last 7 Days Summary</h2>
      {sortedDates.map(([date, catIds]) => (
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