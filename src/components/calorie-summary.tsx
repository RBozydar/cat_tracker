import { Card } from "@/components/ui/card"
import type { Cat, Meal } from "@/lib/types"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { logger } from '@/lib/logger'
import { useMeals } from "@/contexts/meal-context"
import { CalorieSummarySkeleton } from './calorie-summary-skeleton'
import { isSameDay } from '@/lib/date-utils'

interface CalorieSummaryProps {
  selectedCatId: number
  date?: string  // Optional date for historical summaries
  hideTitle?: boolean // Optional prop to hide the cat name
}

export function CalorieSummary({ selectedCatId, date, hideTitle = false }: CalorieSummaryProps) {
  const { meals } = useMeals()
  const [cat, setCat] = useState<Cat | null>(null)
  const [todaysMeals, setTodaysMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch cat data
  useEffect(() => {
    setLoading(true)

    fetch(`/api/cats/${selectedCatId}`)
      .then(res => res.json())
      .then(catData => {
        if (!catData) throw new Error('Cat not found')
        setCat(catData)
        setError(null)
      })
      .catch(error => {
        logger.error('Failed to fetch cat:', error)
        setError('Failed to load data')
      })
      .finally(() => setLoading(false))
  }, [selectedCatId])

  // Filter meals for the selected date
  useEffect(() => {
    // DO NOT REMOVE - TZ HANDLING
    const targetDate = date ? new Date(date) : new Date()
    const filtered = meals.filter(meal => 
      meal.catId === selectedCatId && 
      isSameDay(new Date(meal.createdAt), targetDate)
    )
    setTodaysMeals(filtered)
  }, [meals, selectedCatId, date])

  if (loading) return <CalorieSummarySkeleton />
  if (error || !cat) return null

  const caloriesConsumed = todaysMeals.reduce((total, meal) => {
    const foodSetting = meal.foodType === 'WET' ? cat.wetFood : cat.dryFood
    return total + (meal.weight / 100) * foodSetting.calories
  }, 0)

  const remainingCalories = cat.targetCalories - caloriesConsumed
  const isOverTarget = remainingCalories < 0

  const statusText = isOverTarget
    ? `${Math.round(Math.abs(remainingCalories))} over target`
    : `${Math.round(remainingCalories)} left`

  const statusClass = cn(
    "font-medium",
    {
      "text-red-600 dark:text-red-400": isOverTarget,
      "text-green-600 dark:text-green-400": !isOverTarget
    }
  )

  return (
    <Card className="p-4 space-y-3">
      {!hideTitle && <h3 className="font-medium">{cat.name}</h3>}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Target:</span>
          <span className="font-medium">{cat.targetCalories} kcal</span>
        </div>
        <div className="flex justify-between">
          <span>Consumed:</span>
          <span className={statusClass}>
            {Math.round(caloriesConsumed)} kcal - {statusText}
          </span>
        </div>
      </div>
    </Card>
  )
} 