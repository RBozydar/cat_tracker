/**
 * ⚠️  HAND-WRITTEN STOPGAP — DELETE ME ONCE PHASE 2 SHIPS.
 *
 * `GET /api/target-suggestion` is being built in parallel (Phase 2) and is not
 * yet in the OpenAPI schema that `pnpm gen:api` reads, so these types cannot be
 * generated. They mirror the BINDING CONTRACT agreed with the backend
 * implementer verbatim:
 *
 *   GET /api/target-suggestion?cat_id=N → 200
 *   { cat_id, current_weight_kg, goal_weight_kg, rer_kcal, factor, basis,
 *     suggested_target_kcal }
 *   Errors: 404 unknown cat; 400 when the cat has neither goal weight nor any
 *   weight entries.
 *
 * When the endpoint lands in `types.gen.ts`, delete this file and re-point the
 * `target-suggestion` hook/endpoint at the generated `components["schemas"]`.
 */

/** Which weight the suggestion was computed from. */
export type TargetSuggestionBasis = 'GOAL_WEIGHT' | 'CURRENT_WEIGHT'

export interface TargetSuggestion {
  cat_id: number
  current_weight_kg: number | null
  goal_weight_kg: number | null
  /** Resting energy requirement: 70 × kg^0.75. */
  rer_kcal: number
  /** Multiplier applied to RER (0.8 weight-loss on goal, 1.2 maintenance on current). */
  factor: number
  basis: TargetSuggestionBasis
  suggested_target_kcal: number
}
