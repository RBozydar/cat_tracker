'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import type { Meal, RequestMetadata, FetchState } from '@/lib/types'
import { TZDate, tz } from '@date-fns/tz'
import { format } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'

interface MealContextType {
  meals: Meal[] | null
  loading: boolean
  error: Error | null
  fetchMeals: (params: FetchParams) => Promise<void>
  refetch: () => Promise<void>
  addMeal: (meal: Meal) => void
  updateMeal: (meal: Meal) => void
  deleteMeal: (id: number) => void
}

interface FetchParams {
  startDate: string
  endDate?: string
  timezone: string
  catId?: number
}

interface RequestMetadata {
  requestId: string
  timestamp: number
  params: FetchParams
}

interface FetchState {
  latestRequest: RequestMetadata | null
  activeRequests: Map<string, RequestMetadata>
}

const MealContext = createContext<MealContextType | undefined>(undefined)

export function MealProvider({ children }: { children: React.ReactNode }) {
  const [meals, setMeals] = useState<Meal[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [fetchState, setFetchState] = useState<FetchState>({
    latestRequest: null,
    activeRequests: new Map()
  })
  const abortControllerRef = useRef<AbortController | null>(null)

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const addMeal = useCallback((newMeal: Meal) => {
    setMeals(prevMeals => {
      if (!prevMeals) return [newMeal]
      return [newMeal, ...prevMeals]
    })
  }, [])

  const updateMeal = useCallback((updatedMeal: Meal) => {
    setMeals(prevMeals => {
      if (!prevMeals) return null
      return prevMeals.map(meal => 
        meal.id === updatedMeal.id ? updatedMeal : meal
      )
    })
  }, [])

  const deleteMeal = useCallback((id: number) => {
    setMeals(prevMeals => {
      if (!prevMeals) return null
      return prevMeals.filter(meal => meal.id !== id)
    })
  }, [])

  const fetchMeals = useCallback(async (params: FetchParams) => {
    // Abort previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    const requestKey = JSON.stringify({
      startDate: params.startDate,
      endDate: params.endDate,
      timezone: params.timezone,
      catId: params.catId
    })

    // Check for duplicate request
    if (fetchState.activeRequests.has(requestKey)) {
      console.log('[MealContext] Skipping duplicate request:', { params })
      return
    }

    try {
      setLoading(true)
      const requestMetadata: RequestMetadata = {
        requestId: uuidv4(),
        timestamp: Date.now(),
        params
      }

      // Track this request
      setFetchState(prev => ({
        latestRequest: requestMetadata,
        activeRequests: new Map(prev.activeRequests).set(requestKey, requestMetadata)
      }))

      console.log('[MealContext] Starting fetch:', { 
        requestKey,
        requestMetadata,
        activeRequests: Array.from(fetchState.activeRequests.keys())
      })

      const tzStart = TZDate.tz(params.timezone, new Date(params.startDate))
      const tzEnd = params.endDate ? TZDate.tz(params.timezone, new Date(params.endDate)) : undefined

      const searchParams = new URLSearchParams({
        startDate: format(tzStart, "yyyy-MM-dd'T'HH:mm:ss'Z'", { in: tz(params.timezone) }),
        timezone: params.timezone,
        requestId: requestMetadata.requestId,
        timestamp: requestMetadata.timestamp.toString()
      })
      
      if (tzEnd) {
        searchParams.append('endDate', format(tzEnd, "yyyy-MM-dd'T'HH:mm:ss'Z'", { in: tz(params.timezone) }))
      }
      if (params.catId) {
        searchParams.append('catId', params.catId.toString())
      }

      const response = await fetch(`/api/meals?${searchParams}`, {
        signal: abortControllerRef.current.signal
      })
      if (!response.ok) throw new Error('Failed to fetch meals')
      
      const data = await response.json()
      const responseMetadata = {
        requestId: response.headers.get('x-request-id'),
        timestamp: Number(response.headers.get('x-request-timestamp'))
      }

      console.log('[MealContext] Response received:', {
        requestKey,
        responseMetadata,
        dataLength: data.length
      })

      // Validate that this response matches our latest request
      if (fetchState.latestRequest && (
        responseMetadata.requestId !== fetchState.latestRequest.requestId ||
        responseMetadata.timestamp !== fetchState.latestRequest.timestamp
      )) {
        console.warn('[MealContext] Received stale response, ignoring', {
          received: responseMetadata,
          latest: fetchState.latestRequest
        })
        return
      }

      setMeals(data)
      setError(null)
    } catch (err) {
      // Don't set error state if request was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('[MealContext] Request aborted:', { requestKey })
        return
      }
      console.error('[MealContext] Error fetching meals:', err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      if (abortControllerRef.current?.signal.aborted) {
        console.log('[MealContext] Skipping state updates for aborted request')
        return
      }
      // Remove this request from active requests
      setFetchState(prev => ({
        ...prev,
        activeRequests: new Map(
          Array.from(prev.activeRequests.entries())
            .filter(([key]) => key !== requestKey)
        )
      }))
      setLoading(false)
    }
  }, [fetchState])

  // Debug effect to track state changes
  useEffect(() => {
    console.log('[MealContext] Debug state:', {
      meals,
      loading,
      error,
      activeRequests: Array.from(fetchState.activeRequests.keys()),
      timestamp: Date.now()
    })
  }, [meals, loading, error, fetchState])

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
      refetch,
      addMeal,
      updateMeal,
      deleteMeal
    }}>
      {children}
    </MealContext.Provider>
  )
}

// Add error boundary component
export class MealErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('[MealErrorBoundary] Caught error:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-red-500">
          Something went wrong loading meal data. Please try refreshing the page.
        </div>
      )
    }

    return this.props.children
  }
}

// Update the hook with better error handling
export function useMeals() {
  const context = useContext(MealContext)
  if (context === undefined) {
    throw new Error('useMeals must be used within a MealProvider')
  }
  return context
} 