'use client'

import type { Meal } from '@/lib/types'
import { CalorieSummary } from './calorie-summary'

export function DailySummary({ meals }: { meals: Meal[] }) {
  // Group meals by cat
  const mealsByCat = meals.reduce((acc, meal) => {
    const catMeals = acc.get(meal.cat.id) || []
    catMeals.push(meal)
    acc.set(meal.cat.id, catMeals)
    return acc
  }, new Map<number, Meal[]>())

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Today's Summary</h2>
      {Array.from(mealsByCat.entries()).map(([catId]) => (
        <CalorieSummary key={catId} selectedCatId={catId} />
      ))}
    </div>
  )
} 