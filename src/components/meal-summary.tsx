'use client'

import { Card } from "@/components/ui/card"
import { useMeals } from '@/contexts/meal-context'
import { CalorieSummary } from './calorie-summary'
import { getLastNDaysRange, toUserLocaleDateString, getUserTimezone } from '@/lib/date-utils'
import { useState, useEffect } from 'react'
import { TZDate } from '@date-fns/tz'

interface MealSummaryProps {
  days?: number
  SkeletonComponent: React.ComponentType
}

export function MealSummary({ days = 1, SkeletonComponent }: MealSummaryProps) {
  const { meals = [], loading, fetchMeals } = useMeals()
  const [mealsByDateAndCat, setMealsByDateAndCat] = useState(new Map<string, Set<number>>())
  const timezone = getUserTimezone()

  useEffect(() => {
    if (days === 1) {
      const tzNow = TZDate.tz(timezone, new Date())
      tzNow.setHours(0, 0, 0, 0)
      fetchMeals({ 
        startDate: tzNow.toISOString(),
        timezone
      })
    } else {
      const { start, end } = getLastNDaysRange(days, timezone)
      fetchMeals({ 
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        timezone
      })
    }
  }, [days, fetchMeals, timezone])

  useEffect(() => {
    if (!Array.isArray(meals) || meals.length === 0) {
      setMealsByDateAndCat(new Map())
      return
    }
    
    // Group meals by date and cat
    const grouped = meals.reduce((acc, meal) => {
      const mealDate = TZDate.tz(timezone, new Date(meal.createdAt))
      const localDate = toUserLocaleDateString(mealDate, timezone)
      
      console.log('Processing meal:', {
        date: meal.createdAt,
        mealDate,
        localDate,
        catId: meal.catId,
        meal
      })
      
      if (!acc.has(localDate)) {
        acc.set(localDate, new Set())
      }
      acc.get(localDate)!.add(meal.catId)
      return acc
    }, new Map<string, Set<number>>())
    
    console.log('Grouped meals:', Object.fromEntries(grouped))
    
    setMealsByDateAndCat(grouped)
  }, [meals, timezone])

  if (loading) {
    return <SkeletonComponent />
  }

  if (!Array.isArray(meals) || meals.length === 0) {
    return (
      <div className="text-center text-muted-foreground">
        No meals recorded {days === 1 ? 'today' : `in the last ${days} days`}.
      </div>
    )
  }

  if (mealsByDateAndCat.size === 0) {
    return <SkeletonComponent />
  }

  // Sort dates in descending order and filter by days range
  const sortedDates = Array.from(mealsByDateAndCat.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .filter(([date]) => {
      const [month, day, year] = date.split('/')
      const dateObj = TZDate.tz(timezone, new Date(`${year}-${month}-${day}`))
      const { start } = getLastNDaysRange(days, timezone)
      console.log('Filtering date:', { date, dateObj, start, days, result: dateObj >= start })
      return dateObj >= start
    })

  console.log('Sorted dates:', sortedDates)

  return (
    <div className="space-y-4">
      {days > 1 && <h2 className="text-xl font-semibold">Last {days} Days Summary</h2>}
      {sortedDates.map(([date, catIds]) => {
        console.log('Rendering date:', date, 'catIds:', Array.from(catIds))
        return (
          <Card key={date} className={days > 1 ? "p-4" : ""}>
            {days > 1 && <h3 className="font-medium mb-3">{date}</h3>}
            <div className={`space-y-4 ${days > 1 ? "pl-4" : ""}`}>
              {Array.from(catIds).map((catId) => {
                console.log('Rendering CalorieSummary:', { catId, date })
                return (
                  <CalorieSummary 
                    key={catId} 
                    selectedCatId={catId} 
                    date={date}
                  />
                )
              })}
            </div>
          </Card>
        )
      })}
    </div>
  )
} 