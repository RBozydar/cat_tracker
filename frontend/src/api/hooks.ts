/**
 * TanStack Query hooks over the endpoint functions.
 *
 * Queries key off {@link queryKeys}; mutations run the matching `invalidate*`
 * helper from the invalidation map so caches stay consistent without callers
 * spelling out keys. Phase 4/5 add meal/report hooks here against the same keys.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  catsApi,
  foodsApi,
  settingsApi,
  targetSuggestionApi,
  weightsApi,
} from './endpoints'
import {
  invalidateAfterCatMutation,
  invalidateAfterFoodMutation,
  invalidateAfterSettingsMutation,
  invalidateAfterWeightMutation,
  queryKeys,
} from './query-keys'
import type {
  CatCreate,
  CatUpdate,
  FoodCreate,
  FoodUpdate,
  SettingsUpdate,
  WeightCreate,
} from './types'

// --- Foods -----------------------------------------------------------------

export function useFoods(includeArchived = false) {
  return useQuery({
    queryKey: queryKeys.foods.list(includeArchived),
    queryFn: () => foodsApi.list(includeArchived),
  })
}

export function useCreateFood() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: FoodCreate) => foodsApi.create(body),
    onSuccess: () => invalidateAfterFoodMutation(client),
  })
}

export function useUpdateFood() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: FoodUpdate }) => foodsApi.update(id, body),
    onSuccess: () => invalidateAfterFoodMutation(client),
  })
}

export function useDeleteFood() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => foodsApi.remove(id),
    onSuccess: () => invalidateAfterFoodMutation(client),
  })
}

// --- Cats ------------------------------------------------------------------

export function useCats() {
  return useQuery({
    queryKey: queryKeys.cats.list(),
    queryFn: () => catsApi.list(),
  })
}

export function useCreateCat() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: CatCreate) => catsApi.create(body),
    onSuccess: (cat) => invalidateAfterCatMutation(client, cat.id),
  })
}

export function useUpdateCat() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: CatUpdate }) => catsApi.update(id, body),
    onSuccess: (cat) => invalidateAfterCatMutation(client, cat.id),
  })
}

export function useDeleteCat() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => catsApi.remove(id),
    onSuccess: () => invalidateAfterCatMutation(client),
  })
}

// --- Weights ---------------------------------------------------------------

export function useWeights(catId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.cats.weights(catId),
    queryFn: () => weightsApi.list(catId),
    enabled,
  })
}

export function useUpsertWeight() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ catId, body }: { catId: number; body: WeightCreate }) =>
      weightsApi.upsert(catId, body),
    onSuccess: (_result, { catId }) => invalidateAfterWeightMutation(client, catId),
  })
}

export function useDeleteWeight() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ catId, measuredOn }: { catId: number; measuredOn: string }) =>
      weightsApi.remove(catId, measuredOn),
    onSuccess: (_result, { catId }) => invalidateAfterWeightMutation(client, catId),
  })
}

// --- Settings --------------------------------------------------------------

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: () => settingsApi.get(),
  })
}

export function useUpdateSettings() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: SettingsUpdate) => settingsApi.update(body),
    onSuccess: () => invalidateAfterSettingsMutation(client),
  })
}

// --- Target suggestion (calculator) ----------------------------------------

/** Fetched lazily — pass `enabled` so it only runs while the calculator dialog is open. */
export function useTargetSuggestion(catId: number, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.targetSuggestion(catId),
    queryFn: () => targetSuggestionApi.get(catId),
    enabled,
  })
}
