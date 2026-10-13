import type { AuthUser } from '../../packages/shared-types/src'

/** Future SupabaseAuthProvider verifies JWT signature/issuer/expiry and trusted teacher claims. */
export interface AuthProvider {
  verify(request: Request): Promise<AuthUser | null>
}
