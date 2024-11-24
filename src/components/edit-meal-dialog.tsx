'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CatSelect } from "./cat-select"
import { Edit2, CalendarIcon } from "lucide-react"
import { useMeals } from '@/contexts/meal-context'
import { logger } from '@/lib/logger'
import type { Meal } from '@/lib/types'
import { DeleteMealDialog } from './delete-meal-dialog'
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { formatDateTime, localDateToUTC, getUserTimezone } from '@/lib/date-utils'

interface EditMealDialogProps {
  meal: Meal
}

export function EditMealDialog({ meal }: EditMealDialogProps) {
  const { updateMeal } = useMeals()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    catId: meal.catId,
    foodType: meal.foodType,
    weight: meal.weight.toString(),
    date: new Date(meal.createdAt)
  })

  const isValid = 
    formData.catId && 
    formData.foodType && 
    formData.weight && 
    parseFloat(formData.weight) > 0 &&
    formData.date

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    setLoading(true)

    try {
      const response = await fetch(`/api/meals/${meal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catId: formData.catId,
          foodType: formData.foodType,
          weight: parseFloat(formData.weight),
          createdAt: localDateToUTC(formData.date, getUserTimezone())
        })
      })

      if (!response.ok) throw new Error('Failed to update meal')

      const updatedMeal = await response.json()
      updateMeal(updatedMeal)
      setOpen(false)
    } catch (error) {
      logger.error('Failed to update meal:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Meal</DialogTitle>
          <DialogDescription>
            You can edit the meal details here.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Cat</label>
            <CatSelect
              value={formData.catId}
              onChange={(catId) => setFormData(prev => ({ ...prev, catId: catId! }))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Food Type</label>
            <div className="flex gap-2">
              {['WET', 'DRY'].map(type => (
                <Button
                  key={type}
                  type="button"
                  variant={formData.foodType === type ? 'default' : 'outline'}
                  onClick={() => setFormData(prev => ({ ...prev, foodType: type }))}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="weight" className="text-sm font-medium">Weight (g)</label>
            <Input
              id="weight"
              type="number"
              value={formData.weight}
              onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
              min="0"
              step="0.1"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? formatDateTime(formData.date) : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => date && setFormData(prev => ({ ...prev, date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex justify-between">
            <DeleteMealDialog 
              mealId={meal.id}
              mealDescription={`${meal.weight}g of ${meal.foodType} food for ${meal.cat.name}`}
              variant="destructive"
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !isValid}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 