import type { UserProfile, UsersQuery } from '../../packages/shared-types/src'
export interface UserRepository {
  get(id: string): Promise<UserProfile | null>
  list(query: UsersQuery): Promise<{ items: UserProfile[]; total: number }>
  update(
    id: string,
    patch: Partial<Pick<UserProfile, 'name' | 'role' | 'active'>>,
    version: number
  ): Promise<UserProfile>
  /** Trusted CLI only; atomically succeeds only when no active teacher exists. */
  bootstrapTeacher(id: string): Promise<UserProfile>
}
