import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import { createApp } from '../app'
import type { SqlPool } from '../db/connection'
import { PostgresRepository } from '../repositories/postgres-repository'
import { PostgresUserRepository } from '../repositories/postgres-user-repository'
import { SupabaseAuthProvider } from '../auth/supabase-auth-provider'
import { AuthService } from '../services/auth-service'
import { UserService } from '../services/user-service'
import { CategoryService } from '../services/category-service'
import { LegacyService } from '../services/legacy-service'
import { TemaService } from '../services/tema-service'
import { postgresFixture } from './postgres-fixture'
import { TestIdentityGateway } from './identity-fixture'
import type { UserProfile } from '../../packages/shared-types/src'
import { HealthService } from '../services/health-service'

describe('Supabase accounts and PostgreSQL permissions through Hono', () => {
  let database: SqlPool
  let app: ReturnType<typeof createApp>
  let identities: TestIdentityGateway
  let profiles: PostgresUserRepository
  let teacherId: string
  let teacherToken: string
  const password = 'test-password-long-123'
  const json = (value: unknown, token?: string) => ({
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(value),
  })
  beforeAll(async () => {
    database = await postgresFixture()
    const repository = new PostgresRepository(database)
    profiles = new PostgresUserRepository(database)
    identities = new TestIdentityGateway(database)
    teacherId = await identities.createUser('teacher@example.com', password)
    await profiles.bootstrapTeacher(teacherId)
    teacherToken = (await identities.login('teacher@example.com', password)).session!.access_token
    const temas = new TemaService(repository, repository, repository, repository)
    app = createApp({
      auth: new SupabaseAuthProvider(identities, profiles),
      temas,
      categories: new CategoryService(repository),
      legacy: new LegacyService(repository, repository, repository, temas),
      storage: 'postgres',
      health: new HealthService(repository, 'postgres'),
      accounts: {
        auth: new AuthService(identities, profiles),
        users: new UserService(profiles, identities),
      },
    })
  }, 30000)
  afterAll(async () => {
    await database?.end()
  })
  it('logs in with real provider verification and returns no password fields', async () => {
    const response = await app.request('/api/auth/login', {
      method: 'POST',
      ...json({ email: 'teacher@example.com', password }),
    })
    expect(response.status).toBe(200)
    const data = (await response.json()).data
    expect(data.user.role).toBe('teacher')
    expect(data.user.password).toBeUndefined()
    expect(data.session.access_token).toBeTruthy()
    expect(
      (
        await app.request('/api/auth/login', {
          method: 'POST',
          ...json({ email: 'teacher@example.com', password: 'wrong' }),
        })
      ).status
    ).toBe(401)
    expect(
      (
        await app.request('/api/users', {
          headers: { 'x-dev-user': teacherId, 'x-dev-role': 'teacher' },
        })
      ).status
    ).toBe(401)
    expect(
      (await app.request('/api/users', { headers: { Authorization: 'Bearer forged-jwt' } })).status
    ).toBe(401)
  })
  it('registers students only and prevents role injection and administrative reads', async () => {
    expect(
      (
        await app.request('/api/auth/register', {
          method: 'POST',
          ...json({ email: 'evil@example.com', password, name: 'evil', role: 'teacher' }),
        })
      ).status
    ).toBe(422)
    const response = await app.request('/api/auth/register', {
      method: 'POST',
      ...json({ email: 'student@example.com', password, name: '<b>Alumno</b>' }),
    })
    expect(response.status).toBe(201)
    const data = (await response.json()).data
    expect(data.user.role).toBe('student')
    expect(data.user.name).toBe('Alumno')
    const token = data.session.access_token
    expect(
      (await app.request('/api/users', { headers: { Authorization: `Bearer ${token}` } })).status
    ).toBe(403)
    expect(
      (
        await app.request('/api/temas/mru', {
          method: 'PATCH',
          ...json({ titulo: 'forbidden', version: 1 }, token),
        })
      ).status
    ).toBe(403)
    expect(
      (await app.request('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })).status
    ).toBe(200)
    const refresh = await app.request('/api/auth/refresh', {
      method: 'POST',
      ...json({ refreshToken: data.session.refresh_token }),
    })
    expect(refresh.status).toBe(200)
    const nextSession = (await refresh.json()).data.session
    const nextToken = nextSession.access_token
    expect(
      (
        await app.request('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${nextToken}` },
        })
      ).status
    ).toBe(204)
    expect(
      (
        await app.request('/api/auth/refresh', {
          method: 'POST',
          ...json({ refreshToken: nextSession.refresh_token }),
        })
      ).status
    ).toBe(401)
  })
  it('creates, promotes, edits and disables accounts with immediate role checks', async () => {
    const response = await app.request('/api/users', {
      method: 'POST',
      ...json(
        { email: 'managed@example.com', password, name: 'Managed', role: 'student' },
        teacherToken
      ),
    })
    expect(response.status).toBe(201)
    const profile = (await response.json()).data as UserProfile
    const token = (await identities.login('managed@example.com', password)).session!.access_token
    const promoted = await app.request(`/api/users/${profile.id}`, {
      method: 'PATCH',
      ...json({ role: 'teacher', version: profile.version }, teacherToken),
    })
    expect(promoted.status).toBe(200)
    const changed = (await promoted.json()).data as UserProfile
    expect(
      (await app.request('/api/users', { headers: { Authorization: `Bearer ${token}` } })).status
    ).toBe(200)
    expect(
      (
        await app.request(`/api/users/${profile.id}`, {
          method: 'PATCH',
          ...json({ name: 'old', version: profile.version }, teacherToken),
        })
      ).status
    ).toBe(409)
    const removed = await app.request(`/api/users/${profile.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${teacherToken}`, 'If-Match': String(changed.version) },
    })
    expect(removed.status).toBe(204)
    expect(
      (await app.request('/api/users', { headers: { Authorization: `Bearer ${token}` } })).status
    ).toBe(401)
  })
  it('rejects demotion/deletion of the last teacher and writes theory to PostgreSQL', async () => {
    const teacher = (await profiles.get(teacherId))!
    expect(
      (
        await app.request(`/api/users/${teacherId}`, {
          method: 'PATCH',
          ...json({ role: 'student', version: teacher.version }, teacherToken),
        })
      ).status
    ).toBe(409)
    const updated = await app.request('/api/temas/mru/teoria', {
      method: 'PUT',
      ...json({ introduccion: '**Teoría persistida**', version: 1 }, teacherToken),
    })
    expect(updated.status).toBe(200)
    expect((await new PostgresRepository(database).get('mru'))?.teoria.introduccion).toBe(
      '**Teoría persistida**'
    )
    expect((await (await app.request('/api/health')).json()).data.storage).toBe('postgres')
  })
})
