import { Card } from "@/components/ui/card"
import type { Cat, FoodSetting, Meal } from "@/lib/types"
import { useEffect, useState } from "react"

interface CalorieSummaryProps {
  selectedCatId: number | null
}

export function CalorieSummary({ selectedCatId }: CalorieSummaryProps) {
  const [cat, setCat] = useState<Cat | null>(null)
  const [todaysMeals, setTodaysMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedCatId) {
      setCat(null)
      setTodaysMeals([])
      return
    }

    setLoading(true)
    Promise.all([
      fetch(`/api/cats/${selectedCatId}`).then(res => res.json()),
      fetch(`/api/meals?catId=${selectedCatId}&date=${new Date().toISOString().split('T')[0]}`).then(res => res.json())
    ])
      .then(([catData, mealsData]) => {
        if (!catData) {
          throw new Error('Cat not found')
        }
        setCat(catData)
        setTodaysMeals(mealsData || [])
        setError(null)
      })
      .catch(error => {
        console.error('Failed to fetch data:', error)
        setError('Failed to load cat data')
      })
      .finally(() => setLoading(false))
  }, [selectedCatId])

  if (!selectedCatId || loading || error || !cat) return null

  const caloriesConsumed = todaysMeals.length > 0 
    ? todaysMeals.reduce((total, meal) => {
        const foodSetting = meal.foodType === 'WET' ? cat.wetFood : cat.dryFood
        return total + (meal.weight / 100) * foodSetting.calories
      }, 0)
    : 0

  const remainingCalories = cat.targetCalories - caloriesConsumed

  // Calculate remaining food amounts
  const remainingWetFood = (remainingCalories / cat.wetFood.calories) * 100
  const remainingDryFood = (remainingCalories / cat.dryFood.calories) * 100

  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-medium">Today's Summary for {cat.name}</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Target Calories:</span>
          <span className="font-medium">{cat.targetCalories} kcal</span>
        </div>
        {todaysMeals.length > 0 && (
          <div className="flex justify-between">
            <span>Consumed:</span>
            <span className="font-medium">{Math.round(caloriesConsumed)} kcal</span>
          </div>
        )}
        <div className="flex justify-between text-green-600 dark:text-green-400">
          <span>Remaining:</span>
          <span className="font-medium">{Math.round(remainingCalories)} kcal</span>
        </div>
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
      </div>
    </Card>
  )
} 