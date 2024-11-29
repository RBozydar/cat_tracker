'use client'

import { MealFormWrapper } from '@/components/meal-form'
import { MealHistory } from '@/components/meal-history'
import { DailySummary } from '@/components/daily-summary'
import { WeeklySummary } from '@/components/weekly-summary'
import { Card } from '@/components/ui/card'

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="grid gap-6">
        <Card className="p-6">
          <MealFormWrapper />
          <h2 className="text-xl font-semibold mb-4">Today's Summary</h2>
          <DailySummary />
          <WeeklySummary />

          <MealHistory />
        </Card>
      </div>
    </div>
  )
} 