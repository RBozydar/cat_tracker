/**
 * Route-based `fetch` mock for component tests.
 *
 * Matches by HTTP method + exact pathname (query string ignored for matching,
 * available on the recorded call). Unmatched requests 404 with a FastAPI-shaped
 * `{detail}` body so accidental extra calls fail loudly in assertions.
 */
import { vi } from 'vitest'

export interface MockRoute {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  status?: number
  body?: unknown
}

export interface RecordedCall {
  method: string
  path: string
  search: string
  body: unknown
}

export function installFetchMock(routes: MockRoute[]): RecordedCall[] {
  const calls: RecordedCall[] = []

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost')
      const method = init?.method ?? 'GET'
      calls.push({
        method,
        path: url.pathname,
        search: url.search,
        body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
      })

      const route = routes.find((r) => r.method === method && r.path === url.pathname)
      if (!route) {
        return new Response(JSON.stringify({ detail: `No mock for ${method} ${url.pathname}` }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      const status = route.status ?? 200
      return new Response(status === 204 ? null : JSON.stringify(route.body ?? null), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
  )

  return calls
}
