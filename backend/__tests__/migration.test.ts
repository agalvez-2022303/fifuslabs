import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateContent } from '../services/content-validation'
import { JsonFileRepository } from '../repositories/json-file-repository'

describe('migrated data', () => {
  it('all 8 themes are valid canonical content, including their LaTeX', async () => {
    const dir = path.resolve(__dirname, '../../data/temas')
    const files = (await readdir(dir)).filter(file => file.endsWith('.json'))
    expect(files).toHaveLength(8)
    for (const file of files) {
      const tema = validateContent(JSON.parse(await readFile(path.join(dir, file), 'utf8')))
      expect(tema.status).toBe('published')
    }
  })
  it('resolves historical aliases without interpreting inherited object properties', async () => {
    const repository = new JsonFileRepository(path.resolve(__dirname, '../../data'))
    expect(await repository.resolveAlias('movimiento-rectilineo-uniforme')).toBe('mru')
    expect(await repository.resolveAlias('alcances-encuentros')).toBe('alcances-mru')
    expect(await repository.resolveAlias('constructor')).toBe('constructor')
  })
})
