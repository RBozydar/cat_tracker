'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { ResponsiveCatSelector } from './responsive-cat-selector'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { logger } from '@/lib/logger'
import { EditMealDialog } from './edit-meal-dialog'
import { useMeals } from '@/contexts/meal-context'
import type { Meal } from '@/lib/types'
import { DeleteMealDialog } from './delete-meal-dialog'
import { MealHistorySkeleton } from './meal-history-skeleton'
import { formatDateTime, getUserTimezone } from '@/lib/date-utils'

export function MealHistory() {
  const { meals, loading } = useMeals()
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null)
  const [filteredMeals, setFilteredMeals] = useState<Meal[]>([])
  const timezone = getUserTimezone()

  useEffect(() => {
    if (!meals) return
    
    if (selectedCatId) {
      setFilteredMeals(meals.filter(meal => meal.catId === selectedCatId))
    } else {
      setFilteredMeals(meals)
    }
  }, [selectedCatId, meals])

  const calculateCalories = (meal: Meal) => {
    try {
      const foodSettings = meal.foodType === 'WET' ? meal.cat.wetFood : meal.cat.dryFood
      if (!foodSettings?.calories) {
        logger.error('Missing food settings for meal:', meal)
        return 0
      }
      return Math.round((meal.weight / 100) * foodSettings.calories)
    } catch (error) {
      logger.error('Failed to calculate calories:', error)
      return 0
    }
  }

  if (loading) {
    return <MealHistorySkeleton />
  }

  if (!meals || meals.length === 0) {
    return (
      <Card className="p-4">
        <div className="text-center text-muted-foreground">No meals recorded yet.</div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-semibold">Recent Meals</h2>
        <div className="w-full sm:w-auto">
          <ResponsiveCatSelector
            value={selectedCatId}
            onChange={setSelectedCatId}
            includeAll
            placeholder="Filter by cat..."
            breakpoint={300}
          />
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>Cat</TableHead>
              <TableHead>Food Type</TableHead>
              <TableHead className="text-right">Weight (g)</TableHead>
              <TableHead className="text-right">Calories</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMeals.map((meal) => (
              <TableRow key={meal.id}>
                <TableCell>
                  {formatDateTime(meal.createdAt, timezone)}
                </TableCell>
                <TableCell>{meal.cat.name}</TableCell>
                <TableCell>{meal.foodType}</TableCell>
                <TableCell className="text-right">{meal.weight}</TableCell>
                <TableCell className="text-right">{calculateCalories(meal)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <EditMealDialog meal={meal} />
                    <DeleteMealDialog 
                      mealId={meal.id}
                      mealDescription={`${meal.weight}g of ${meal.foodType} food for ${meal.cat.name}`}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
} 