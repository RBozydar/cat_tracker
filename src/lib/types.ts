export type Cat = {
  id: number
  name: string
  wetFoodId: number
  dryFoodId: number
  wetFood: FoodSetting
  dryFood: FoodSetting
  targetCalories: number
  weight: number
  weightUnit: string
}

export type FoodSetting = {
  id: number
  name: string
  foodType: string
  calories: number
}

export type Meal = {
  id: number
  catId: number
  cat: Cat
  foodType: string
  weight: number
  createdAt: string
} 