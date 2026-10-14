import type { AuthUser } from '../packages/shared-types/src'
export interface AppEnv {
  Variables: { user: AuthUser | null; input: unknown; rawBody: string; version: number }
}
