import type { MiddlewareHandler } from 'hono'
import { AppError } from '../errors'
import type { AppEnv } from '../http-types'

/**
 * In-memory fixed-window rate limiter.
 *
 * Scope: one serverless instance. It protects a single instance from bursts and
 * brute force; a distributed deployment should add an edge/WAF rule on top.
 * Counters are pruned lazily so the map cannot grow without bound.
 */
interface Bucket {
  count: number
  resetAt: number
}

export interface RateLimitRule {
  limit: number
  windowMs: number
}

export function rateLimit(
  rules: Record<string, RateLimitRule>,
  options: { now?: () => number; store?: Map<string, Bucket> } = {}
): MiddlewareHandler<AppEnv> {
  const now = options.now ?? Date.now
  const store = options.store ?? new Map<string, Bucket>()

  return async (c, next) => {
    const rule = rules[c.req.method]
    if (!rule) return next()

    // Trusting X-Forwarded-For blindly would let a caller spoof its identity.
    const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-real-ip') ?? 'desconocido'
    const key = `${rule.limit}:${c.req.path}:${ip}`
    const timestamp = now()

    // Drop expired buckets occasionally instead of scanning on every request.
    if (store.size > 5000) {
      for (const [existing, bucket] of store)
        if (bucket.resetAt <= timestamp) store.delete(existing)
    }

    const bucket = store.get(key)
    if (!bucket || bucket.resetAt <= timestamp) {
      store.set(key, { count: 1, resetAt: timestamp + rule.windowMs })
      c.header('X-RateLimit-Limit', String(rule.limit))
      c.header('X-RateLimit-Remaining', String(rule.limit - 1))
      return next()
    }
    bucket.count++
    if (bucket.count > rule.limit) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - timestamp) / 1000))
      c.header('Retry-After', String(retryAfter))
      throw new AppError(
        429,
        'RATE_LIMITED',
        `Demasiadas solicitudes. Inténtalo de nuevo en ${retryAfter} s.`
      )
    }
    c.header('X-RateLimit-Limit', String(rule.limit))
    c.header('X-RateLimit-Remaining', String(Math.max(0, rule.limit - bucket.count)))
    return next()
  }
}

/** Tight budgets for credential endpoints, looser for ordinary content writes. */
export const AUTH_RATE_LIMITS: Record<string, RateLimitRule> = {
  POST: { limit: 8, windowMs: 60_000 },
}
export const WRITE_RATE_LIMITS: Record<string, RateLimitRule> = {
  POST: { limit: 60, windowMs: 60_000 },
  PATCH: { limit: 120, windowMs: 60_000 },
  DELETE: { limit: 30, windowMs: 60_000 },
}
export const READ_RATE_LIMITS: Record<string, RateLimitRule> = {
  GET: { limit: 300, windowMs: 60_000 },
}
