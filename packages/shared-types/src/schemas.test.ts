import { describe, expect, it } from 'vitest'
import { listTemasSchema, metadataSchema, reorderSchema, temaSchema } from './schemas'
import mru from '../../../data/temas/mru.json'

describe('shared schemas', () => {
  it('accepts migrated themes with stable UUIDs', () => {
    expect(temaSchema.parse(mru).status).toBe('published')
  })
  it('rejects arbitrary component paths, unknown fields and oversized text', () => {
    expect(metadataSchema.safeParse({ ...mru, simComponentSlug: '../../evil' }).success).toBe(false)
    expect(temaSchema.safeParse({ ...mru, extra: true }).success).toBe(false)
    expect(temaSchema.safeParse({ ...mru, titulo: 'x'.repeat(301) }).success).toBe(false)
  })
  it('validates pagination and UUIDs', () => {
    expect(listTemasSchema.parse({ limit: '10', offset: '2' }).limit).toBe(10)
    expect(listTemasSchema.safeParse({ limit: '-1' }).success).toBe(false)
    expect(reorderSchema.safeParse(['not-a-uuid']).success).toBe(false)
  })
  it('rejects duplicate subelement identities', () => {
    expect(
      temaSchema.safeParse({ ...mru, formulas: [mru.formulas[0], mru.formulas[0]] }).success
    ).toBe(false)
  })
})
