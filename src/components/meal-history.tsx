'use client'

import { useEffect } from 'react'
import { Card } from '@/components/ui/card'
import type { Meal } from '@/lib/types'

interface MealHistoryProps {
  meals: Meal[]
  setMeals: (meals: Meal[]) => void
}

export function MealHistory({ meals, setMeals }: MealHistoryProps) {
  useEffect(() => {
    fetch('/api/meals')
      .then(res => res.json())
      .then(setMeals)
  }, [setMeals])

  if (meals.length === 0) {
    return (
      <div className="text-center text-muted-foreground">
        No meals recorded yet
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Recent Meals</h2>
      {meals.map(meal => (
        <Card key={meal.id} className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">{meal.cat.name}</p>
              <p className="text-sm text-muted-foreground">
                {meal.foodType} - {meal.weight}g
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(meal.createdAt).toLocaleString()}
            </p>
          </div>
        </Card>
      ))}
    </div>
  )
} 