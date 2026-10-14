import { z } from 'zod'
import { difficultySchema, slugSchema, uuidSchema } from './schemas'

export const ejercicioSchema = z
  .object({
    id: uuidSchema,
    temaSlug: slugSchema,
    titulo: z.string().min(1, 'El título es requerido').max(200, 'El título no puede exceder 200 caracteres'),
    enunciado: z.string().min(1, 'El enunciado es requerido').max(10000, 'El enunciado no puede exceder 10000 caracteres'),
    dificultad: difficultySchema,
    respuesta: z.string().min(1, 'La respuesta esperada es requerida').max(500, 'La respuesta no puede exceder 500 caracteres'),
    solucionDetallada: z.string().max(10000).nullable().optional(),
    parametros: z.record(z.string(), z.unknown()).default({}),
    pistas: z.string().max(2000).nullable().optional(),
    estado: z.enum(['draft', 'published']).default('published'),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict()

export const createEjercicioSchema = z
  .object({
    temaSlug: slugSchema,
    titulo: z.string().min(1, 'El título es requerido').max(200, 'El título no puede exceder 200 caracteres'),
    enunciado: z.string().min(1, 'El enunciado es requerido').max(10000, 'El enunciado no puede exceder 10000 caracteres'),
    dificultad: difficultySchema.default('basico'),
    respuesta: z.string().min(1, 'La respuesta esperada es requerida').max(500, 'La respuesta no puede exceder 500 caracteres'),
    solucionDetallada: z.string().max(10000).nullable().optional(),
    parametros: z.record(z.string(), z.unknown()).optional().default({}),
    pistas: z.string().max(2000).nullable().optional(),
    estado: z.enum(['draft', 'published']).default('published'),
  })
  .strict()

export const patchEjercicioSchema = z
  .object({
    temaSlug: slugSchema.optional(),
    titulo: z.string().min(1, 'El título no puede estar vacío').max(200).optional(),
    enunciado: z.string().min(1, 'El enunciado no puede estar vacío').max(10000).optional(),
    dificultad: difficultySchema.optional(),
    respuesta: z.string().min(1, 'La respuesta no puede estar vacía').max(500).optional(),
    solucionDetallada: z.string().max(10000).nullable().optional(),
    parametros: z.record(z.string(), z.unknown()).optional(),
    pistas: z.string().max(2000).nullable().optional(),
    estado: z.enum(['draft', 'published']).optional(),
  })
  .strict()

export type Ejercicio = z.infer<typeof ejercicioSchema>
export type CreateEjercicioInput = z.infer<typeof createEjercicioSchema>
export type PatchEjercicioInput = z.infer<typeof patchEjercicioSchema>
