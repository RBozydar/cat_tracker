export interface FoodSettingHistory {
  calories: number
  effectiveFrom: Date
}

export interface CatHistory {
  targetCalories: number
  effectiveFrom: Date
}

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
  history?: {
    targetCalories: CatHistory[]
    wetFood: FoodSettingHistory[]
    dryFood: FoodSettingHistory[]
  }
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
  foodType: 'WET' | 'DRY'
  weight: number
  createdAt: string
} 