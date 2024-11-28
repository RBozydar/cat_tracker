import { useMeals } from "@/contexts/meal-context"
import { getLastNDaysRange } from "@/lib/date-utils"
import { useEffect, useState } from "react"
import type { Cat } from "@/lib/types"
import { eachDayOfInterval } from "date-fns"
import type { DateRange } from "react-day-picker"

interface CalorieStats {
  weeklyAverage: number
  trend: number
  isIncreasing: boolean
  chartData: Array<{
    date: Date
    calories: number
    target: number
  }>
  recentMeals: Array<{
    createdAt: string
    weight: number
    foodType: 'WET' | 'DRY'
  }>
}

export function useCalorieStats(catId: number, dateRange?: DateRange) {
  const { meals } = useMeals()
  const [cat, setCat] = useState<Cat | null>(null)
  const [stats, setStats] = useState<CalorieStats>({
    weeklyAverage: 0,
    trend: 0,
    isIncreasing: false,
    chartData: [],
    recentMeals: []
  })

  // Fetch cat data
  useEffect(() => {
    fetch(`/api/cats/${catId}`)
      .then(res => res.json())
      .then(setCat)
  }, [catId])

  useEffect(() => {
    if (!cat || !meals) return

    const range = dateRange?.from && dateRange?.to
      ? { start: dateRange.from, end: dateRange.to }
      : getLastNDaysRange(14)
    
    // Filter meals for this cat within date range
    const relevantMeals = meals.filter(meal => {
      const mealDate = new Date(meal.createdAt)
      const startOfDay = new Date(range.start)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(range.end)
      endOfDay.setHours(23, 59, 59, 999)

      const isInRange = mealDate >= startOfDay && mealDate <= endOfDay
      const isForCat = meal.catId === catId

      // Debug logging
      if (isForCat) {
        console.log('Meal filtering details:', {
          mealDate: mealDate.toISOString(),
          startOfDay: startOfDay.toISOString(),
          endOfDay: endOfDay.toISOString(),
          isInRange,
          mealCalories: (meal.weight / 100) * 
            (meal.foodType === 'WET' ? cat.wetFood.calories : cat.dryFood.calories),
          meal
        })
      }

      return isForCat && isInRange
    })

    console.log('Filtered meals for stats:', {
      catId,
      totalMeals: relevantMeals.length,
      meals: relevantMeals
    })

    // Calculate daily totals with dates
    const dailyTotals = new Map<string, { date: Date; calories: number }>()
    
    // Initialize all dates in range
    const days = eachDayOfInterval({ start: range.start, end: range.end })
    days.forEach(date => {
      const dateKey = date.toISOString().split('T')[0]
      dailyTotals.set(dateKey, { date, calories: 0 })
    })
    
    // Add meal calories
    relevantMeals.forEach(meal => {
      const date = new Date(meal.createdAt)
      const dateKey = date.toISOString().split('T')[0]
      const calories = (meal.weight / 100) * 
        (meal.foodType === 'WET' ? cat.wetFood.calories : cat.dryFood.calories)

      console.log('Calculating calories for meal:', {
        dateKey,
        calories,
        meal
      })

      const current = dailyTotals.get(dateKey)
      if (current) {
        dailyTotals.set(dateKey, {
          date: current.date,
          calories: current.calories + calories
        })
      }
    })

    const dailyData = Array.from(dailyTotals.values())
    console.log('Daily calorie totals:', dailyData)

    const last7Days = dailyData.slice(-7)
    const previous7Days = dailyData.slice(-14, -7)

    const currentAvg = last7Days.reduce((sum, day) => sum + day.calories, 0) / last7Days.length
    const previousAvg = previous7Days.reduce((sum, day) => sum + day.calories, 0) / previous7Days.length

    const trend = previousAvg ? ((currentAvg - previousAvg) / previousAvg) * 100 : 0

    setStats({
      weeklyAverage: Math.round(currentAvg),
      trend: Math.abs(Math.round(trend)),
      isIncreasing: trend > 0,
      chartData: last7Days.map(day => ({
        date: day.date,
        calories: day.calories,
        target: cat.targetCalories
      })),
      recentMeals: relevantMeals.map(meal => ({
        createdAt: meal.createdAt,
        weight: meal.weight,
        foodType: meal.foodType as 'WET' | 'DRY'
      }))
    })
  }, [cat, meals, catId, dateRange])

  return stats
} 