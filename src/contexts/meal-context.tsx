'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { Meal } from '@/lib/types'
import { TZDate, tz } from '@date-fns/tz'
import { format } from 'date-fns'

interface MealContextType {
  meals: Meal[] | null
  loading: boolean
  error: Error | null
  fetchMeals: (params: FetchParams) => Promise<void>
  refetch: () => Promise<void>
}

interface FetchParams {
  startDate: string
  endDate?: string
  timezone: string
  catId?: number
}

const MealContext = createContext<MealContextType | undefined>(undefined)

export function MealProvider({ children }: { children: React.ReactNode }) {
  const [meals, setMeals] = useState<Meal[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

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
      if (!response.ok) throw new Error('Failed to fetch meals')
      
      const data = await response.json()
      console.log('Fetched meals:', data)
      setMeals(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching meals:', err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [])

  // Simple refetch for components that don't need parameters
  const refetch = useCallback(async () => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const today = new Date()
    await fetchMeals({
      startDate: today.toISOString(),
      timezone
    })
  }, [fetchMeals])

  // Initial fetch
  useEffect(() => {
    refetch()
  }, [refetch])

  return (
    <MealContext.Provider value={{ 
      meals, 
      loading,
      error,
      fetchMeals,
      refetch
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