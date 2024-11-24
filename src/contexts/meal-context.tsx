'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { logger } from '@/lib/logger'
import type { Meal } from '@/lib/types'

interface MealContextType {
  meals: Meal[]
  addMeal: (meal: Meal) => void
  updateMeal: (updatedMeal: Meal) => void
  deleteMeal: (id: number) => Promise<void>
  loading: boolean
  refetchMeals: () => Promise<void>
}

const MealContext = createContext<MealContextType | undefined>(undefined)

export function MealProvider({ children }: { children: React.ReactNode }) {
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMeals = async () => {
    try {
      const response = await fetch('/api/meals')
      const data = await response.json()
      setMeals(data)
    } catch (error) {
      logger.error('Failed to fetch meals:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMeals()
  }, [])

  const addMeal = (newMeal: Meal) => {
    setMeals(prevMeals => [newMeal, ...prevMeals])
  }

  const updateMeal = (updatedMeal: Meal) => {
    setMeals(prevMeals => 
      prevMeals.map(meal => 
        meal.id === updatedMeal.id ? updatedMeal : meal
      )
    )
  }

  const deleteMeal = async (id: number) => {
    try {
      const response = await fetch(`/api/meals/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete meal')

      setMeals(prevMeals => prevMeals.filter(meal => meal.id !== id))
    } catch (error) {
      logger.error('Failed to delete meal:', error)
      throw error
    }
  }

  const refetchMeals = async () => {
    setLoading(true)
    await fetchMeals()
  }

  return (
    <MealContext.Provider value={{ 
      meals, 
      addMeal, 
      updateMeal,
      deleteMeal,
      loading,
      refetchMeals 
    }}>
      {children}
    </MealContext.Provider>
  )
}

export function useMeals() {
  const context = useContext(MealContext)
  if (context === undefined) {
    throw new Error('useMeals must be used within a MealProvider')
  }
  return context
} 