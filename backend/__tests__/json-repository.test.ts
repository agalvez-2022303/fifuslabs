import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { ConflictError, NotImplementedError, ValidationError } from '../errors'
import { JsonFileRepository } from '../repositories/json-file-repository'
import { fixture } from './fixtures'

describe('JsonFileRepository', () => {
  it('atomically persists theme/history, serializes writers and survives reopening', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'fisicalab-'))
    try {
      await mkdir(path.join(dir, 'temas'))
      await writeFile(path.join(dir, 'temas/mru.json'), JSON.stringify(fixture))
      const repository = new JsonFileRepository(dir, false)
      const updated = { ...fixture, version: 2 }
      const revision = {
        id: randomUUID(),
        snapshot: updated,
        editor: 'test',
        fecha: fixture.updatedAt,
        operation: 'test',
      }
      const results = await Promise.allSettled([
        repository.commit(updated, 1, revision),
        repository.commit(updated, 1, revision),
      ])
      expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
      expect(
        (results.find(result => result.status === 'rejected') as PromiseRejectedResult).reason
      ).toBeInstanceOf(ConflictError)
      expect((await new JsonFileRepository(dir).get('mru'))?.version).toBe(2)
      expect(await repository.listRevisions('mru')).toHaveLength(1)
      expect(await readdir(path.join(dir, 'temas'))).toEqual(['mru.json'])
      expect(
        JSON.parse(await readFile(path.join(dir, 'temas/mru.json'), 'utf8'))._storage.revisions
      ).toHaveLength(1)
      await expect(repository.get('../secret')).rejects.toBeInstanceOf(ValidationError)
      await expect(
        new JsonFileRepository(dir, true).commit(updated, 2, revision)
      ).rejects.toBeInstanceOf(NotImplementedError)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
