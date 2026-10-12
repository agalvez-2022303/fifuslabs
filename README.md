# Kinal Simulator — Plataforma de Simulaciones de Física Interactivas

Inspirada funcionalmente en Walter Fendt (walter-fendt.de/html5/phes/), con una interfaz futurista de alto impacto visual (exclusivamente en paleta **Blanco y Negro**), arquitectura modular preparada para escalar a ~125 simulaciones, y Serverless APIs desplegables en Vercel.

---

## 🚀 Inicio Rápido Local

### Requisitos previos

- Node.js >= 18.x
- npm >= 9.x

### Instalación y ejecución

```bash
# 1. Clonar e instalar dependencias del monorepo
npm install

# 2. Iniciar servidor de desarrollo (Frontend + API local)
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

---

## 🎨 Identidad Visual

- **Paleta Estricta:** Exclusivamente `#000000`, `#080808`, `#111111` y `#FFFFFF` (escala de grises para profundidad).
- **Glassmorphism:** Paneles translúcidos con `backdrop-filter: blur(12px)`.
- **Hero Canvas 2D:** Escena interactiva de alto rendimiento con péndulo, proyectil y vectores reaccionando al mouse/touch (sin sobrecargar GPU en móviles).
- **Mobile First:** Controles táctiles optimizados, componentes con área interactiva mínima de 44px.

---

## 🏗️ Arquitectura del Monorepo

```
physicslab/
├── api/                      → Vercel Serverless Functions (Backend API)
│   └── [[...route]].ts        → Única función HTTP (Hono / adaptador Node)
├── backend/                  → Rutas → servicios → interfaces → repositorios
├── data/                     → Persistencia JSON temporal
│   ├── categories.json
│   ├── simulations.json
│   ├── temas/                → TemaConfig canónico, status, version e historial interno
│   └── content/              → Contenido antiguo conservado, obsoleto para la API
├── packages/
│   └── shared-types/         → Tipos, esquemas Zod y configuración compartidos
├── src/                      → Frontend Vite + React + TypeScript
│   ├── app/
│   │   ├── registry/         → simulations.registry.ts (Registro Central)
│   │   ├── hooks/            → useAnimationLoop, useDraggable, useCanvasRenderer, useLiveChart
│   │   ├── components/       → Header, SimulationShell, SimulationCard, HeroCanvas
│   │   ├── pages/            → HomePage
│   │   └── simulations/      → Componentes de simulaciones (Lazy-loaded)
│   │       ├── constant-acceleration/
│   │       ├── three-forces/
│   │       └── force-composition/
│   └── vite.config.ts        → Code-splitting por simulación
├── vercel.json               → Configuración de despliegue en Vercel
└── package.json
```

---

## 📘 Guía: Cómo agregar la simulación #4 en adelante

Esta guía describe el catálogo estático histórico. El contenido editable nuevo se
gestiona mediante `/api/temas`, descrito en la sección Backend. Las simulaciones
y su registro siguen siendo código estático, fuera del CRUD de contenido.

Para añadir una nueva simulación (por ejemplo, `pendulo-simple`) sin romper la arquitectura:

### Paso 1: Definir los datos en Backend / JSON

1. En `data/simulations.json`, cambia el estado de la simulación de `"coming-soon"` a `"active"` (o inserta un nuevo objeto si no existía).
2. Crea el archivo de contenido didáctico `data/content/pendulo-simple.json` con la teoría, fórmulas y glosario en español.

### Paso 2: Crear el componente de la simulación

Crea la carpeta `src/app/simulations/pendulo-simple/`:

- `PenduloSimple.tsx`: Lógica de renderizado en Canvas / React usando los hooks `useAnimationLoop`, `useCanvasRenderer`, etc.
- `PenduloSimple.module.css`: Estilos locales del panel y canvas.
- `physics.ts`: Motor de física desacoplado del renderizado.

### Paso 3: Registrar en el Frontend

1. En `src/app/registry/simulations.registry.ts`:
   - Cambia el `estado` a `'active'`.
2. En `src/app/App.tsx`:
   - Añade el `React.lazy` import:
     ```ts
     const PenduloSimple = lazy(() => import('./simulations/pendulo-simple/PenduloSimple'))
     ```
   - Añade la ruta dentro de `<Routes>`:
     ```tsx
     <Route
       path="/sim/pendulo-simple"
       element={
         <SimulationShell slug="pendulo-simple">
           <Suspense fallback={<SimulationLoader />}>
             <PenduloSimple />
           </Suspense>
         </SimulationShell>
       }
     />
     ```

¡Listo! Vite separará automáticamente un nuevo _chunk_ JS para esta simulación, manteniendo el bundle inicial liviano para móviles.

---

## 🧪 Pruebas

Ejecutar la suite de pruebas unitarias para los motores de física:

```bash
npm run test
```

---

## Panel de administración local

1. Completa `.env` con `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` y `PORT` (usa `.env.example` como guía).
2. Configura `VITE_API_URL` en `src/.env.local`, por ejemplo `http://localhost:3001/api`.
3. Si todavía no se aplicó, ejecuta el esquema PostgreSQL existente y crea un admin temporal:
   ```sql
   INSERT INTO usuario (nombre, correo, password_hash, rol)
   VALUES ('Administrador', 'admin@fisicalab.local', 'admin123', 'admin');
   ```
   Esta contraseña está en texto plano solo para desarrollo; nunca la uses en producción.
4. Instala dependencias con `npm install` y levanta ambas aplicaciones con `npm run dev:all`.

También puedes iniciar los procesos por separado con `npm run server` y `npm run dev`.
El panel está en `/admin/login` y el endpoint de diagnóstico en `/api/health`.

## Backend

### Arquitectura y alcance

```text
api/[[...route]].ts       adaptador Node HTTP para una Vercel Function
backend/composition.ts   composición manual de repositorios, servicios y AuthProvider
backend/app.ts           app Hono compartida entre Vercel, Vite y pruebas
backend/routes/          traducción HTTP; delega las reglas al servicio
backend/middleware/      identidad, roles, Zod, versiones y body máximo
backend/services/        CRUD, visibilidad, sanitización, LaTeX y revisiones
backend/repositories/    interfaces, JsonFileRepository e InMemoryRepository
packages/shared-types/  TemaConfig, tipos transitorios, esquemas Zod y whitelist
scripts/migrate-temas.ts migración reproducible desde los temas estáticos
data/temas/<slug>.json   tema canónico y metadatos internos de persistencia
```

No hay lógica de acceso a archivos en los servicios ni reglas de contenido en
las rutas. `TemaRepository.commit` es una operación **atómica de comparación de
versión + persistencia del tema + revisión + poda del historial**. Esta garantía
forma parte de la interfaz; un repositorio futuro debe implementarla mediante
una transacción, no mediante varias llamadas independientes.

Para conectar Supabase después, implementar `TemaRepository`, `CategoryRepository`,
`RevisionRepository` y los contratos de compatibilidad de
`backend/repositories/interfaces.ts`. Implementar `AuthProvider` con verificación
real de JWT (firma, issuer, expiración y rol desde una fuente confiable).
**La selección de implementaciones se cambia solo en `backend/composition.ts`.**
No existe integración Supabase todavía.

`server/` es el servidor Express/PostgreSQL preexistente del panel de administración.
Sus rutas y autenticación son independientes. El `/api/health` de Hono identifica
el backend de contenido; el del puerto Express diagnostica PostgreSQL.

### Desarrollo y variables de entorno

```bash
npm ci
npm run migrate:temas
DEV_AUTH=true NODE_ENV=development npm run dev
```

La app queda en `http://localhost:5173/api`. También se puede copiar `.env.example`
a `.env` en la raíz y activar allí `DEV_AUTH=true`; composición carga ese archivo
sin sobrescribir variables existentes del proceso. Reiniciar Vite al cambiarlo.
No se usan variables `VITE_*` para autenticar el backend.

| Variable   | Valor / comportamiento                                                                  |
| ---------- | --------------------------------------------------------------------------------------- |
| `NODE_ENV` | `development` local; `production` bloquea DevAuth y escrituras JSON                     |
| `DEV_AUTH` | Solo el literal `true` activa identidad por headers en local; por defecto deshabilitada |
| `VERCEL`   | Si está presente, bloquea DevAuth y escrituras, incluso en previews                     |

El proveedor temporal acepta **ambos** headers: `x-dev-user` (1–200 caracteres)
y `x-dev-role` (`student` o `teacher`). Otros valores no autentican al usuario.
Una lectura pública puede funcionar sin sesión; una ruta protegida devuelve
401 sin identidad válida y 403 si el rol no es teacher. En producción, los
headers de desarrollo siempre reciben 401 en rutas protegidas. El repositorio
tiene además su propia barrera 501 para cualquier escritura desde una identidad
confiable futura. Los datos dependientes de rol llevan `Cache-Control: no-store`.

### Modelo, contratos y concurrencia

- `status: draft | published` es publicación editorial; `estado: active | coming-soon`
  sigue siendo el estado de disponibilidad de la simulación. Son conceptos distintos.
- Público y alumnos ven solo publicados. Maestros ven también borradores.
  Un borrador consultado por público/alumno devuelve 404. El filtro `status` solo
  está permitido a maestros (403 para el resto).
- Slug inmutable. POST con slug existente, borrado o reservado como alias: 409.
- IDs de elementos generados por el servicio mediante UUID. PATCH no permite cambiarlos.
  Resumen canónico: `{ id, contenido }[]`; secciones, fórmulas y glosario también tienen UUID.
- Todas las mutaciones posteriores a POST requieren `version` en cuerpos de objeto
  o `If-Match: "<version>"`. Reorder recibe un **array de UUID**, por lo que usa
  `If-Match`. DELETE y restore sin body también usan ese header. Si ambos tokens
  están presentes, deben coincidir (400); si faltan: 422. Versión vieja: 409.
- GET de un tema y respuestas de escritura devuelven ETag y versión actual.
  Tras un 409, volver a leer y reconciliar antes de reintentar. Reintentar una
  escritura con el mismo token no aplica el cambio dos veces.
- Cada escritura aceptada crea snapshot completo, UUID de revisión, editor, fecha
  UTC y operación. Se conservan las últimas 50. Restaurar mantiene slug/ID del tema,
  recupera contenido/status/IDs del snapshot y crea nueva versión/revisión.
- DELETE de tema es lógico: no aparece en lecturas normales, tampoco para maestros.
  Un maestro puede consultar su historial y restaurarlo. El último snapshot/ETag
  permite conocer la versión posterior al borrado. DELETE responde 204 sin body.
- Respuestas nuevas: `{ data }`, o `{ error: { code, message, details? } }`.
  GET `/temas` devuelve `{ data: { items, total, limit, offset } }`.
  Listados antiguos conservan `{ data: [...], total }`.
- GET `/temas` filtra título, descripción y etiquetas con `q`, y ordena por `orden`/slug.
  `limit` por defecto 20 (máximo 100), `offset` por defecto 0 (máximo 1.000.000).

### Endpoints

Todos los paths de esta tabla llevan el prefijo `/api`.

| Método         | Path                                 | Acceso / cuerpo                                                                      |
| -------------- | ------------------------------------ | ------------------------------------------------------------------------------------ |
| GET            | `/health`                            | Público; estado de la app de contenido                                               |
| GET            | `/categories`                        | Público; conserva contrato antiguo                                                   |
| GET            | `/temas`                             | Público; `categoriaId`, `q`, `dificultad`, `limit`, `offset`; `status` solo teacher  |
| GET            | `/temas/:slug`                       | Tema completo según visibilidad                                                      |
| POST           | `/temas`                             | Teacher; metadatos + teoría + fórmulas + glosario, sin IDs internos                  |
| PATCH          | `/temas/:slug`                       | Teacher; metadatos parciales y token de versión                                      |
| DELETE         | `/temas/:slug`                       | Teacher; `If-Match`, 204                                                             |
| PATCH          | `/temas/:slug/status`                | Teacher; `{ status, version? }`                                                      |
| PUT            | `/temas/:slug/teoria`                | Teacher; `{ introduccion, version? }`                                                |
| POST           | `/temas/:slug/teoria/secciones`      | Teacher; `{ titulo, contenido, destacado?, version? }`                               |
| PATCH / DELETE | `/temas/:slug/teoria/secciones/:id`  | Teacher; campos parciales / sin body                                                 |
| POST           | `/temas/:slug/teoria/resumen`        | Teacher; `{ contenido, version? }`                                                   |
| PATCH / DELETE | `/temas/:slug/teoria/resumen/:id`    | Teacher; campos parciales / sin body                                                 |
| POST           | `/temas/:slug/formulas`              | Teacher; `{ nombre, expresion, descripcion, variables, ejemploResuelto?, version? }` |
| PATCH / DELETE | `/temas/:slug/formulas/:id`          | Teacher; campos parciales / sin body                                                 |
| POST           | `/temas/:slug/glosario`              | Teacher; `{ termino, definicion, categoria?, version? }`                             |
| PATCH / DELETE | `/temas/:slug/glosario/:id`          | Teacher; campos parciales / sin body                                                 |
| PATCH          | `/temas/:slug/secciones/reorder`     | Teacher; array de UUID + `If-Match`, permutación exacta                              |
| PATCH          | `/temas/:slug/formulas/reorder`      | Teacher; array de UUID + `If-Match`, permutación exacta                              |
| PATCH          | `/temas/:slug/glosario/reorder`      | Teacher; array de UUID + `If-Match`, permutación exacta                              |
| GET            | `/temas/:slug/revisions`             | Teacher; snapshots, incluso de temas borrados                                        |
| POST           | `/temas/:slug/revisions/:id/restore` | Teacher; `If-Match` o `{ version }`                                                  |
| GET            | `/simulations`                       | Compatibilidad deprecada; `categoriaId`, `q`, `estado`                               |
| GET            | `/simulations/:slug`                 | Compatibilidad deprecada                                                             |
| GET            | `/content/:slug`                     | Compatibilidad deprecada; proyección del TemaConfig canónico                         |

POST de un tema acepta todos los metadatos del esquema compartido; `status` por
defecto draft. `variables` contiene `{ simbolo, descripcion, unidad }`.
`ejemploResuelto` contiene `enunciado`, `datos`, `desarrollo` y `resultado`.
Las simulaciones **no** tienen endpoints de escritura. `simComponentSlug` solo
acepta la lista de `packages/shared-types/src/config.ts`, reexportada desde
`backend/config/simulations.ts`; `null` elimina la referencia.

### Validación y sanitización

Zod vive en shared-types y rechaza claves desconocidas, slugs inválidos, UUID
inválidos y límites de colección/campo. El body máximo es **256 KiB**, también
sin Content-Length. Body excesivo: 413; JSON mal formado o Content-Type incorrecto:
400; esquema inválido: 422; expresión LaTeX inválida: 422; recurso ausente: 404.

| Campo / colección                                                              | Máximo                         |
| ------------------------------------------------------------------------------ | ------------------------------ |
| Títulos/nombres/términos                                                       | 300 caracteres                 |
| Descripción corta                                                              | 1.000 caracteres               |
| Introducción, contenido de sección, descripción de fórmula y campos de ejemplo | 20.000 caracteres              |
| Expresión y fórmula principal                                                  | 4.000 caracteres               |
| Definición de glosario y punto de resumen                                      | 4.000 caracteres               |
| Destacado                                                                      | 2.000 caracteres               |
| Etiquetas                                                                      | 30, cada una de 100 caracteres |
| Secciones / fórmulas / puntos de resumen                                       | 100 cada colección             |
| Glosario / variables de una fórmula                                            | 300 / 50                       |

El servicio usa `sanitize-html` con **cero tags o atributos permitidos**, elimina
scripts y estilos con su contenido y vuelve a procesar entidades codificadas.
Se conserva texto plano, saltos de línea, LaTeX, comparaciones matemáticas y
`**negrita**`. No se acepta HTML como formato editorial. Se valida de nuevo
después de sanitizar, evitando guardar contenido obligatorio vacío.
KaTeX valida expresiones y fórmula principal con `throwOnError: true`,
`trust: false` y expansión limitada; no se almacena HTML generado por KaTeX.

Dependencias nuevas: Hono (HTTP), Zod (contratos reutilizables), `@hono/node-server`
(adaptador Node compartido por Vercel/Vite), `tsx` (migración TypeScript, solo dev),
`sanitize-html` y sus tipos (parser mantenido para sanitizar, evitando regex
incompletas). KaTeX ya existía en el frontend y se declara también en la raíz
para que el backend tenga su dependencia explícita.

### Limitaciones JSON y archivos conservados

**JsonFileRepository es TEMPORAL, solo para desarrollo local en un proceso.**
Escribe un temporal único y hace rename dentro del mismo directorio, con bloqueo
por tema y comparación de versión dentro del bloqueo. Las últimas 50 revisiones
y la marca de borrado se guardan en `_storage`, en el mismo documento atómico;
ese campo nunca sale por HTTP. No hay transacciones multi-tema ni bloqueo entre
procesos, coordinación distribuida, búsqueda indexada o garantía de durabilidad
mediante fsync. El historial aumenta el tamaño de los archivos.

En Vercel los datos se empaquetan con `includeFiles: data/**`; el disco de la
aplicación es de solo lectura y las escrituras devuelven 501 desde el repositorio.
El catch-all es la **única función** bajo `api/`; las capas están fuera para no
consumir funciones adicionales. No se ha realizado un despliegue remoto.

La migración se puede ejecutar repetidamente sin alterar UUID ni fechas iniciales.
La fecha inicial determinista es `1970-01-01T00:00:00.000Z`; la primera escritura
la reemplaza por la fecha actual. Se niega a sobrescribir archivos diferentes
(incluyendo ediciones/revisiones locales); no ejecutar para reemplazar contenido
editado. Genera `data/tema-aliases.json` y `data/temas-migration-report.md`.

Conservados pero obsoletos **para la API**: `data/content/*.json` y los datos
`src/data/temas/*.ts`. Estos últimos siguen alimentando el dashboard estático;
las ediciones HTTP todavía no se reflejan en ese consumidor hasta conectarlo a
la API. Sus tipos transitorios se definen solo en shared-types y
`src/data/temas/types.ts` los reexporta. Hay 8 temas canónicos y 7 JSON antiguos;
el informe muestra fórmulas antiguas ausentes o diferentes respecto a los TS.

La duplicación `data/simulations.json` / `src/app/registry/simulations.registry.ts`
permanece: faltaba MRU en el JSON y difieren descripciones, etiquetas y órdenes
(por ejemplo MRUA 1/2 y distancia 4/6). No se modifica ninguno de los dos
catálogos. La API de compatibilidad proyecta los temas existentes y conserva
las entradas coming-soon sin tema.

### Ejemplos curl y checklist manual

Ejecutar con DevAuth activo en local. Estos ejemplos crean un tema de prueba;
no editan MRU. No hace falta token JWT todavía: se usan headers de desarrollo.

```bash
API=http://localhost:5173/api
TEACHER=(-H 'x-dev-user: profe-local' -H 'x-dev-role: teacher')
STUDENT=(-H 'x-dev-user: alumno-local' -H 'x-dev-role: student')
JSON=(-H 'Content-Type: application/json')

# Público: 200. Filtros/paginación; alumno: 200. Maestros pueden filtrar status.
curl -i "$API/health"
curl -i "$API/categories"
curl -i "$API/temas?categoriaId=mecanica&q=MRU&limit=2&offset=0" "${STUDENT[@]}"
curl -i "$API/temas?status=draft" "${TEACHER[@]}"

# Crear borrador: 201, UUID de cada elemento generado por el servicio.
curl -i -X POST "$API/temas" "${TEACHER[@]}" "${JSON[@]}" --data-binary '{
  "slug":"prueba-backend", "titulo":"Tema de prueba", "descripcionCorta":"Prueba local",
  "categoriaId":"mecanica", "dificultad":"basico", "estado":"active", "orden":99,
  "icono":"→", "etiquetas":["prueba"], "formulaPrincipal":"x=vt", "simComponentSlug":"mru",
  "teoria":{"introduccion":"**Introducción**", "secciones":[{"titulo":"Teoría","contenido":"Velocidad constante"}],
    "resumen":[{"contenido":"La velocidad no cambia"}]},
  "formulas":[{"nombre":"Posición","expresion":"x=vt","descripcion":"MRU",
    "variables":[{"simbolo":"v","descripcion":"Velocidad","unidad":"m/s"}],
    "ejemploResuelto":{"enunciado":"v=2, t=3","datos":"2 m/s; 3 s","desarrollo":"x=2(3)","resultado":"6 m"}}],
  "glosario":[{"termino":"MRU","definicion":"Movimiento con velocidad constante"}]
}'

# Sin sesión y alumno no ven borrador: 404. Maestro: 200.
curl -i "$API/temas/prueba-backend"
curl -i "$API/temas/prueba-backend" "${STUDENT[@]}"
curl -i "$API/temas/prueba-backend" "${TEACHER[@]}"

# Escribir sin identidad: 401. Alumno: 403. Body inválido: 422. JSON roto: 400.
curl -i -X PATCH "$API/temas/prueba-backend" "${JSON[@]}" -d '{"titulo":"nuevo","version":1}'
curl -i -X PATCH "$API/temas/prueba-backend" "${STUDENT[@]}" "${JSON[@]}" -d '{"titulo":"nuevo","version":1}'
curl -i -X PATCH "$API/temas/prueba-backend" "${TEACHER[@]}" "${JSON[@]}" -d '{"titulo":9,"version":1}'
curl -i -X PATCH "$API/temas/prueba-backend" "${TEACHER[@]}" "${JSON[@]}" -d '{'

# HTML eliminado, negrita conservada: 200 y versión 2.
curl -i -X PUT "$API/temas/prueba-backend/teoria" "${TEACHER[@]}" "${JSON[@]}" \
  -d '{"introduccion":"<script>evil()</script><b onclick=evil()>**Texto seguro**</b>","version":1}'

# Versión vieja: 409. Publicar con versión actual: 200 y versión 3.
curl -i -X PATCH "$API/temas/prueba-backend" "${TEACHER[@]}" "${JSON[@]}" -d '{"titulo":"viejo","version":1}'
curl -i -X PATCH "$API/temas/prueba-backend/status" "${TEACHER[@]}" "${JSON[@]}" -d '{"status":"published","version":2}'
curl -i "$API/temas/prueba-backend" "${STUDENT[@]}"

# Copiar los UUID de fórmula/sección/glosario de la respuesta del GET anterior.
FORMULA_ID=REEMPLAZAR_POR_UUID
curl -i -X PATCH "$API/temas/prueba-backend/formulas/$FORMULA_ID" "${TEACHER[@]}" "${JSON[@]}" \
  -d '{"expresion":"\\frac{","version":3}' # 422, sin nueva revisión

# UUID omitidos o duplicados en reorder: 422; permutación exacta: 200.
curl -i -X PATCH "$API/temas/prueba-backend/formulas/reorder" "${TEACHER[@]}" "${JSON[@]}" \
  -H 'If-Match: "3"' -d '[]'
curl -i -X PATCH "$API/temas/prueba-backend/formulas/reorder" "${TEACHER[@]}" "${JSON[@]}" \
  -H 'If-Match: "3"' -d "[\"$FORMULA_ID\"]" # versión 4

# Historial y restore: copiar un UUID de revisión (p. ej. la de creación).
curl -i "$API/temas/prueba-backend/revisions" "${TEACHER[@]}"
REVISION_ID=REEMPLAZAR_POR_UUID
curl -i -X POST "$API/temas/prueba-backend/revisions/$REVISION_ID/restore" "${TEACHER[@]}" \
  -H 'If-Match: "4"' # 200, versión 5; recupera status del snapshot

# Borrar: 204, ETag 6. Restaurar desde el historial incluso después del borrado.
curl -i -X DELETE "$API/temas/prueba-backend" "${TEACHER[@]}" -H 'If-Match: "5"'
curl -i "$API/temas/prueba-backend/revisions" "${TEACHER[@]}"

# Contratos antiguos todavía funcionan:
curl -i "$API/simulations?estado=active"
curl -i "$API/simulations/mru"
curl -i "$API/content/mru"
```

Checklist: público/alumno publicado 200 y borrador 404; maestro borrador 200;
escritura sin sesión 401 y alumno 403; entrada inválida 422; JSON roto 400;
LaTeX inválido 422; HTML eliminado conservando negrita; versión vieja 409;
reorder exacto; snapshots/restauración; DELETE 204; headers de desarrollo
rechazados en producción. Si se repite el checklist, el slug borrado sigue
reservado: restaurarlo o usar un slug de prueba diferente.

### Verificación automatizada

```bash
npm run build       # TypeScript estricto backend + build existente del frontend
npm test            # backend/shared schemas + 56 pruebas de física existentes
npm run lint:backend
```

Las pruebas de servicios usan repositorio en memoria. Las de Hono usan
`app.request()` para 200/201/204/400/401/403/404/409/413/422/501, visibilidad,
CRUD, reorder, snapshots, sanitización y tokens de concurrencia. El repositorio
JSON se prueba en un directorio temporal, con escritores concurrentes y
reapertura. También se prueba el adaptador Node sobre TCP y el plugin real de
Vite; las pruebas no escriben en los temas del proyecto.
