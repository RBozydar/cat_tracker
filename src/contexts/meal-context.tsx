'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { logger } from '@/lib/logger'
import type { Meal } from '@/lib/types'
import { TZDate, tz } from '@date-fns/tz'
import { format } from 'date-fns'

interface MealContextType {
  meals: Meal[]
  addMeal: (meal: Meal) => void
  updateMeal: (updatedMeal: Meal) => void
  deleteMeal: (id: number) => Promise<void>
  loading: boolean
  fetchMeals: (params: FetchParams) => Promise<void>
}

const MealContext = createContext<MealContextType | undefined>(undefined)

interface MealProviderProps {
  children: React.ReactNode
  initialMeals?: Meal[]
  loading?: boolean
}

interface FetchParams {
  startDate: string
  endDate?: string
  timezone: string
  catId?: number
}

export function MealProvider({ 
  children, 
  initialMeals = [], 
  loading: initialLoading = true 
}: MealProviderProps) {
  const [meals, setMeals] = useState<Meal[]>(initialMeals)
  const [loading, setLoading] = useState(initialLoading)

  const fetchMeals = useCallback(async (params: FetchParams) => {
    try {
      setLoading(true)
      const tzStart = TZDate.tz(params.timezone, new Date(params.startDate))
      const tzEnd = params.endDate ? TZDate.tz(params.timezone, new Date(params.endDate)) : undefined

      const searchParams = new URLSearchParams({
        startDate: format(tzStart, "yyyy-MM-dd'T'HH:mm:ss'Z'", { in: tz(params.timezone) }),
        timezone: params.timezone
      })
      
      if (tzEnd) {
        searchParams.append('endDate', format(tzEnd, "yyyy-MM-dd'T'HH:mm:ss'Z'", { in: tz(params.timezone) }))
      }
      if (params.catId) {
        searchParams.append('catId', params.catId.toString())
      }

      const response = await fetch(`/api/meals?${searchParams}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch meals')
      }
      
      const data = await response.json()
      setMeals(Array.isArray(data) ? data : [])
    } catch (error) {
      logger.error('Failed to fetch meals:', error)
      setMeals([])
    } finally {
      setLoading(false)
    }
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

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete meal')
      }

      setMeals(prevMeals => prevMeals.filter(meal => meal.id !== id))
    } catch (error) {
      logger.error('Failed to delete meal:', error)
      throw error
    }
  }

  return (
    <MealContext.Provider value={{ 
      meals, 
      addMeal, 
      updateMeal,
      deleteMeal,
      loading,
      fetchMeals 
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