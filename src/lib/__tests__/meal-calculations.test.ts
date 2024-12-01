import { calculateMealSummaries, filterMealsByDate } from '../meal-calculations'

describe('meal-calculations', () => {
  const mockSettings = [
    { foodType: 'WET', calories: 100 },
    { foodType: 'DRY', calories: 300 }
  ]

  const mockMeals = [
    {
      id: 1,
      catId: 1,
      cat: {
        id: 1,
        name: 'Test Cat',
        wetFoodId: 1,
        dryFoodId: 2,
        wetFood: { id: 1, name: 'Wet Food', foodType: 'WET' as const, calories: 100 },
        dryFood: { id: 2, name: 'Dry Food', foodType: 'DRY' as const, calories: 300 },
        targetCalories: 250,
        weight: 4.5,
        weightUnit: 'kg'
      },
      foodType: 'WET' as const,
      weight: 100,
      createdAt: '2024-03-14T12:00:00Z'
    },
    {
      id: 2,
      catId: 1,
      cat: {
        id: 1,
        name: 'Test Cat',
        wetFoodId: 1,
        dryFoodId: 2,
        wetFood: { id: 1, name: 'Wet Food', foodType: 'WET' as const, calories: 100 },
        dryFood: { id: 2, name: 'Dry Food', foodType: 'DRY' as const, calories: 300 },
        targetCalories: 250,
        weight: 4.5,
        weightUnit: 'kg'
      },
      foodType: 'DRY' as const,
      weight: 50,
      createdAt: '2024-03-14T14:00:00Z'
    }
  ]

  describe('calculateMealSummaries', () => {
    it('correctly calculates calories and weights for each cat', () => {
      const result = calculateMealSummaries(mockMeals, mockSettings)

      expect(result['Test Cat']).toBeDefined()

      // Check Test Cat's totals
      expect(result['Test Cat'].wet.weight).toBe(100)
      expect(result['Test Cat'].wet.calories).toBe(100) // 100g * (100kcal/100g)
      expect(result['Test Cat'].dry.weight).toBe(50)
      expect(result['Test Cat'].dry.calories).toBe(150) // 50g * (300kcal/100g)
      expect(result['Test Cat'].totalCalories).toBe(250)
    })

    it('handles empty meals array', () => {
      const result = calculateMealSummaries([], mockSettings)
      expect(Object.keys(result)).toHaveLength(0)
    })

    it('handles missing settings', () => {
      const result = calculateMealSummaries(mockMeals, [])
      expect(result['Test Cat'].totalCalories).toBe(0)
    })
  })

  describe('filterMealsByDate', () => {
    it('filters meals for specific date', () => {
      const result = filterMealsByDate(mockMeals, '2024-03-14')
      expect(result).toHaveLength(2)
      expect(result.map(m => m.id)).toEqual([1, 2])
    })

    it('returns empty array for date with no meals', () => {
      const result = filterMealsByDate(mockMeals, '2024-03-15')
      expect(result).toHaveLength(0)
    })
  })
}) 