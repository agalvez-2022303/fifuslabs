import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { TEMAS_REGISTRY } from '../src/data/temas/index'
import { temaSchema, type SimulationContent } from '../packages/shared-types/src/index'

// Stable UUIDs make repeated migration runs identical (including formula legacy IDs).
function uuid(key: string): string {
  const bytes = createHash('sha256').update(`fisicalab:${key}`).digest().subarray(0, 16)
  bytes[6] = (bytes[6] & 15) | 80
  bytes[8] = (bytes[8] & 63) | 128
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
async function main() {
  const root = path.resolve(__dirname, '..')
  const dir = path.join(root, 'data/temas')
  await mkdir(dir, { recursive: true })
  const temas = [...new Map(Object.values(TEMAS_REGISTRY).map(tema => [tema.slug, tema])).values()]
  const report = [
    '# Migration report',
    '',
    'Source: src/data/temas. Legacy content is retained.',
    '',
  ]
  for (const old of temas) {
    const tema = temaSchema.parse({
      ...old,
      status: 'published',
      version: 1,
      updatedAt: '1970-01-01T00:00:00.000Z',
      formulas: old.formulas.map((item, i) => ({
        ...item,
        id: uuid(`${old.slug}/formulas/${i}/${item.id}`),
      })),
      glosario: old.glosario.map((item, i) => ({ ...item, id: uuid(`${old.slug}/glosario/${i}`) })),
      teoria: {
        ...old.teoria,
        secciones: old.teoria.secciones.map((item, i) => ({
          ...item,
          id: uuid(`${old.slug}/secciones/${i}`),
        })),
        resumen: old.teoria.resumen.map((contenido, i) => ({
          contenido,
          id: uuid(`${old.slug}/resumen/${i}`),
        })),
      },
    })
    const file = path.join(dir, `${tema.slug}.json`)
    const json = `${JSON.stringify(tema, null, 2)}\n`
    const existing = await readFile(file, 'utf8').catch((error: unknown) => {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null
      throw error
    })
    if (existing !== null && existing !== json)
      throw new Error(`Refusing to overwrite ${file}; preserve local edits first.`)
    if (existing === null) {
      await writeFile(`${file}.tmp`, json)
      await rename(`${file}.tmp`, file)
    }
    try {
      const legacy = JSON.parse(
        await readFile(path.join(root, 'data/content', `${tema.slug}.json`), 'utf8')
      ) as SimulationContent
      report.push(
        `## ${tema.slug}`,
        `Legacy formulas: ${legacy.formulas.length}; canonical: ${tema.formulas.length}.`
      )
      for (const formula of legacy.formulas) {
        if (!tema.formulas.some(item => item.expresion === formula.expresion)) {
          report.push(`- Legacy expression differs or is absent: ${formula.expresion}`)
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
        report.push(`## ${tema.slug}`, 'No legacy content file.')
      else throw error
    }
  }
  const aliases = Object.fromEntries(
    Object.entries(TEMAS_REGISTRY)
      .filter(([key, tema]) => key !== tema.slug)
      .map(([key, tema]) => [key, tema.slug])
  )
  await writeFile(
    path.join(root, 'data/tema-aliases.json'),
    `${JSON.stringify(aliases, null, 2)}\n`
  )
  await writeFile(path.join(root, 'data/temas-migration-report.md'), `${report.join('\n')}\n`)
  console.log(
    `Migrated ${temas.length} published themes; stable UUIDs, aliases and difference report generated.`
  )
}
main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
