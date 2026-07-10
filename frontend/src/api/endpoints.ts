/**
 * Typed endpoint functions — one thin call per backend route.
 *
 * These are plain async functions (no React) so they can be exercised from a
 * node smoke script or unit test as easily as from a query hook.
 */
import { api, queryString } from './client'
import type { TargetSuggestion } from './target-suggestion.types'
import type {
  Cat,
  CatCreate,
  CatUpdate,
  Food,
  FoodCreate,
  FoodDeleteResult,
  FoodUpdate,
  Meal,
  MealCreate,
  MealUpdate,
  Settings,
  SettingsUpdate,
  Weight,
  WeightCreate,
} from './types'

export const foodsApi = {
  list: (includeArchived = false) =>
    api.get<Food[]>(`/foods${queryString({ include_archived: includeArchived || undefined })}`),
  create: (body: FoodCreate) => api.post<Food>('/foods', body),
  update: (id: number, body: FoodUpdate) => api.patch<Food>(`/foods/${id}`, body),
  remove: (id: number) => api.delete<FoodDeleteResult>(`/foods/${id}`),
}

export const catsApi = {
  list: () => api.get<Cat[]>('/cats'),
  get: (id: number) => api.get<Cat>(`/cats/${id}`),
  create: (body: CatCreate) => api.post<Cat>('/cats', body),
  update: (id: number, body: CatUpdate) => api.patch<Cat>(`/cats/${id}`, body),
  remove: (id: number) => api.delete<void>(`/cats/${id}`),
}

export const weightsApi = {
  list: (catId: number) => api.get<Weight[]>(`/cats/${catId}/weights`),
  upsert: (catId: number, body: WeightCreate) =>
    api.post<Weight>(`/cats/${catId}/weights`, body),
  remove: (catId: number, measuredOn: string) =>
    api.delete<void>(`/cats/${catId}/weights/${measuredOn}`),
}

export const mealsApi = {
  list: (params: { cat_id?: number; start?: string; end?: string; limit?: number } = {}) =>
    api.get<Meal[]>(`/meals${queryString(params)}`),
  create: (body: MealCreate) => api.post<Meal>('/meals', body),
  update: (id: number, body: MealUpdate) => api.patch<Meal>(`/meals/${id}`, body),
  remove: (id: number) => api.delete<void>(`/meals/${id}`),
}

export const settingsApi = {
  get: () => api.get<Settings>('/settings'),
  update: (body: SettingsUpdate) => api.put<Settings>('/settings', body),
}

// Hand-written until Phase 2 adds the endpoint to the OpenAPI schema.
export const targetSuggestionApi = {
  get: (catId: number) =>
    api.get<TargetSuggestion>(`/target-suggestion${queryString({ cat_id: catId })}`),
}
