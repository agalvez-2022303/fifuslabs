# Plan backend aprobado

1. Plan y comprobaciones iniciales: build y 56 pruebas de física correctos.
2. Tipos y esquemas compartidos, compatibilidad estática y migración reproducible.
3. Interfaces, repositorios JSON/en memoria, servicios y control de concurrencia.
4. Una app Hono, autenticación desacoplada, rutas y adaptadores Vercel/Vite.
5. Pruebas backend, README y ejemplos curl.

Arquitectura: `api/[[...route]].ts` → `backend/app.ts` → rutas → servicios →
interfaces de repositorio. `backend/composition.ts` selecciona proveedores.
Los esquemas viven en `packages/shared-types`. Los datos nuevos están en
`data/temas`. Los archivos estáticos antiguos se conservan.

Cada fase requiere `npm run build` y `npm test` antes de avanzar.
No se modifican componentes, CSS ni simulaciones. Supabase queda pendiente.

Decisiones: slug inmutable; UUID estables; resumen `{ id, contenido }`;
versiones obligatorias para mutaciones; snapshots y tema en una escritura
atómica; historial de 50 revisiones; borrado lógico restaurable; JSON solo
para un proceso local; producción rechaza escrituras con 501 y DevAuth con 401.
Tipos transitorios compartidos mantienen los consumidores estáticos compatibles.
Los endpoints antiguos proyectan el modelo nuevo y mantienen sus contratos.
Body máximo 256 KiB; Zod estricto; KaTeX sin trust; sanitización de HTML.

En la fase 4 se retirarán los cuatro handlers actuales para dejar una función.
Se conservarán `src/data/temas/*.ts` y `data/content/*.json`.
