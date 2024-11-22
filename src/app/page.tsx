'use client'

import { useState } from 'react'
import { MealForm } from '@/components/meal-form'
import { MealHistory } from '@/components/meal-history'
import { DailySummary } from '@/components/daily-summary'
import { WeeklySummary } from '@/components/weekly-summary'
import type { Meal } from '@/lib/types'

export default function Home() {
  const [meals, setMeals] = useState<Meal[]>([])

  const handleNewMeal = (meal: Meal) => {
    setMeals(prev => [meal, ...prev])
  }

  return (
    <main className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Cat Meal Tracker</h1>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-8">
          <MealForm onMealAdded={handleNewMeal} />
          <DailySummary meals={meals} />
          <WeeklySummary meals={meals} />
        </div>
        <MealHistory meals={meals} setMeals={setMeals} />
      </div>
    </main>
  )
} 