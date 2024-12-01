import { z } from 'zod'

export const foodSettingSchema = z.object({
  id: z.number(),
  name: z.string(),
  foodType: z.string(),
  calories: z.number()
})

export const catSchema = z.object({
  id: z.number(),
  name: z.string(),
  wetFoodId: z.number(),
  dryFoodId: z.number(),
  targetCalories: z.number(),
  weight: z.number(),
  weightUnit: z.string(),
  wetFood: foodSettingSchema,
  dryFood: foodSettingSchema
})

export const catsSchema = z.array(catSchema) 