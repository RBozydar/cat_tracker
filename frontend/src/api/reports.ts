/**
 * History reports — `reports/range` (per cat) and `reports/comparison` (all cats).
 *
 * Response types come from the generated OpenAPI schema (re-exported here so the
 * History components can keep importing them from `@/api/reports`). Dates in/out
 * are household-LOCAL `YYYY-MM-DD`; `fed_at` is a UTC ISO instant. Errors: 404
 * unknown cat; 400 when end < start (ApiError from client.ts). The query keys
 * (`queryKeys.reports.range/comparison`) live in `query-keys.ts`, so mutations
 * already invalidate these.
 */
import { api, queryString } from './client'
import { queryKeys, type ComparisonParams, type RangeParams } from './query-keys'
import type {
  CatComparison,
  ComparisonReport,
  DailyKcalPoint,
  PortionHistoryPoint,
  RangeReport,
  WeightPoint,
} from './types'
import { useQuery } from '@tanstack/react-query'

export type {
  CatComparison,
  ComparisonReport,
  DailyKcalPoint,
  PortionHistoryPoint,
  RangeReport,
  WeightPoint,
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
