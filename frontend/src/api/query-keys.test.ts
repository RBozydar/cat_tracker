import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import {
  invalidateAfterFoodMutation,
  invalidateAfterMealMutation,
  invalidateAfterSettingsMutation,
  queryKeys,
} from './query-keys'

function invalidatedKeyRoots(client: QueryClient, run: (client: QueryClient) => void): unknown[][] {
  const spy = vi.spyOn(client, 'invalidateQueries')
  run(client)
  return spy.mock.calls.map((call) => (call[0] as { queryKey: unknown[] }).queryKey)
}

describe('invalidation map', () => {
  it('food mutations also refresh meals (recent-meal food names, re-log chips)', () => {
    const client = new QueryClient()
    const keys = invalidatedKeyRoots(client, invalidateAfterFoodMutation)
    expect(keys).toContainEqual(queryKeys.meals.all)
  })

  it('settings mutations also refresh meals (suggestion default-food fallback)', () => {
    const client = new QueryClient()
    const keys = invalidatedKeyRoots(client, invalidateAfterSettingsMutation)
    expect(keys).toContainEqual(queryKeys.meals.all)
  })

  it('meal mutations refresh meals and reports', () => {
    const client = new QueryClient()
    const keys = invalidatedKeyRoots(client, invalidateAfterMealMutation)
    expect(keys).toContainEqual(queryKeys.meals.all)
    expect(keys).toContainEqual(queryKeys.reports.all)
  })
})
