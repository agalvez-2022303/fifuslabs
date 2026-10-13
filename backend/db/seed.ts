import { randomUUID } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import { temaSchema } from '../../packages/shared-types/src'
import { storageSchema } from '../repositories/storage'
import type { SqlPool } from './connection'

/** Import only missing records. Never overwrite database edits on subsequent runs. */
export async function seedDatabase(
  database: SqlPool,
  dataDir = path.resolve(__dirname, '../../data')
) {
  const client = await database.connect()
  let imported = 0
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock(64261703)')
    const categories = z
      .array(z.object({ id: z.string() }).passthrough())
      .parse(JSON.parse(await readFile(path.join(dataDir, 'categories.json'), 'utf8')))
    for (const category of categories)
      await client.query(
        'INSERT INTO fisicalab.categories(id, document) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [category.id, JSON.stringify(category)]
      )
    const files = (await readdir(path.join(dataDir, 'temas')))
      .filter(file => file.endsWith('.json'))
      .sort()
    for (const file of files) {
      const parsed = z
        .record(z.string(), z.unknown())
        .parse(JSON.parse(await readFile(path.join(dataDir, 'temas', file), 'utf8')))
      const { _storage, ...content } = parsed
      const tema = temaSchema.parse(content)
      const storage =
        _storage === undefined ? { deleted: false, revisions: [] } : storageSchema.parse(_storage)
      const inserted = await client.query(
        'INSERT INTO fisicalab.temas(slug,tema_id,categoria_id,status,version,updated_at,deleted,document) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING RETURNING slug',
        [
          tema.slug,
          tema.id,
          tema.categoriaId,
          tema.status,
          tema.version,
          tema.updatedAt,
          storage.deleted,
          JSON.stringify(tema),
        ]
      )
      if (!inserted.rowCount) continue
      imported++
      const revisions = storage.revisions.length
        ? storage.revisions
        : [
            {
              id: randomUUID(),
              snapshot: tema,
              editor: 'system:import',
              fecha: new Date().toISOString(),
              operation: 'import',
            },
          ]
      for (const revision of revisions)
        await client.query(
          'INSERT INTO fisicalab.revisions(id,slug,editor,fecha,operation,snapshot) VALUES ($1,$2,$3,$4,$5,$6)',
          [
            revision.id,
            tema.slug,
            revision.editor,
            revision.fecha,
            revision.operation,
            JSON.stringify(revision.snapshot),
          ]
        )
    }
    const aliases = z
      .record(z.string(), z.string())
      .parse(JSON.parse(await readFile(path.join(dataDir, 'tema-aliases.json'), 'utf8')))
    for (const [alias, slug] of Object.entries(aliases))
      await client.query(
        'INSERT INTO fisicalab.aliases(alias,slug) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [alias, slug]
      )
    const simulations = z
      .array(z.object({ slug: z.string() }).passthrough())
      .parse(JSON.parse(await readFile(path.join(dataDir, 'simulations.json'), 'utf8')))
    for (const simulation of simulations)
      await client.query(
        'INSERT INTO fisicalab.simulations(slug,document) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [simulation.slug, JSON.stringify(simulation)]
      )
    await client.query('COMMIT')
    return imported
  } catch (error: unknown) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
