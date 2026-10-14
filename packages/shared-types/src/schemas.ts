import { z } from 'zod'

import { SIM_COMPONENT_SLUGS } from './config'
export const categoryIdSchema = z.enum([
  'mecanica',
  'oscilaciones-ondas',
  'electrodinamica',
  'optica',
  'termodinamica',
  'relatividad',
  'fisica-atomica',
  'fisica-nuclear',
  'estado-solido',
])
export const difficultySchema = z.enum(['basico', 'intermedio', 'avanzado'])
export const statusSchema = z.enum(['draft', 'published'])
export const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
export const uuidSchema = z.string().uuid()
const shortText = z.string().min(1).max(300)
const text = z.string().min(1).max(20000)
export const variableSchema = z
  .object({
    simbolo: z.string().min(1).max(200),
    descripcion: z.string().min(1).max(1000),
    unidad: z.string().max(100),
  })
  .strict()
export const ejemploSchema = z
  .object({
    enunciado: text,
    datos: text,
    desarrollo: text,
    resultado: text,
  })
  .strict()
export const formulaInputSchema = z
  .object({
    nombre: shortText,
    expresion: z.string().min(1).max(4000),
    descripcion: text,
    variables: z.array(variableSchema).max(50),
    ejemploResuelto: ejemploSchema.nullable().optional(),
  })
  .strict()
export const seccionInputSchema = z
  .object({
    titulo: shortText,
    contenido: text,
    destacado: z.string().max(2000).nullable().optional(),
  })
  .strict()
export const glosarioInputSchema = z
  .object({
    termino: shortText,
    definicion: z.string().min(1).max(4000),
    categoria: shortText.nullable().optional(),
  })
  .strict()
export const resumenInputSchema = z.object({ contenido: z.string().min(1).max(4000) }).strict()
export const formulaSchema = formulaInputSchema.extend({ id: uuidSchema })
export const seccionSchema = seccionInputSchema.extend({ id: uuidSchema })
export const glosarioSchema = glosarioInputSchema.extend({ id: uuidSchema })
export const resumenSchema = resumenInputSchema.extend({ id: uuidSchema })
export const metadataSchema = z
  .object({
    titulo: shortText,
    descripcionCorta: z.string().min(1).max(1000),
    categoriaId: categoryIdSchema,
    dificultad: difficultySchema,
    estado: z.enum(['active', 'coming-soon']),
    orden: z.number().finite().min(0).max(100000),
    icono: z.string().min(1).max(100),
    etiquetas: z.array(z.string().min(1).max(100)).max(30),
    formulaPrincipal: z.string().max(4000),
    simComponentSlug: z.enum(SIM_COMPONENT_SLUGS).nullable().optional(),
  })
  .strict()
export const temaSchema = metadataSchema
  .extend({
    id: z.string().min(1).max(100),
    slug: slugSchema,
    status: statusSchema,
    version: z.number().int().positive(),
    updatedAt: z.string().datetime(),
    teoria: z
      .object({
        introduccion: text,
        secciones: z.array(seccionSchema).max(100),
        resumen: z.array(resumenSchema).max(100),
      })
      .strict(),
    formulas: z.array(formulaSchema).max(100),
    glosario: z.array(glosarioSchema).max(300),
  })
  .strict()
  .superRefine((tema, ctx) => {
    const ids = [
      ...tema.teoria.secciones,
      ...tema.teoria.resumen,
      ...tema.formulas,
      ...tema.glosario,
    ].map(item => item.id)
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: 'custom', message: 'IDs duplicados' })
  })
export const createTemaSchema = metadataSchema.extend({
  slug: slugSchema,
  status: statusSchema.default('draft'),
  teoria: z
    .object({
      introduccion: text,
      secciones: z.array(seccionInputSchema).max(100).default([]),
      resumen: z.array(resumenInputSchema).max(100).default([]),
    })
    .strict(),
  formulas: z.array(formulaInputSchema).max(100).default([]),
  glosario: z.array(glosarioInputSchema).max(300).default([]),
})
export const versionSchema = z.number().int().positive()
const notEmpty = (value: Record<string, unknown>) =>
  Object.keys(value).some(key => key !== 'version')
export const patchTemaSchema = metadataSchema
  .partial()
  .extend({ version: versionSchema.optional() })
  .refine(notEmpty, 'Se requiere al menos un campo')
export const patchStatusSchema = z
  .object({ status: statusSchema, version: versionSchema.optional() })
  .strict()
export const putTeoriaSchema = z
  .object({ introduccion: text, version: versionSchema.optional() })
  .strict()
export const listTemasSchema = z
  .object({
    categoriaId: categoryIdSchema.optional(),
    q: z.string().max(200).optional(),
    dificultad: difficultySchema.optional(),
    status: statusSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).max(1000000).default(0),
  })
  .strict()
export const simulationsQuerySchema = z
  .object({
    categoriaId: categoryIdSchema.optional(),
    q: z.string().max(200).optional(),
    estado: z.enum(['active', 'coming-soon']).optional(),
  })
  .strict()
export const reorderSchema = z.array(uuidSchema).max(300)
export const itemSchemas = {
  secciones: seccionInputSchema,
  resumen: resumenInputSchema,
  formulas: formulaInputSchema,
  glosario: glosarioInputSchema,
}
export const itemCreateSchemas = {
  secciones: seccionInputSchema.extend({ version: versionSchema.optional() }),
  resumen: resumenInputSchema.extend({ version: versionSchema.optional() }),
  formulas: formulaInputSchema.extend({ version: versionSchema.optional() }),
  glosario: glosarioInputSchema.extend({ version: versionSchema.optional() }),
}
export const itemPatchSchemas = {
  secciones: seccionInputSchema
    .partial()
    .extend({ version: versionSchema.optional() })
    .refine(notEmpty),
  resumen: resumenInputSchema
    .partial()
    .extend({ version: versionSchema.optional() })
    .refine(notEmpty),
  formulas: formulaInputSchema
    .partial()
    .extend({ version: versionSchema.optional() })
    .refine(notEmpty),
  glosario: glosarioInputSchema
    .partial()
    .extend({ version: versionSchema.optional() })
    .refine(notEmpty),
}
