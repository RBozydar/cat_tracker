'use client'

import { useState, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ErrorAlert } from '@/components/error-alert'
import { MealFormCalorieSummary } from './meal-form-calorie-summary'
import { ResponsiveCatSelector } from './responsive-cat-selector'
import { ResponsiveCatSelectorSkeleton } from './responsive-cat-selector-skeleton'
import { useMeals } from '@/contexts/meal-context'
import { logger } from '@/lib/logger'
import { getUserTimezone } from '@/lib/date-utils'
import { MealFormSkeleton } from './meal-form-skeleton'

const FOOD_TYPES = [
  { id: 'WET', label: 'Wet Food' },
  { id: 'DRY', label: 'Dry Food' },
]

export { MealForm }

export function MealFormWrapper() {
  return (
    <Suspense fallback={<MealFormSkeleton />}>
      <MealForm />
    </Suspense>
  )
}

function MealForm() {
  const { addMeal } = useMeals()
  const [selectedCat, setSelectedCat] = useState<number | null>(null)
  const [foodType, setFoodType] = useState<string | null>(null)
  const [weight, setWeight] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCat || !foodType || !weight) return

    try {
      const response = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catId: selectedCat,
          foodType,
          weight: parseFloat(weight),
          timezone: getUserTimezone()
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const meal = await response.json()
      addMeal(meal)
      resetForm()
    } catch (error) {
      logger.error('Failed to submit meal:', error)
      setError('Could not save the meal, please try again later!')
      resetForm()
    }
  }

  const resetForm = () => {
    setSelectedCat(null)
    setFoodType(null)
    setWeight('')
  }

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setWeight(value)
    }
  }

  return (
    <Card className="p-4 w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <ErrorAlert description={error} />}
        
        <div className="space-y-2 flex flex-col items-center">
          <label className="text-sm font-medium">Select Cat</label>
          <Suspense fallback={<ResponsiveCatSelectorSkeleton breakpoint={300} />}>
            <ResponsiveCatSelector
              value={selectedCat}
              onChange={setSelectedCat}
              breakpoint={300}
            />
          </Suspense>
        </div>

        <div className="space-y-2">
          <label id="food-type-label" className="text-sm font-medium">Food Type</label>
          <div className="flex flex-wrap gap-2" aria-labelledby="food-type-label">
            {FOOD_TYPES.map((type) => (
              <Button
                key={type.id}
                type="button"
                variant={foodType === type.id ? "default" : "outline"}
                onClick={() => setFoodType(type.id)}
                className="flex-1"
              >
                {type.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="weight-input" className="text-sm font-medium">Weight (grams)</label>
          <Input
            id="weight-input"
            type="number"
            inputMode="decimal"
            pattern="[0-9]*"
            value={weight}
            onChange={handleWeightChange}
            step="0.1"
            min="1"
            className="w-full"
          />
        </div>

        {selectedCat && <MealFormCalorieSummary selectedCatId={selectedCat} />}

        <Button 
          type="submit" 
          className="w-full"
          disabled={!selectedCat || !foodType || !weight || parseFloat(weight) < 1}
        >
          Record Meal
        </Button>
      </form>
    </Card>
  )
} 