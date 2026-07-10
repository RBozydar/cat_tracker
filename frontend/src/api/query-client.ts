import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './client'

/**
 * Shared TanStack Query client.
 *
 * 4xx responses are deterministic (bad input, missing rows) — retrying them just
 * delays the error, so we only retry network/5xx failures. `refetchOnWindowFocus`
 * is off: this is a low-churn household app, not a live dashboard.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            return false
          }
          return failureCount < 2
        },
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  })
}
