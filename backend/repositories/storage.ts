import { z } from 'zod'
import { temaSchema } from '../../packages/shared-types/src'
import type { TemaConfig, TemaRevision } from '../../packages/shared-types/src'
import { ConflictError } from '../errors'

const revisionSchema = z
  .object({
    id: z.string().uuid(),
    snapshot: temaSchema,
    editor: z.string().min(1).max(200),
    fecha: z.string().datetime(),
    operation: z.string().min(1).max(100),
  })
  .strict()
export const storageSchema = z
  .object({
    deleted: z.boolean(),
    revisions: z.array(revisionSchema).max(50),
  })
  .strict()
export interface StoredTema {
  tema: TemaConfig
  deleted: boolean
  revisions: TemaRevision[]
}
export function nextRecord(
  current: StoredTema | null,
  tema: TemaConfig,
  expected: number | null,
  revision: TemaRevision,
  deleted: boolean
): StoredTema {
  if (
    expected === null ? current !== null : current === null || current.tema.version !== expected
  ) {
    throw new ConflictError()
  }
  return {
    tema: structuredClone(tema),
    deleted,
    revisions: [...(current?.revisions ?? []), structuredClone(revision)].slice(-50),
  }
}
