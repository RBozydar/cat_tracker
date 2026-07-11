import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './client'

/**
 * Shared TanStack Query client.
 *
 * 4xx responses are deterministic (bad input, missing rows) — retrying them just
 * delays the error, so we only retry network/5xx failures.
 *
 * This is a two-phone household, and cache invalidation only repairs the
 * device that made a mutation — the other phone only learns about it via a
 * refetch. `refetchOnWindowFocus` is on (TanStack listens for
 * `visibilitychange`, which fires on iOS PWA resume too) so reopening the app
 * picks up whatever the partner's device just saved. `staleTime` is 0 to
 * match: on a LAN talking to SQLite, an extra request per refetch is free, so
 * there's no reason to let a focus-triggered refetch skip itself as "not
 * stale yet" and show minutes-old data.
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
        staleTime: 0,
        refetchOnWindowFocus: true,
      },
    },
  })
}
