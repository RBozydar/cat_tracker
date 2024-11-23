import type { Cat, Meal } from './types'

export function calculateCalories(meals: Meal[], cat: Cat) {
  const caloriesConsumed = meals.reduce((total, meal) => {
    const foodSetting = meal.foodType === 'WET' ? cat.wetFood : cat.dryFood
    return total + (meal.weight / 100) * foodSetting.calories
  }, 0)

  const remainingCalories = cat.targetCalories - caloriesConsumed
  const remainingPercentage = (remainingCalories / cat.targetCalories) * 100
  const isOverTarget = remainingCalories < 0

  return {
    consumed: caloriesConsumed,
    remaining: remainingCalories,
    percentage: remainingPercentage,
    isOverTarget
  }
}

export function getCalorieStatusColor(remainingCalories: number, targetCalories: number) {
  const remainingPercentage = (remainingCalories / targetCalories) * 100
  
  if (remainingCalories <= 0) return "text-red-600 dark:text-red-400"
  if (remainingPercentage <= 30) return "text-yellow-600 dark:text-yellow-400"
  return "text-green-600 dark:text-green-400"
} 