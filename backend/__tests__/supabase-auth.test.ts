import { randomUUID } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { SupabaseAuthClient } from '../auth/supabase-auth-client'
import { ConflictError, ServiceUnavailableError, UnauthorizedError } from '../errors'
import { UnconfiguredIdentityGateway } from '../auth/unconfigured-identity-gateway'
import { HealthService } from '../services/health-service'

describe('Supabase Auth HTTP client', () => {
  it('fails closed when Auth keys or database readiness are unavailable', async () => {
    await expect(new UnconfiguredIdentityGateway().login()).rejects.toBeInstanceOf(
      ServiceUnavailableError
    )
    await expect(new UnconfiguredIdentityGateway().verifyAccessToken()).rejects.toBeInstanceOf(
      ServiceUnavailableError
    )
    await expect(
      new HealthService(
        {
          check: async () => {
            throw new Error('unavailable')
          },
        },
        'postgres'
      ).get()
    ).rejects.toBeInstanceOf(ServiceUnavailableError)
  })
  it('verifies tokens via Auth rather than decoding or trusting local headers', async () => {
    const id = randomUUID()
    const fetcher = vi
      .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockResolvedValue(new Response(JSON.stringify({ id }), { status: 200 }))
    const client = new SupabaseAuthClient(
      'https://example.supabase.co',
      'sb_publishable_test',
      'sb_secret_test',
      fetcher
    )
    expect(await client.verifyAccessToken('signed-token')).toBe(id)
    const [url, options] = fetcher.mock.calls[0]
    expect(url).toBe('https://example.supabase.co/auth/v1/user')
    expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer signed-token')
    expect(new Headers(options?.headers).get('apikey')).toBe('sb_publishable_test')
  })
  it('supports modern secret keys and never sends them as JWT Bearer tokens', async () => {
    const id = randomUUID()
    const fetcher = vi
      .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockResolvedValue(new Response(JSON.stringify({ user: { id } }), { status: 200 }))
    const client = new SupabaseAuthClient(
      'https://example.supabase.co',
      'public',
      'sb_secret_test',
      fetcher
    )
    expect(await client.createUser('teacher@example.com', 'test-password-long')).toBe(id)
    const headers = new Headers(fetcher.mock.calls[0][1]?.headers)
    expect(headers.get('apikey')).toBe('sb_secret_test')
    expect(headers.has('Authorization')).toBe(false)
  })
  it('maps invalid credentials, duplicate emails and upstream outages without leaking response bodies', async () => {
    const fetcher = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
    const client = new SupabaseAuthClient(
      'https://example.supabase.co',
      'public',
      'server',
      fetcher
    )
    fetcher.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 'invalid_credentials' }), { status: 400 })
    )
    await expect(client.login('user@example.com', 'wrong')).rejects.toBeInstanceOf(
      UnauthorizedError
    )
    fetcher.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 422, error_code: 'email_exists' }), { status: 422 })
    )
    await expect(client.createUser('user@example.com', 'password')).rejects.toBeInstanceOf(
      ConflictError
    )
    fetcher.mockResolvedValueOnce(new Response('secret upstream details', { status: 503 }))
    await expect(client.verifyAccessToken('token')).rejects.toBeInstanceOf(ServiceUnavailableError)
    fetcher.mockResolvedValueOnce(new Response('{}', { status: 401 }))
    expect(await client.verifyAccessToken('invalid')).toBeNull()
  })
})
