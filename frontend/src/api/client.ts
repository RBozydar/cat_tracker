/**
 * Thin typed fetch wrapper around the FastAPI backend.
 *
 * Error normalization: FastAPI returns `{ detail: string }` on 400/404 and
 * `{ detail: ValidationError[] }` on 422. Both are flattened into an
 * {@link ApiError} carrying the HTTP status and a human-readable message, so
 * callers (and TanStack Query) branch on `error.status` and render `error.message`.
 */

/** Base URL for all API calls. Overridable for non-browser callers (smoke scripts, tests). */
let baseUrl = '/api'

/** Point the client at an absolute base (e.g. a running uvicorn) outside the browser. */
export function setApiBaseUrl(url: string): void {
  baseUrl = url.replace(/\/$/, '')
}

export class ApiError extends Error {
  readonly status: number
  readonly detail: unknown

  constructor(status: number, message: string, detail: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

interface FastApiValidationError {
  loc: (string | number)[]
  msg: string
  type: string
}

function isValidationErrorArray(detail: unknown): detail is FastApiValidationError[] {
  return (
    Array.isArray(detail) &&
    detail.every((item) => typeof item === 'object' && item !== null && 'msg' in item)
  )
}

/** Turn a FastAPI `detail` payload into a single readable sentence. */
function messageFromDetail(status: number, detail: unknown): string {
  if (typeof detail === 'string') return detail
  if (isValidationErrorArray(detail)) {
    const messages = detail.map((item) => {
      const field = item.loc.filter((part) => part !== 'body').join('.')
      return field ? `${field}: ${item.msg}` : item.msg
    })
    if (messages.length > 0) return messages.join('; ')
  }
  return `Request failed with status ${status}`
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  // 204 No Content (delete cat / weight / meal) — nothing to parse.
  if (response.status === 204) return undefined as T

  const text = await response.text()
  const data: unknown = text ? JSON.parse(text) : undefined

  if (!response.ok) {
    const detail =
      data && typeof data === 'object' && 'detail' in data
        ? (data as { detail: unknown }).detail
        : data
    throw new ApiError(response.status, messageFromDetail(response.status, detail), detail)
  }

  return data as T
}

/** Build a `?a=b&c=d` query string, dropping `undefined` values. */
export function queryString(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value))
  }
  const rendered = search.toString()
  return rendered ? `?${rendered}` : ''
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}
