import { useLocation } from 'react-router-dom'

const resourcePages = {
  areas: {
    title: 'Áreas',
    eyebrow: 'ORGANIZACIÓN DEL CONTENIDO',
    description: 'Administra las áreas de conocimiento que organizan los temas.',
    singular: 'área',
    icon: '⌘',
    columns: ['Área', 'Descripción', 'Temas asociados', 'Estado', 'Actualizado'],
  },
  temas: {
    title: 'Temas',
    eyebrow: 'CONTENIDO DIDÁCTICO',
    description: 'Organiza los temas y sus recursos de aprendizaje.',
    singular: 'tema',
    icon: '▤',
    columns: ['Tema', 'Área y nivel', 'Recursos', 'Estado', 'Actualizado'],
  },
  teoria: {
    title: 'Teoría',
    eyebrow: 'CONTENIDO DIDÁCTICO',
    description: 'Administra artículos y secciones teóricas vinculadas a cada tema.',
    singular: 'artículo',
    icon: '▧',
    columns: ['Artículo', 'Área y tema', 'Secciones', 'Estado', 'Actualizado'],
  },
  formulas: {
    title: 'Fórmulas y Ecuaciones',
    eyebrow: 'CONTENIDO DIDÁCTICO',
    description: 'Administra fórmulas, ecuaciones y variables asociadas a cada tema.',
    singular: 'fórmula',
    icon: 'Σ',
    columns: ['Fórmula / título', 'Área y tema', 'Expresión matemática', 'Variables', 'Estado', 'Actualizado'],
  },
  glosario: {
    title: 'Glosario',
    eyebrow: 'CONTENIDO DIDÁCTICO',
    description: 'Administra conceptos y definiciones para acompañar cada tema.',
    singular: 'término',
    icon: 'Aₓ',
    columns: ['Término', 'Área y tema', 'Definición', 'Estado', 'Actualizado'],
  },
  ejercicios: {
    title: 'Ejercicios',
    eyebrow: 'PRÁCTICA Y EVALUACIÓN',
    description: 'Administra ejercicios y problemas asociados a los temas.',
    singular: 'ejercicio',
    icon: '♧',
    columns: ['Ejercicio', 'Área y tema', 'Tipo / dificultad', 'Estado', 'Actualizado'],
  },
} as const

const filters = ['Área', 'Tema', 'Estado', 'Ordenar por']
const metrics = ['Elementos totales', 'Publicados', 'En borrador', 'Actualizados']

export default function AdminCrudPage() {
  const location = useLocation()
  const pathParts = location.pathname.split('/').filter(Boolean)
  const section = pathParts[pathParts.length - 1] ?? ''
  const resource = resourcePages[section as keyof typeof resourcePages]

  if (!resource) {
    return (
      <section className="coming-soon-card">
        <span className="coming-soon-symbol" aria-hidden="true">✦</span>
        <p className="section-eyebrow">PANEL DE ADMINISTRACIÓN</p>
        <h1>Sección no encontrada</h1>
        <p>La sección solicitada no está disponible.</p>
      </section>
    )
  }

  return (
    <section className="crud-page" aria-labelledby="crud-title">
      <header className="crud-heading">
        <div>
          <p className="section-eyebrow"><span />{resource.eyebrow}</p>
          <h1 id="crud-title">Gestión de {resource.title}</h1>
          <p className="crud-description">{resource.description}</p>
        </div>
        <div className="crud-heading-actions">
          <button className="crud-button" type="button" disabled>
            ↓ <span>{section === 'formulas' ? 'Exportar CSV / LaTeX' : 'Exportar CSV'}</span>
          </button>
          <button className="admin-primary-button crud-create" type="button" disabled>
            + {resource.singular === 'área' || resource.singular === 'fórmula' ? 'Nueva' : 'Nuevo'} {resource.singular}
          </button>
        </div>
      </header>

      <div className="crud-metrics" aria-label="Resumen de elementos">
        {metrics.map((label, index) => (
          <article className="crud-metric" key={label}>
            <div className={`crud-metric-icon crud-metric-icon-${index}`} aria-hidden="true">
              {index === 0 ? resource.icon : ['✓', '◷', '↻'][index - 1]}
            </div>
            <p>{label}</p>
            <strong aria-label="Dato no disponible">—</strong>
            <span>Sin datos disponibles</span>
          </article>
        ))}
      </div>

      <section className="crud-table-panel" aria-label={`Listado de ${resource.title.toLowerCase()}`}>
        <div className="crud-filters">
          <label className="crud-filter-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder={`Buscar ${resource.title.toLowerCase()}…`}
              aria-label={`Buscar ${resource.title.toLowerCase()}`}
              disabled
            />
          </label>
          {filters.map(filter => (
            <select key={filter} aria-label={filter} disabled defaultValue="">
              <option value="">{filter}</option>
            </select>
          ))}
        </div>

        <div className="crud-toolbar">
          <label className="crud-select-all">
            <input type="checkbox" disabled />
            <span>Seleccionar elementos</span>
          </label>
          <div className="crud-bulk-actions" aria-label="Acciones para elementos seleccionados">
            <button type="button" disabled>Publicar seleccionados</button>
            <button type="button" disabled>Archivar</button>
            <button type="button" disabled>Eliminar</button>
          </div>
          <span className="crud-selection-count">0 seleccionados</span>
        </div>

        <div className="crud-table-scroll">
          <table className={`crud-table crud-table-${section}`}>
            <thead>
              <tr>
                <th scope="col"><input type="checkbox" aria-label="Seleccionar todos" disabled /></th>
                {resource.columns.map(column => <th scope="col" key={column}>{column}</th>)}
                <th scope="col"><span className="visually-hidden">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="crud-empty-cell" colSpan={resource.columns.length + 2}>
                  <span className="crud-empty-icon" aria-hidden="true">{resource.icon}</span>
                  <strong>Aún no hay {resource.title.toLowerCase()} para mostrar</strong>
                  <span>Los elementos aparecerán aquí cuando haya datos disponibles.</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer className="crud-pagination">
          <span>Mostrando 0 elementos</span>
          <div>
            <button type="button" disabled aria-label="Página anterior">Anterior</button>
            <button type="button" disabled aria-label="Página siguiente">Siguiente</button>
          </div>
        </footer>
      </section>
    </section>
  )
}
