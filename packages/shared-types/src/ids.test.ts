import { describe, expect, it } from 'vitest'
import { fallbackUuid } from './ids'
import { uuidSchema } from './schemas'

describe('fallbackUuid', () => {
  it('produces valid v4 UUIDs accepted by the shared schema', () => {
    const keys = ['', 'a', 'mru/secciones/0', 'mru/formulas/2/mru-velocidad', 'ñandú-ñ/中文']
    for (const key of keys) {
      const id = fallbackUuid(key)
      expect(id).toHaveLength(36)
      expect(uuidSchema.safeParse(id).success).toBe(true)
    }
  })
  it('is deterministic and collision-free across many keys', () => {
    expect(fallbackUuid('tema/secciones/1')).toBe(fallbackUuid('tema/secciones/1'))
    const ids = new Set(
      Array.from({ length: 5000 }, (_, index) => fallbackUuid(`tema/secciones/${index}`))
    )
    expect(ids.size).toBe(5000)
  })
  it('rejects nothing: every key yields an id instead of throwing', () => {
    expect(() => fallbackUuid('x'.repeat(1000))).not.toThrow()
  })
})
