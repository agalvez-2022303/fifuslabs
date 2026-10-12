import type { CategoryRepository } from '../repositories/interfaces'
export class CategoryService {
  constructor(private readonly repository: CategoryRepository) {}
  async list() {
    return (await this.repository.listCategories()).sort((a, b) => a.orden - b.orden)
  }
}
