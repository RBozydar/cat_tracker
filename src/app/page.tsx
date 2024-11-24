'use client'

import { MealFormWrapper } from '@/components/meal-form'
import { MealHistory } from '@/components/meal-history'
import { DailySummary } from '@/components/daily-summary'
import { WeeklySummary } from '@/components/weekly-summary'

export default function Home() {
  return (
    <main className="container mx-auto py-10">
      <div className="grid gap-8 md:grid-cols-[1fr_300px]">
        <div className="space-y-8">
          <MealFormWrapper />
          <h2 className="text-xl font-semibold mb-4">Today's Summary</h2>
          <DailySummary />
          <WeeklySummary />
        </div>
        <div>
        </div>
        <MealHistory/>
      </div>
    </main>
  )
} 