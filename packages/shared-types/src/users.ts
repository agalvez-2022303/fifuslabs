import { z } from 'zod'
import { versionSchema } from './schemas'
export const userRoleSchema = z.enum(['student', 'teacher'])
export const userProfileSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email().nullable(),
    name: z.string().max(150),
    role: userRoleSchema,
    active: z.boolean(),
    version: versionSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict()
export type UserProfile = z.infer<typeof userProfileSchema>
export const registerSchema = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(12).max(128),
    name: z.string().min(1).max(150),
  })
  .strict()
export const loginSchema = z
  .object({ email: z.string().email().max(254), password: z.string().min(1).max(128) })
  .strict()
export const refreshSchema = z.object({ refreshToken: z.string().min(1).max(4096) }).strict()
export const passwordResetSchema = z.object({ email: z.string().email().max(254) }).strict()
export const changePasswordSchema = z.object({ password: z.string().min(12).max(128) }).strict()
export const createUserSchema = registerSchema.extend({ role: userRoleSchema.default('student') })
export const patchUserSchema = z
  .object({
    name: z.string().min(1).max(150).optional(),
    role: userRoleSchema.optional(),
    active: z.boolean().optional(),
    version: versionSchema.optional(),
  })
  .strict()
  .refine(
    value => value.name !== undefined || value.role !== undefined || value.active !== undefined,
    'Actualizaci├│n vac├¡a'
  )
export const listUsersSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).max(1000000).default(0),
    q: z.string().max(200).optional(),
  })
  .strict()
export type UsersQuery = z.infer<typeof listUsersSchema>
export const authSessionSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.literal('bearer'),
  expires_at: z.number().optional(),
})
export type AuthSession = z.infer<typeof authSessionSchema>
