import { Card } from "@/components/ui/card"
import type { Meal } from "@/lib/types"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { useMeals } from "@/contexts/meal-context"
import { CalorieSummarySkeleton } from './calorie-summary-skeleton'
import { isSameDay, getUserTimezone } from '@/lib/date-utils'
import { TZDate } from '@date-fns/tz'
import { useCat } from "@/lib/queries"

interface CalorieSummaryProps {
  selectedCatId: number
  date?: string  // Optional date for historical summaries
  hideTitle?: boolean // Optional prop to hide the cat name
}

export function CalorieSummary({ selectedCatId, date, hideTitle = false }: CalorieSummaryProps) {
  const { data: cat, isLoading } = useCat(selectedCatId)
  const { meals = [] } = useMeals()
  const [todaysMeals, setTodaysMeals] = useState<Meal[]>([])
  const timezone = getUserTimezone()

  // Filter meals for the selected date
  useEffect(() => {
    if (!Array.isArray(meals)) {
      setTodaysMeals([])
      return
    }

    const targetDate = date 
      ? TZDate.tz(timezone, new Date(date.split('/').reverse().join('-')))
      : TZDate.tz(timezone)

    // console.log('CalorieSummary filtering for:', {
    //   targetDate: targetDate,
    //   originalDate: date,
    //   mealsCount: meals.length,
    //   catId: selectedCatId
    // })
    
    const filtered = meals.filter(meal => {
      const mealDate = TZDate.tz(timezone, new Date(meal.createdAt))
      const isSame = isSameDay(mealDate, targetDate, timezone)
      // console.log('Comparing dates:', {
      //   mealDate: mealDate,
      //   targetDate: targetDate,
      //   isSame,
      //   catId: meal.catId,
      //   selectedCatId,
      //   meal
      // })
      return meal.catId === selectedCatId && isSame
    })
    
    // console.log('Filtered meals for summary:', filtered)
    setTodaysMeals(filtered)
  }, [meals, selectedCatId, date, timezone])

  if (isLoading) return <CalorieSummarySkeleton />
  if (!cat) return null

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