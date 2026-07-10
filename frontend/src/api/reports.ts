/**
 * ⚠️  HAND-WRITTEN STOPGAP — CONSOLIDATE WHEN `pnpm gen:api` COVERS reports/*.
 *
 * The `reports/range` and `reports/comparison` endpoints exist in the backend
 * (Phase 2) but the History work landed before `types.gen.ts` was regenerated to
 * include their response schemas, so these types are transcribed by hand from
 * `backend/app/schemas.py` — the BINDING CONTRACT — verbatim:
 *
 *   GET /api/reports/range?cat_id&start&end   → RangeReport
 *   GET /api/reports/comparison?start&end      → ComparisonReport
 *   Dates in/out are household-LOCAL `YYYY-MM-DD`; `fed_at` is a UTC ISO instant.
 *   Errors: 404 unknown cat; 400 when end < start (ApiError from client.ts).
 *
 * When the reports schemas land in `types.gen.ts`, delete these interfaces and
 * re-point the endpoint fns/hooks at the generated `components["schemas"][...]`.
 * The query keys (`queryKeys.reports.range/comparison`) already live in
 * `query-keys.ts` and are re-used unchanged, so mutations already invalidate us.
 */
import type { FoodType } from './types'
import { api, queryString } from './client'
import { queryKeys, type ComparisonParams, type RangeParams } from './query-keys'
import { useQuery } from '@tanstack/react-query'

// --- Response types (mirror schemas.py) ------------------------------------

/** Consumed kcal for one household-local day (zero-filled, continuous across the range). */
export interface DailyKcalPoint {
  date: string
  kcal: number
}

/**
 * One grams-measured meal for the portion-history chart. Only `PER_100G`
 * `WET`/`DRY` meals appear (treats and per-piece meals are excluded by design).
 */
export interface PortionHistoryPoint {
  fed_at: string
  grams: number
  food_type: FoodType
}

export interface WeightPoint {
  measured_on: string
  weight_kg: number
}

/** Everything the History page needs for one cat in one round trip. */
export interface RangeReport {
  cat_id: number
  cat_name: string
  start: string
  end: string
  timezone: string
  target_kcal: number
  daily_kcal: DailyKcalPoint[]
  avg_kcal_per_day: number
  /** % change vs the immediately preceding window of equal length; null → no prior data → render "—". */
  trend_pct: number | null
  /** 7×24 meal-count matrix indexed [weekday][hour]; weekday 0 = Monday, hour 0-23 household-local. */
  timing_pattern: number[][]
  portion_history: PortionHistoryPoint[]
  weight_series: WeightPoint[]
  goal_weight_kg: number | null
}

export interface CatComparison {
  cat_id: number
  cat_name: string
  avg_kcal_per_day: number
  target_kcal: number
  /** avg_kcal_per_day / target_kcal × 100; exceeds 100 when over target. */
  adherence_pct: number
}

export interface ComparisonReport {
  start: string
  end: string
  timezone: string
  cats: CatComparison[]
}

// --- Endpoint functions (usable from smoke scripts / tests, no React) ------

export const reportsApi = {
  range: ({ catId, start, end }: RangeParams) =>
    api.get<RangeReport>(`/reports/range${queryString({ cat_id: catId, start, end })}`),
  comparison: ({ start, end }: ComparisonParams) =>
    api.get<ComparisonReport>(`/reports/comparison${queryString({ start, end })}`),
}

// --- Query hooks -----------------------------------------------------------

/** One cat's full range payload. `enabled` gates it to the active tab. */
export function useRangeReport(params: RangeParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.reports.range(params),
    queryFn: () => reportsApi.range(params),
    enabled,
  })
}

/** All-cats comparison for the shared range. */
export function useComparisonReport(params: ComparisonParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.reports.comparison(params),
    queryFn: () => reportsApi.comparison(params),
    enabled,
  })
}
