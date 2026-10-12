import type { MiddlewareHandler } from 'hono'
import { z } from 'zod'
import { slugSchema, uuidSchema, versionSchema } from '../../packages/shared-types/src'
import { BadRequestError, ValidationError } from '../errors'
import type { AppEnv } from '../http-types'

export function validate<T>(
  schema: z.ZodType<T>,
  source: 'body' | 'query' = 'body'
): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    let input: unknown
    if (source === 'query') input = c.req.query()
    else {
      if (!c.req.header('content-type')?.toLowerCase().startsWith('application/json'))
        throw new BadRequestError('Se requiere Content-Type: application/json')
      try {
        input = JSON.parse(c.get('rawBody'))
      } catch {
        throw new BadRequestError('JSON mal formado')
      }
    }
    const result = schema.safeParse(input)
    if (!result.success) throw new ValidationError('Entrada inválida', result.error.issues)
    c.set('input', result.data)
    await next()
  }
}
export const validateParams: MiddlewareHandler<AppEnv> = async (c, next) => {
  for (const [key, value] of Object.entries(c.req.param())) {
    const schema = key === 'slug' ? slugSchema : key === 'id' ? uuidSchema : null
    if (schema && !schema.safeParse(value).success)
      throw new ValidationError(`Parámetro ${key} inválido`)
  }
  await next()
}
/** Transport-only concurrency token extraction; compare-and-swap belongs to repositories. */
export const requireVersion: MiddlewareHandler<AppEnv> = async (c, next) => {
  const input = c.get('input')
  const bodyVersion =
    input && typeof input === 'object' && !Array.isArray(input)
      ? (input as Record<string, unknown>).version
      : undefined
  const header = c.req.header('if-match')
  let headerVersion: number | undefined
  if (header !== undefined) {
    if (!/^(?:[1-9]\d*|"[1-9]\d*")$/.test(header))
      throw new BadRequestError('If-Match debe contener una versión entera, por ejemplo "1"')
    headerVersion = Number(header.replace(/"/g, ''))
  }
  if (bodyVersion !== undefined && headerVersion !== undefined && bodyVersion !== headerVersion)
    throw new BadRequestError('version e If-Match no coinciden')
  const parsed = versionSchema.safeParse(bodyVersion ?? headerVersion)
  if (!parsed.success)
    throw new ValidationError('Se requiere version o If-Match para modificar el tema')
  c.set('version', parsed.data)
  await next()
}
export function itemInput(input: unknown): unknown {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    const copy = { ...input }
    delete (copy as Record<string, unknown>).version
    return copy
  }
  return input
}
