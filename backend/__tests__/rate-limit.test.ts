import { describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import { AppError } from '../errors'
import { rateLimit, type RateLimitRule } from '../middleware/rate-limit'

describe('rateLimit', () => {
  const rules: Record<string, RateLimitRule> = { POST: { limit: 3, windowMs: 60_000 } }

  function app(now: () => number, store: Map<string, { count: number; resetAt: number }>) {
    const instance = new Hono()
    instance.use('*', rateLimit(rules, { now, store }))
    instance.post('/', c => c.json({ ok: true }))
    instance.get('/', c => c.json({ ok: true }))
    // Mirror the production envelope so 429 is observable, not a 500.
    instance.onError((error, c) =>
      error instanceof AppError
        ? c.json({ error: { code: error.code, message: error.message } }, error.status)
        : c.json({ error: { code: 'INTERNAL_ERROR', message: 'boom' } }, 500)
    )
    return instance
  }

  it('allows requests up to the limit and then answers 429 with Retry-After', async () => {
    const clock = 1_000_000
    const server = app(() => clock, new Map())
    const post = () => server.request('/', { method: 'POST', headers: { 'x-real-ip': '1.1.1.1' } })
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await post()
      expect(response.status).toBe(200)
      expect(response.headers.get('X-RateLimit-Remaining')).toBe(String(2 - attempt))
    }
    const blocked = await post()
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('Retry-After')).toBe('60')
    expect((await blocked.json()).error.code).toBe('RATE_LIMITED')
  })

  it('resets counters once the window expires', async () => {
    let clock = 2_000_000
    const server = app(() => clock, new Map())
    const post = () => server.request('/', { method: 'POST', headers: { 'x-real-ip': '2.2.2.2' } })
    await post()
    await post()
    await post()
    expect((await post()).status).toBe(429)
    clock += 60_001
    expect((await post()).status).toBe(200)
  })

  it('tracks each client independently and ignores methods without a rule', async () => {
    const clock = 3_000_000
    const server = app(() => clock, new Map())
    const fromA = () => server.request('/', { method: 'POST', headers: { 'x-real-ip': '3.3.3.3' } })
    const fromB = () => server.request('/', { method: 'POST', headers: { 'x-real-ip': '4.4.4.4' } })
    await fromA()
    await fromA()
    await fromA()
    expect((await fromA()).status).toBe(429)
    expect((await fromB()).status).toBe(200)
    // GET has no rule, so it is never limited.
    for (let index = 0; index < 20; index++) {
      expect((await server.request('/', { headers: { 'x-real-ip': '3.3.3.3' } })).status).toBe(200)
    }
  })

  it('prefers the edge-provided client address', async () => {
    const clock = 4_000_000
    const server = app(() => clock, new Map())
    const viaCloudflare = () =>
      server.request('/', {
        method: 'POST',
        headers: { 'cf-connecting-ip': '5.5.5.5', 'x-real-ip': '9.9.9.9' },
      })
    await viaCloudflare()
    await viaCloudflare()
    await viaCloudflare()
    expect((await viaCloudflare()).status).toBe(429)
  })

  it('prunes expired buckets instead of growing without bound', async () => {
    let clock = 5_000_000
    const store = new Map<string, { count: number; resetAt: number }>()
    const server = app(() => clock, store)
    // Fill the store past the pruning threshold with stale entries.
    for (let index = 0; index < 5_100; index++) {
      store.set(`stale-${index}`, { count: 1, resetAt: clock - 1 })
    }
    clock += 60_001
    const response = await server.request('/', {
      method: 'POST',
      headers: { 'x-real-ip': '6.6.6.6' },
    })
    expect(response.status).toBe(200)
    expect(store.size).toBeLessThan(5_100)
  })
})
