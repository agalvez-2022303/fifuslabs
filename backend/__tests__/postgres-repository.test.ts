import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { SqlPool } from '../db/connection'
import { migrateDatabase } from '../db/migrate'
import { seedDatabase } from '../db/seed'
import { PostgresRepository } from '../repositories/postgres-repository'
import { PostgresUserRepository } from '../repositories/postgres-user-repository'
import { TemaService } from '../services/tema-service'
import { ConflictError } from '../errors'
import { createInput, teacher } from './fixtures'
import { postgresFixture } from './postgres-fixture'

describe('PostgreSQL repositories and migrations', () => {
  let database: SqlPool
  let repository: PostgresRepository
  let service: TemaService
  beforeAll(async () => {
    database = await postgresFixture()
    repository = new PostgresRepository(database)
    service = new TemaService(repository, repository, repository, repository)
  }, 30000)
  afterAll(async () => {
    await database?.end()
  })
  it('migrates and imports idempotently with initial revisions and aliases', async () => {
    await migrateDatabase(database)
    expect(await seedDatabase(database)).toBe(0)
    expect(await repository.list()).toHaveLength(8)
    expect(await repository.listCategories()).toHaveLength(9)
    expect(await repository.listRevisions('mru')).toHaveLength(1)
    expect(await repository.resolveAlias('movimiento-rectilineo-uniforme')).toBe('mru')
  })
  it('compares versions atomically and rolls back a theme when a revision insert fails', async () => {
    const outcomes = await Promise.allSettled([
      service.patch('mru', { titulo: 'one' }, teacher, 1),
      service.patch('mru', { titulo: 'two' }, teacher, 1),
    ])
    expect(outcomes.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(
      (outcomes.find(result => result.status === 'rejected') as PromiseRejectedResult).reason
    ).toBeInstanceOf(ConflictError)
    const current = await service.get('mru', teacher)
    const existing = (await repository.listRevisions('mru'))[0]
    const updated = { ...current, version: current.version + 1, titulo: 'must roll back' }
    await expect(
      repository.commit(updated, current.version, { ...existing, snapshot: updated })
    ).rejects.toBeInstanceOf(ConflictError)
    expect((await service.get('mru', teacher)).version).toBe(current.version)
    await seedDatabase(database)
    expect((await service.get('mru', teacher)).titulo).toBe(current.titulo)
  })
  it('keeps only 50 revisions and restores deleted content with new versions', async () => {
    const created = await service.create(createInput('postgres-history'), teacher)
    for (let version = 1; version <= 51; version++)
      await service.patch(created.slug, { titulo: `v-${version}` }, teacher, version)
    const history = await service.history(created.slug, teacher)
    expect(history).toHaveLength(50)
    await service.remove(created.slug, teacher, 52)
    expect(await repository.get(created.slug)).toBeNull()
    const restored = await service.restore(created.slug, history[1].id, teacher, 53)
    expect(restored.version).toBe(54)
    expect(restored.titulo).toBe(history[1].snapshot.titulo)
  })
  it('defaults auth accounts to student and serializes protection of the last teacher', async () => {
    const profiles = new PostgresUserRepository(database)
    const first = randomUUID(),
      second = randomUUID()
    await database.query('INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ($1,$2,$3)', [
      first,
      'first@example.com',
      JSON.stringify({ role: 'teacher' }),
    ])
    await database.query('INSERT INTO auth.users(id,email) VALUES ($1,$2)', [
      second,
      'second@example.com',
    ])
    expect((await profiles.get(first))?.role).toBe('student')
    const bootstrap = await profiles.bootstrapTeacher(first)
    await expect(profiles.bootstrapTeacher(second)).rejects.toBeInstanceOf(ConflictError)
    await expect(
      profiles.update(first, { active: false }, bootstrap.version)
    ).rejects.toBeInstanceOf(ConflictError)
    const other = await profiles.get(second)
    const promoted = await profiles.update(second, { role: 'teacher' }, other!.version)
    const results = await Promise.allSettled([
      profiles.update(first, { active: false }, bootstrap.version),
      profiles.update(second, { role: 'student' }, promoted.version),
    ])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    const users = await profiles.list({ limit: 20, offset: 0 })
    expect(users.items.filter(user => user.active && user.role === 'teacher')).toHaveLength(1)
  })
})
