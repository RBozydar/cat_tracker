import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError, setApiBaseUrl } from './client'

afterEach(() => {
  vi.unstubAllGlobals()
  setApiBaseUrl('/api')
})

function stubFetchOnce(response: Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => response),
  )
}

describe('error response parsing', () => {
  it('flattens a FastAPI { detail: string } JSON body into ApiError.message', async () => {
    stubFetchOnce(
      new Response(JSON.stringify({ detail: 'Cat not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(api.get('/cats/999')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'Cat not found',
    })
  })

  it('flattens a FastAPI 422 validation-error array into a readable sentence', async () => {
    stubFetchOnce(
      new Response(
        JSON.stringify({
          detail: [{ loc: ['body', 'target_kcal'], msg: 'must be positive', type: 'value_error' }],
        }),
        { status: 422, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    await expect(api.post('/cats', {})).rejects.toMatchObject({
      status: 422,
      message: 'target_kcal: must be positive',
    })
  })

  it('falls back to a generic message for an HTML error body (e.g. a proxy 502 page), never a JSON.parse crash', async () => {
    stubFetchOnce(
      new Response('<html><body><h1>502 Bad Gateway</h1></body></html>', {
        status: 502,
        headers: { 'Content-Type': 'text/html' },
      }),
    )

    await expect(api.get('/cats')).rejects.toMatchObject({
      name: 'ApiError',
      status: 502,
      message: 'Request failed with status 502',
    })
  })

  it('falls back to a generic message for an empty error body', async () => {
    stubFetchOnce(new Response('', { status: 500 }))

    await expect(api.get('/cats')).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
      message: 'Request failed with status 500',
    })
  })

  it('surfaces a short plain-text error body as the message', async () => {
    stubFetchOnce(
      new Response('upstream timed out', {
        status: 504,
        headers: { 'Content-Type': 'text/plain' },
      }),
    )

    await expect(api.get('/cats')).rejects.toMatchObject({
      status: 504,
      message: 'upstream timed out',
    })
  })

  it('rejects with ApiError, not a raw SyntaxError, when the body claims JSON but is not valid JSON', async () => {
    stubFetchOnce(
      new Response('not actually json', {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const rejection = api.get('/cats').catch((err: unknown) => err)
    const err = await rejection
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(500)
  })
})
