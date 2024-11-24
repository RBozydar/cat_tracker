'use client'

import { useMeals } from '@/contexts/meal-context'
import { CalorieSummary } from '@/components/calorie-summary'
import type { Meal } from '@/lib/types'
import { useState, useEffect } from 'react'
import { DailySummarySkeleton } from '@/components/daily-summary-skeleton'
import { getTodayInUserTimezone, toUserLocaleDateString } from '@/lib/date-utils'

export function DailySummary() {
  const { meals, loading } = useMeals()
  const [todaysMeals, setTodaysMeals] = useState<Meal[]>([])

  useEffect(() => {
    // DO NOT REMOVE - TZ HANDLING
    const today = getTodayInUserTimezone()
    
    const filtered = meals.filter(meal => 
      toUserLocaleDateString(meal.createdAt) === today
    )
    setTodaysMeals(filtered)
  }, [meals])

  if (loading) {
    return <DailySummarySkeleton />
  }

  // Group meals by cat
  const mealsByCat = todaysMeals.reduce((acc, meal) => {
    const catMeals = acc.get(meal.cat.id) || []
    catMeals.push(meal)
    acc.set(meal.cat.id, catMeals)
    return acc
  }, new Map<number, Meal[]>())

  if (mealsByCat.size === 0) {
    return <div className="text-center text-muted-foreground">No meals recorded today.</div>
  }

  return (
    <div className="space-y-4">
      {Array.from(mealsByCat.entries()).map(([catId]) => (
        <CalorieSummary key={catId} selectedCatId={catId} />
      ))}
    </div>
  )
} 