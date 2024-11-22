'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import type { Meal } from '@/lib/types'
import { calculateMealSummaries, filterMealsByDate, type FoodSettings } from '@/lib/meal-calculations'

export function DailySummary({ meals }: { meals: Meal[] }) {
  const [settings, setSettings] = useState<FoodSettings[]>([])
  
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(setSettings)
  }, [])

  const today = new Date().toISOString().split('T')[0]
  const todaysMeals = filterMealsByDate(meals, today)
  const summaryBycat = calculateMealSummaries(todaysMeals, settings)

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Today&apos;s Summary</h2>
      {Object.entries(summaryBycat).map(([catName, summary]) => (
        <Card key={catName} className="p-4">
          <div className="space-y-2">
            <h3 className="font-medium">{catName}</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Wet Food: {summary.wet.weight}g ({Math.round(summary.wet.calories)} kcal)</p>
              <p>Dry Food: {summary.dry.weight}g ({Math.round(summary.dry.calories)} kcal)</p>
              <p className="font-medium">Total: {Math.round(summary.totalCalories)} kcal</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
} 