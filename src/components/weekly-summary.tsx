'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import type { Meal } from '@/lib/types'
import { calculateMealSummaries, filterMealsByDate, type FoodSettings } from '@/lib/meal-calculations'

export function WeeklySummary({ meals }: { meals: Meal[] }) {
  const [settings, setSettings] = useState<FoodSettings[]>([])
  
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(setSettings)
  }, [])

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - i)
    return date.toISOString().split('T')[0]
  })

  const weeklySummary = last7Days.map(date => {
    const dayMeals = filterMealsByDate(meals, date)
    const catSummaries = calculateMealSummaries(dayMeals, settings)

    return {
      date,
      cats: catSummaries
    }
  })

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Last 7 Days Summary</h2>
      {weeklySummary.map(day => (
        <Card key={day.date} className="p-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">{day.date}</h3>
            </div>
            <div className="space-y-2">
              {Object.entries(day.cats).map(([catName, summary]) => (
                <div key={catName} className="pl-4 border-l-2 border-muted">
                  <p className="font-medium">{catName}</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p className="font-medium">Total: {Math.round(summary.totalCalories)} kcal</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
} 