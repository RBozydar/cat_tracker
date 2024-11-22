import type { Meal } from './types'

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

export type { CatSummary, FoodSettings } 