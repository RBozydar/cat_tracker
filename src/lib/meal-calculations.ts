import type { Meal } from './types'
import { startOfDay, endOfDay, format } from 'date-fns'
import { TZDate, tz } from '@date-fns/tz'

type FoodSettings = {
  foodType: string
  calories: number
}

type CatSummary = {
  wet: { weight: number; calories: number }
  dry: { weight: number; calories: number }
  totalCalories: number
}

export function calculateMealSummaries(meals: Meal[], settings: FoodSettings[]) {
  return meals.reduce((acc, meal) => {
    if (!acc[meal.cat.name]) {
      acc[meal.cat.name] = {
        wet: { weight: 0, calories: 0 },
        dry: { weight: 0, calories: 0 },
        totalCalories: 0
      }
    }

    const foodSetting = settings.find(s => s.foodType === meal.foodType)
    const calories = foodSetting 
      ? (meal.weight / 100) * foodSetting.calories 
      : 0

    if (meal.foodType === 'WET') {
      acc[meal.cat.name].wet.weight += meal.weight
      acc[meal.cat.name].wet.calories += calories
    } else {
      acc[meal.cat.name].dry.weight += meal.weight
      acc[meal.cat.name].dry.calories += calories
    }
    
    acc[meal.cat.name].totalCalories += calories
    return acc
  }, {} as Record<string, CatSummary>)
}

export function filterMealsByDate(meals: Meal[], date: string) {
  return meals.filter(meal => meal.createdAt.split('T')[0] === date)
}

export function groupMealsByDate(
  meals: Array<{ createdAt: string; catId: number }>, 
  timezone: string
) {
  return meals.reduce((acc, meal) => {
    const tzDate = TZDate.tz(timezone, new Date(meal.createdAt))
    const dateKey = format(tzDate, 'M/d/yyyy', { in: tz(timezone) })
    
    if (!acc.has(dateKey)) {
      acc.set(dateKey, new Set<number>())
    }
    acc.get(dateKey)!.add(meal.catId)
    return acc
  }, new Map<string, Set<number>>())
}

export function createDateRangeQuery(startDate: string, timezone: string, endDate?: string) {
  const tzStart = TZDate.tz(timezone, new Date(startDate))
  const tzEnd = endDate ? TZDate.tz(timezone, new Date(endDate)) : tzStart
  
  return {
    gte: format(startOfDay(tzStart), "yyyy-MM-dd'T'HH:mm:ss'Z'", { in: tz(timezone) }),
    lte: format(endOfDay(tzEnd), "yyyy-MM-dd'T'HH:mm:ss'Z'", { in: tz(timezone) })
  }
}

export type { CatSummary, FoodSettings } 