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
      cat: { id: 1, name: 'Ahmed' },
      foodType: 'WET',
      weight: 100,
      createdAt: '2024-03-14T12:00:00Z'
    },
    {
      id: 2,
      catId: 1,
      cat: { id: 1, name: 'Ahmed' },
      foodType: 'DRY',
      weight: 50,
      createdAt: '2024-03-14T14:00:00Z'
    },
    {
      id: 3,
      catId: 2,
      cat: { id: 2, name: 'Lila' },
      foodType: 'WET',
      weight: 150,
      createdAt: '2024-03-13T12:00:00Z'
    }
  ]

  describe('calculateMealSummaries', () => {
    it('correctly calculates calories and weights for each cat', () => {
      const result = calculateMealSummaries(mockMeals, mockSettings)

      expect(result.Ahmed).toBeDefined()
      expect(result.Lila).toBeDefined()

      // Check Ahmed's totals
      expect(result.Ahmed.wet.weight).toBe(100)
      expect(result.Ahmed.wet.calories).toBe(100) // 100g * (100kcal/100g)
      expect(result.Ahmed.dry.weight).toBe(50)
      expect(result.Ahmed.dry.calories).toBe(150) // 50g * (300kcal/100g)
      expect(result.Ahmed.totalCalories).toBe(250)

      // Check Lila's totals
      expect(result.Lila.wet.weight).toBe(150)
      expect(result.Lila.wet.calories).toBe(150) // 150g * (100kcal/100g)
      expect(result.Lila.dry.weight).toBe(0)
      expect(result.Lila.dry.calories).toBe(0)
      expect(result.Lila.totalCalories).toBe(150)
    })

    it('handles empty meals array', () => {
      const result = calculateMealSummaries([], mockSettings)
      expect(Object.keys(result)).toHaveLength(0)
    })

    it('handles missing settings', () => {
      const result = calculateMealSummaries(mockMeals, [])
      expect(result.Ahmed.totalCalories).toBe(0)
      expect(result.Lila.totalCalories).toBe(0)
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