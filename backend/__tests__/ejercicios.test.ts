import { describe, expect, it } from 'vitest'
import { createApp } from '../app'
import { DevAuthProvider } from '../auth/dev-auth-provider'
import { CategoryService } from '../services/category-service'
import { LegacyService } from '../services/legacy-service'
import { EjercicioService } from '../services/ejercicio-service'
import { setup } from './fixtures'

function testApp() {
  const { repository, service } = setup()
  const ejercicioService = new EjercicioService(repository, repository)
  return {
    repository,
    service,
    ejercicioService,
    app: createApp({
      auth: new DevAuthProvider({ NODE_ENV: 'development', DEV_AUTH: 'true' }),
      temas: service,
      categories: new CategoryService(repository),
      legacy: new LegacyService(repository, repository, repository, service),
      ejercicios: ejercicioService,
    }),
  }
}

const teacherHeaders = {
  'x-dev-user': 'teacher-test',
  'x-dev-role': 'teacher',
  'Content-Type': 'application/json',
}
const studentHeaders = { ...teacherHeaders, 'x-dev-role': 'student' }

describe('Ejercicios API', () => {
  it('allows teacher to create, list, update and delete exercises', async () => {
    const { app } = testApp()

    // 1. Create exercise
    const resCreate = await app.request('/api/ejercicios', {
      method: 'POST',
      headers: teacherHeaders,
      body: JSON.stringify({
        temaSlug: 'mru',
        titulo: 'Encuentro de dos patrullas',
        enunciado: 'Dos móviles parten al encuentro con velocidades constantes de 20 m/s y 30 m/s...',
        dificultad: 'intermedio',
        respuesta: 't = 10 s; x = 200 m',
        solucionDetallada: 'Igualando las ecuaciones de posición...',
        parametros: { vA: 20, vB: 30, d0: 500 },
      }),
    })
    expect(resCreate.status).toBe(201)
    const created = (await resCreate.json()).data
    expect(created.id).toBeDefined()
    expect(created.titulo).toBe('Encuentro de dos patrullas')
    expect(created.parametros.vA).toBe(20)

    // 2. List exercises
    const resList = await app.request('/api/ejercicios?tema=mru', {
      headers: teacherHeaders,
    })
    expect(resList.status).toBe(200)
    const list = (await resList.json()).data
    expect(list.length).toBe(1)
    expect(list[0].id).toBe(created.id)

    // 3. Update exercise
    const resUpdate = await app.request(`/api/ejercicios/${created.id}`, {
      method: 'PATCH',
      headers: teacherHeaders,
      body: JSON.stringify({
        titulo: 'Encuentro de dos patrullas - Actualizado',
        dificultad: 'avanzado',
      }),
    })
    expect(resUpdate.status).toBe(200)
    const updated = (await resUpdate.json()).data
    expect(updated.titulo).toBe('Encuentro de dos patrullas - Actualizado')
    expect(updated.dificultad).toBe('avanzado')

    // 4. Delete exercise
    const resDelete = await app.request(`/api/ejercicios/${created.id}`, {
      method: 'DELETE',
      headers: teacherHeaders,
    })
    expect(resDelete.status).toBe(204)

    // 5. Verify deleted
    const resGet = await app.request(`/api/ejercicios/${created.id}`, {
      headers: teacherHeaders,
    })
    expect(resGet.status).toBe(404)
  })

  it('rejects student role from creating or modifying exercises', async () => {
    const { app } = testApp()
    const res = await app.request('/api/ejercicios', {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({
        temaSlug: 'mru',
        titulo: 'Prueba',
        enunciado: 'Enunciado',
        dificultad: 'basico',
        respuesta: '10',
      }),
    })
    expect(res.status).toBe(403)
  })

  it('allows public unauthenticated users to view published exercises but not drafts', async () => {
    const { app } = testApp()

    // Create 1 published exercise and 1 draft
    await app.request('/api/ejercicios', {
      method: 'POST',
      headers: teacherHeaders,
      body: JSON.stringify({
        temaSlug: 'mru',
        titulo: 'Ejercicio Publicado',
        enunciado: 'Enunciado publicado',
        dificultad: 'basico',
        respuesta: 'x = 100m',
        estado: 'published',
      }),
    })

    await app.request('/api/ejercicios', {
      method: 'POST',
      headers: teacherHeaders,
      body: JSON.stringify({
        temaSlug: 'mru',
        titulo: 'Ejercicio Borrador',
        enunciado: 'Enunciado borrador',
        dificultad: 'avanzado',
        respuesta: 'x = 500m',
        estado: 'draft',
      }),
    })

    // Unauthenticated GET without any auth headers
    const resPublic = await app.request('/api/ejercicios?tema=mru')
    expect(resPublic.status).toBe(200)
    const list = (await resPublic.json()).data
    expect(list.length).toBe(1)
    expect(list[0].titulo).toBe('Ejercicio Publicado')
  })
})

