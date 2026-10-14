import { describe, expect, it } from 'vitest'
import { listTemasSchema } from '../../packages/shared-types/src'
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../errors'
import { sanitizeText } from '../services/content-validation'
import { createInput, fixture, setup, student, teacher } from './fixtures'

describe('TemaService', () => {
  it('creates drafts with UUIDs and filters public/student reads', async () => {
    const { service } = setup()
    const draft = await service.create(createInput(), teacher)
    expect(draft.formulas[0].id).toMatch(/^[a-f0-9-]{36}$/)
    expect(draft.formulas[0].id).not.toBe(fixture.formulas[0].id)
    expect((await service.list(listTemasSchema.parse({}), null)).total).toBe(1)
    expect((await service.list(listTemasSchema.parse({}), teacher)).total).toBe(2)
    await expect(service.get(draft.slug, student)).rejects.toBeInstanceOf(NotFoundError)
    await expect(
      service.list(listTemasSchema.parse({ status: 'draft' }), student)
    ).rejects.toBeInstanceOf(ForbiddenError)
    await expect(service.create(createInput('forbidden'), student)).rejects.toBeInstanceOf(
      ForbiddenError
    )
    await expect(service.get('missing', teacher)).rejects.toBeInstanceOf(NotFoundError)
  })
  it('detects duplicate slugs, old versions and concurrent updates', async () => {
    const { service } = setup()
    await expect(service.create(createInput('mru'), teacher)).rejects.toBeInstanceOf(ConflictError)
    const outcomes = await Promise.allSettled([
      service.patch('mru', { titulo: 'one' }, teacher, 1),
      service.patch('mru', { titulo: 'two' }, teacher, 1),
    ])
    expect(outcomes.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    await expect(service.patch('mru', { titulo: 'old' }, teacher, 1)).rejects.toBeInstanceOf(
      ConflictError
    )
    await expect(service.patch('mru', { slug: 'changed' }, teacher, 2)).rejects.toBeInstanceOf(
      ValidationError
    )
  })
  it('sanitizes HTML/entities while preserving bold text and LaTeX comparisons', async () => {
    const { service } = setup()
    const tema = await service.introduction(
      'mru',
      {
        introduccion:
          '<script>alert(1)</script><b onclick="bad()">**texto**</b> $x < y$ &lt;script&gt;bad()&lt;/script&gt;',
      },
      teacher,
      1
    )
    expect(tema.teoria.introduccion).toBe('**texto** $x < y$ ')
    expect(sanitizeText('&#60;img src=x onerror=bad()&#62; seguro')).toBe(' seguro')
  })
  it('rejects bad LaTeX and disallowed component references without saving a revision', async () => {
    const { service } = setup()
    await expect(
      service.patchItem(
        'mru',
        'formulas',
        fixture.formulas[0].id,
        { expresion: '\\frac{' },
        teacher,
        1
      )
    ).rejects.toBeInstanceOf(ValidationError)
    await expect(
      service.patch('mru', { simComponentSlug: '../../evil' }, teacher, 1)
    ).rejects.toBeInstanceOf(ValidationError)
    expect(await service.history('mru', teacher)).toHaveLength(0)
  })
  it('requires exact reorder permutations and preserves identities', async () => {
    const { service } = setup()
    const ids = fixture.formulas.map(item => item.id)
    await expect(
      service.reorder('mru', 'formulas', [ids[0], ids[0], ids[1]], teacher, 1)
    ).rejects.toBeInstanceOf(ValidationError)
    await expect(
      service.reorder('mru', 'formulas', ids.slice(1), teacher, 1)
    ).rejects.toBeInstanceOf(ValidationError)
    const tema = await service.reorder('mru', 'formulas', [...ids].reverse(), teacher, 1)
    expect(tema.formulas.map(item => item.id)).toEqual([...ids].reverse())
  })
  it('supports subelement CRUD, missing ids and optimistic deletion', async () => {
    const { service } = setup()
    const added = await service.addItem('mru', 'resumen', { contenido: 'new summary' }, teacher, 1)
    const id = added.teoria.resumen.at(-1)!.id
    const patched = await service.patchItem(
      'mru',
      'resumen',
      id,
      { contenido: 'edited' },
      teacher,
      2
    )
    expect(patched.teoria.resumen.at(-1)?.contenido).toBe('edited')
    await expect(
      service.removeItem('mru', 'resumen', 'missing', teacher, 3)
    ).rejects.toBeInstanceOf(NotFoundError)
    expect(
      (await service.removeItem('mru', 'resumen', id, teacher, 3)).teoria.resumen
    ).toHaveLength(fixture.teoria.resumen.length)
  })
  it('keeps 50 snapshots and restores deleted themes as a new version', async () => {
    const { service } = setup()
    for (let version = 1; version <= 52; version++)
      await service.patch('mru', { titulo: `revision-${version}` }, teacher, version)
    const history = await service.history('mru', teacher)
    expect(history).toHaveLength(50)
    expect(history[0].editor).toBe(teacher.userId)
    expect(history[0].snapshot.titulo).toBe('revision-3')
    await service.remove('mru', teacher, 53)
    await expect(service.get('mru', teacher)).rejects.toBeInstanceOf(NotFoundError)
    const restored = await service.restore('mru', history[1].id, teacher, 54)
    expect(restored.titulo).toBe('revision-4')
    expect(restored.version).toBe(55)
    expect((await service.history('mru', teacher)).at(-1)?.operation).toContain('restore:')
    await expect(service.restore('mru', 'missing', teacher, 55)).rejects.toBeInstanceOf(
      NotFoundError
    )
  })
})
