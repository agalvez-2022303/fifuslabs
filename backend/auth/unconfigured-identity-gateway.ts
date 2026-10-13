import { ServiceUnavailableError } from '../errors'
import type { IdentityGateway } from './identity-gateway'

/** Public DB reads can start before Auth keys arrive; protected endpoints never fail open. */
export class UnconfiguredIdentityGateway implements IdentityGateway {
  private fail(): never {
    throw new ServiceUnavailableError(
      'Configura SUPABASE_URL y las claves pública y de servidor de Supabase Auth'
    )
  }
  async verifyAccessToken(): Promise<never> {
    return this.fail()
  }
  async login(): Promise<never> {
    return this.fail()
  }
  async register(): Promise<never> {
    return this.fail()
  }
  async refresh(): Promise<never> {
    return this.fail()
  }
  async logout(): Promise<never> {
    return this.fail()
  }
  async sendPasswordReset(): Promise<never> { return this.fail() }
  async changePassword(): Promise<never> { return this.fail() }
  async createUser(): Promise<never> {
    return this.fail()
  }
  async setDisabled(): Promise<never> {
    return this.fail()
  }
  async deleteUser(): Promise<never> {
    return this.fail()
  }
}
