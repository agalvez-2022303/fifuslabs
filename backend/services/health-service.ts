import { ServiceUnavailableError } from '../errors'
import type { HealthRepository } from '../repositories/interfaces'
export class HealthService {
  constructor(
    private readonly repository: HealthRepository,
    private readonly storage: string
  ) {}
  async get() {
    try {
      await this.repository.check()
    } catch {
      throw new ServiceUnavailableError('Base de datos no disponible o migraciones pendientes')
    }
    return { status: 'ok', storage: this.storage }
  }
}
