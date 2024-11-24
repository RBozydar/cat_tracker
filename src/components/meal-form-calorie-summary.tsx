import { Card } from "@/components/ui/card"
import type { Cat, Meal } from "@/lib/types"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { logger } from '@/lib/logger'
import { useMeals } from "@/contexts/meal-context"
import { CalorieSummarySkeleton } from './calorie-summary-skeleton'
import { toUserLocaleDateString, getTodayInUserTimezone } from '@/lib/date-utils'

interface MealFormCalorieSummaryProps {
  selectedCatId: number
}

interface PortionSettings {
  suggestPortionSizes: boolean
  mealsPerDay: number
}

export function MealFormCalorieSummary({ selectedCatId }: MealFormCalorieSummaryProps) {
  const { meals } = useMeals()
  const [cat, setCat] = useState<Cat | null>(null)
  const [todaysMeals, setTodaysMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [portionSettings, setPortionSettings] = useState<PortionSettings | null>(null)

  useEffect(() => {
    setLoading(true)

    Promise.all([
      fetch(`/api/cats/${selectedCatId}`).then(res => res.json()),
      fetch('/api/portion-settings').then(res => res.json())
    ])
      .then(([catData, settingsData]) => {
        if (!catData) throw new Error('Cat not found')
        setCat(catData)
        setPortionSettings(settingsData)
        setError(null)
      })
      .catch(error => {
        logger.error('Failed to fetch data:', error)
        setError('Failed to load data')
      })
      .finally(() => setLoading(false))
  }, [selectedCatId])

  useEffect(() => {
    const today = getTodayInUserTimezone()
    const filtered = meals.filter(meal => 
      meal.catId === selectedCatId && 
      toUserLocaleDateString(meal.createdAt) === today
    )
    setTodaysMeals(filtered)
  }, [meals, selectedCatId])

  if (loading) return <CalorieSummarySkeleton />
  if (error || !cat) return null

  const caloriesConsumed = todaysMeals.reduce((total, meal) => {
    const foodSetting = meal.foodType === 'WET' ? cat.wetFood : cat.dryFood
    return total + (meal.weight / 100) * foodSetting.calories
  }, 0)

  const remainingCalories = cat.targetCalories - caloriesConsumed
  const remainingPercentage = (remainingCalories / cat.targetCalories) * 100
  const isOverTarget = remainingCalories < 0

  const remainingColorClass = cn(
    "font-medium",
    {
      "text-red-600 dark:text-red-400": remainingCalories <= 0,
      "text-yellow-600 dark:text-yellow-400": remainingCalories > 0 && remainingPercentage <= 30,
      "text-green-600 dark:text-green-400": remainingPercentage > 30
    }
  )

  // Calculate remaining food amounts
  const remainingWetFood = (remainingCalories / cat.wetFood.calories) * 100
  const remainingDryFood = (remainingCalories / cat.dryFood.calories) * 100

  const getSuggestedPortions = () => {
    if (!portionSettings?.suggestPortionSizes || !cat) return null

    const portionSize = {
      wet: (cat.targetCalories / portionSettings.mealsPerDay / cat.wetFood.calories) * 100,
      dry: (cat.targetCalories / portionSettings.mealsPerDay / cat.dryFood.calories) * 100
    }

    return (
      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground mb-2">Suggested portion sizes per meal for {portionSettings.mealsPerDay} meals:</p>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Wet Food ({cat.wetFood.name}):</span>
            <span className="font-medium">{Math.round(portionSize.wet)}g</span>
          </div>
          <div className="flex justify-between">
            <span>Dry Food ({cat.dryFood.name}):</span>
            <span className="font-medium">{Math.round(portionSize.dry)}g</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Target Calories:</span>
          <span className="font-medium">{cat.targetCalories} kcal</span>
        </div>
        {todaysMeals.length > 0 && (
          <div className="flex justify-between">
            <span>Consumed:</span>
            <span className={cn("font-medium", {
              "text-red-600 dark:text-red-400": isOverTarget
            })}>
              {Math.round(caloriesConsumed)} kcal
              {isOverTarget && " (Over target!)"}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Remaining:</span>
          <span className={remainingColorClass}>
            {Math.round(Math.abs(remainingCalories))} kcal
            {isOverTarget ? ' over' : ' left'}
          </span>
        </div>
        {!isOverTarget && remainingCalories > 0 && (
          <div className="pt-2 space-y-1">
            <p className="text-xs text-muted-foreground">Can be achieved with either:</p>
            <div className="flex justify-between">
              <span>Wet Food ({cat.wetFood.name}):</span>
              <span className="font-medium">{Math.round(remainingWetFood)}g</span>
            </div>
            <div className="flex justify-between">
              <span>Dry Food ({cat.dryFood.name}):</span>
              <span className="font-medium">{Math.round(remainingDryFood)}g</span>
            </div>
          </div>
        )}
        {portionSettings?.suggestPortionSizes && getSuggestedPortions()}
      </div>
    </Card>
  )
} 