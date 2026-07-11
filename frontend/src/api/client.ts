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

/**
 * Turn a FastAPI `detail` payload into a single readable sentence. `detail`
 * can also be raw response text here (see {@link parseBody}) — an upstream
 * proxy's HTML error page or an empty body — which isn't a useful message on
 * its own, so those fall back to the generic status sentence instead of
 * dumping markup into the UI.
 */
function messageFromDetail(status: number, detail: unknown): string {
  if (typeof detail === 'string') {
    const trimmed = detail.trim()
    if (!trimmed || trimmed.startsWith('<')) return `Request failed with status ${status}`
    return trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed
  }
  if (isValidationErrorArray(detail)) {
    const messages = detail.map((item) => {
      const field = item.loc.filter((part) => part !== 'body').join('.')
      return field ? `${field}: ${item.msg}` : item.msg
    })
    if (messages.length > 0) return messages.join('; ')
  }
  return `Request failed with status ${status}`
}

/**
 * Parse a response body, tolerating non-JSON content: a proxy in front of the
 * API (or FastAPI's own default error page) can return plain text or HTML
 * instead of the `{ detail }` shape callers expect. Returns the raw text
 * rather than throwing so a malformed body never masks the real HTTP failure
 * with an unrelated `JSON.parse` `SyntaxError`.
 */
async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return undefined
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('json')) return text
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
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

  const data = await parseBody(response)

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
