import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Cat, Meal } from '@/lib/types'

export function useCat(id: number) {
  return useQuery({
    queryKey: ['cat', id],
    queryFn: async () => {
      const res = await fetch(`/api/cats/${id}`)
      if (!res.ok) throw new Error('Failed to fetch cat')
      return res.json() as Promise<Cat>
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  })
}

export function useCats() {
  return useQuery({
    queryKey: ['cats'],
    queryFn: async () => {
      const res = await fetch('/api/cats')
      if (!res.ok) throw new Error('Failed to fetch cats')
      return res.json() as Promise<Cat[]>
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  })
}

export function useAddMeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (meal: Omit<Meal, 'id' | 'cat' | 'createdAt'>) => {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meal),
      })
      if (!res.ok) throw new Error('Failed to add meal')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] })
      queryClient.invalidateQueries({ queryKey: ['cats'] })
    },
  })
} 