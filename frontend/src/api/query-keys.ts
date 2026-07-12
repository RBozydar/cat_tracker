/**
 * Query-key scheme and the invalidation map.
 *
 * Keys are hierarchical so a coarse `invalidateQueries({ queryKey: ['cats'] })`
 * transitively refreshes every cat-scoped query (list, detail, weights). The
 * `invalidate*` helpers below are the single source of truth for which caches a
 * mutation touches — mutations call these, they never hand-roll invalidations.
 *
 * Report keys (`today`/`range`/`comparison`) exist now even though those
 * endpoints ship in Phases 4/5, so meal/cat/settings mutations already fan out
 * to them and the dashboard/history work slots in without revisiting this file.
 */
import type { QueryClient } from '@tanstack/react-query'

export interface MealListParams {
  catId?: number
  start?: string
  end?: string
  limit?: number
}

export interface RangeParams {
  catId: number
  start: string
  end: string
}

export interface ComparisonParams {
  start: string
  end: string
}

export const queryKeys = {
  foods: {
    all: ['foods'] as const,
    list: (includeArchived: boolean) => ['foods', 'list', { includeArchived }] as const,
  },
  cats: {
    all: ['cats'] as const,
    list: () => ['cats', 'list'] as const,
    detail: (id: number) => ['cats', id] as const,
    weights: (id: number) => ['cats', id, 'weights'] as const,
  },
  meals: {
    all: ['meals'] as const,
    list: (params: MealListParams) => ['meals', 'list', params] as const,
    suggestions: (catId: number) => ['meals', 'suggestions', catId] as const,
  },
  settings: {
    all: ['settings'] as const,
  },
  targetSuggestion: (catId: number) => ['target-suggestion', catId] as const,
  // Onboarding calculator, keyed on the entered weights (no cat yet).
  targetSuggestionByWeight: (weightKg: number, goalWeightKg?: number) =>
    ['target-suggestion', 'by-weight', weightKg, goalWeightKg ?? null] as const,
  reports: {
    all: ['reports'] as const,
    today: () => ['reports', 'today'] as const,
    range: (params: RangeParams) => ['reports', 'range', params] as const,
    comparison: (params: ComparisonParams) => ['reports', 'comparison', params] as const,
  },
} as const

// --- Invalidation map ------------------------------------------------------

/**
 * Food create/update/delete. Archiving a food can clear cat defaults and always
 * changes the logging library, so cats and reports refresh alongside foods.
 * Meals refresh too: recent-meal rows show the live food name, and re-log
 * chips price against the food's current basis/kcal and must drop archived foods.
 */
export function invalidateAfterFoodMutation(client: QueryClient): void {
  void client.invalidateQueries({ queryKey: queryKeys.foods.all })
  void client.invalidateQueries({ queryKey: queryKeys.cats.all })
  void client.invalidateQueries({ queryKey: queryKeys.meals.all })
  void client.invalidateQueries({ queryKey: queryKeys.reports.all })
}

/**
 * Cat create/update/delete (incl. applying a suggested target). Meals refresh
 * too: a rename changes cat names cached in recent-meal rows, and
 * `default_wet_food_id`/`default_dry_food_id`/`target_kcal` edits feed
 * `/meals/suggestions`' no-history fallback portions.
 */
export function invalidateAfterCatMutation(client: QueryClient, catId?: number): void {
  void client.invalidateQueries({ queryKey: queryKeys.cats.all })
  void client.invalidateQueries({ queryKey: queryKeys.meals.all })
  void client.invalidateQueries({ queryKey: queryKeys.reports.all })
  if (catId !== undefined) {
    void client.invalidateQueries({ queryKey: queryKeys.targetSuggestion(catId) })
  }
}

/** Weigh-in upsert/delete: changes current weight, the target suggestion, and the range weight series. */
export function invalidateAfterWeightMutation(client: QueryClient, catId: number): void {
  void client.invalidateQueries({ queryKey: queryKeys.cats.all })
  void client.invalidateQueries({ queryKey: queryKeys.targetSuggestion(catId) })
  void client.invalidateQueries({ queryKey: queryKeys.reports.all })
}

/**
 * Meal create/update/delete: refreshes history, today/range reports, and
 * re-log suggestions. Cats refresh too: a cat's `meal_count` (shown in the
 * delete-cat warning) is derived from meals and goes stale otherwise.
 */
export function invalidateAfterMealMutation(client: QueryClient): void {
  void client.invalidateQueries({ queryKey: queryKeys.cats.all })
  void client.invalidateQueries({ queryKey: queryKeys.meals.all })
  void client.invalidateQueries({ queryKey: queryKeys.reports.all })
}

/**
 * Settings PUT: timezone shifts day buckets, the portion toggle and
 * meals-per-day change re-log suggestions' default-food fallback.
 */
export function invalidateAfterSettingsMutation(client: QueryClient): void {
  void client.invalidateQueries({ queryKey: queryKeys.settings.all })
  void client.invalidateQueries({ queryKey: queryKeys.meals.all })
  void client.invalidateQueries({ queryKey: queryKeys.reports.all })
}
