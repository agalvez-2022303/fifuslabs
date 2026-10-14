import { describe, expect, it } from 'vitest'
import { DevAuthProvider } from '../auth/dev-auth-provider'

const enabled = { NODE_ENV: 'development', DEV_AUTH: 'true' }
const headers = { 'x-dev-user': 'dev', 'x-dev-role': 'teacher' }

function request(url: string, extra: Record<string, string> = headers): Request {
  return new Request(url, { headers: extra })
}

describe('DevAuthProvider', () => {
  it('authenticates a teacher from loopback when explicitly enabled', async () => {
    const provider = new DevAuthProvider(enabled)
    expect(await provider.verify(request('http://localhost:5173/api/temas'))).toEqual({
      userId: 'dev',
      role: 'teacher',
    })
    expect(await provider.verify(request('http://127.0.0.1:5173/api/temas'))).toBeTruthy()
    expect(await provider.verify(request('http://[::1]:5173/api/temas'))).toBeTruthy()
  })

  it('refuses every non-loopback origin even when enabled', async () => {
    const provider = new DevAuthProvider(enabled)
    for (const url of [
      'https://fisicalab.vercel.app/api/temas',
      'https://10.0.0.5/api/temas',
      'https://evil.example.com/api/temas',
    ]) {
      expect(await provider.verify(request(url))).toBeNull()
    }
  })

  it('never trusts headers in production, on Vercel or without opt-in', async () => {
    for (const env of [
      { NODE_ENV: 'production', DEV_AUTH: 'true' },
      { NODE_ENV: 'development', DEV_AUTH: 'false' },
      { NODE_ENV: 'development' },
      { NODE_ENV: 'development', DEV_AUTH: 'true', VERCEL: '1' },
      {},
    ]) {
      const provider = new DevAuthProvider(env)
      expect(await provider.verify(request('http://localhost:5173/api/temas'))).toBeNull()
    }
  })

  it('rejects malformed identities and unknown roles', async () => {
    const provider = new DevAuthProvider(enabled)
    const url = 'http://localhost:5173/api/temas'
    expect(await provider.verify(request(url, { 'x-dev-role': 'teacher' }))).toBeNull()
    expect(
      await provider.verify(request(url, { 'x-dev-user': 'dev', 'x-dev-role': 'admin' }))
    ).toBeNull()
    expect(
      await provider.verify(
        request(url, { 'x-dev-user': 'x'.repeat(201), 'x-dev-role': 'teacher' })
      )
    ).toBeNull()
  })

  it('accepts a student role from loopback', async () => {
    const provider = new DevAuthProvider(enabled)
    const user = await provider.verify(
      request('http://localhost:5173/api/temas', {
        'x-dev-user': 'alumno',
        'x-dev-role': 'student',
      })
    )
    expect(user?.role).toBe('student')
  })
})
