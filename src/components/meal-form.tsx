'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ErrorAlert } from '@/components/error-alert'
import { logger } from '@/lib/logger'
import type { Meal } from '@/lib/types'

const CATS = [
  { id: 1, name: 'Ahmed' },
  { id: 2, name: 'Knypson' },
  { id: 3, name: 'Lila' },
]

const FOOD_TYPES = [
  { id: 'WET', label: 'Wet Food' },
  { id: 'DRY', label: 'Dry Food' },
]

interface MealFormProps {
  onMealAdded: (meal: Meal) => void
}

export function MealForm({ onMealAdded }: MealFormProps) {
  const [selectedCat, setSelectedCat] = useState<number | null>(null)
  const [foodType, setFoodType] = useState<string | null>(null)
  const [weight, setWeight] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCat || !foodType) return

    try {
      const response = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catId: selectedCat,
          foodType,
          weight: parseFloat(weight),
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const meal = await response.json()
      onMealAdded(meal)
      setSelectedCat(null)
      setFoodType(null)
      setWeight('')
      setError(null)
    } catch (err) {
      const errorMessage = 'Could not save the meal, please try again later!'
      logger.error('Failed to submit meal:', err)
      setError(errorMessage)
    }
  }

  return (
    <Card className="p-4 w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <ErrorAlert description={error} />
        )}
        
        <div className="space-y-2">
          <label id="cat-label" className="text-sm font-medium">Select Cat</label>
          <div className="flex flex-wrap gap-2" aria-labelledby="cat-label">
            {CATS.map((cat) => (
              <Button
                key={cat.id}
                type="button"
                variant={selectedCat === cat.id ? "default" : "outline"}
                onClick={() => setSelectedCat(cat.id)}
                className="flex-1 min-w-[100px]"
              >
                {cat.name}
              </Button>
            ))}
          </div>
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
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            step="0.1"
            className="w-full"
          />
        </div>

        <Button 
          type="submit" 
          className="w-full"
          disabled={!selectedCat || !foodType || !weight}
        >
          Record Meal
        </Button>
      </form>
    </Card>
  )
} 