import { Link } from 'react-router-dom'
import { useContent } from './ContentContext'
import { Empty, Icon, Loading, Message, PageHeading } from './ui'

/** Categories are a read-only catalog; text content belongs to editable topics. */
export default function AdminCrudPage() {
  const { categories, temas, error, loading, reload } = useContent()
  if (loading && !categories.length) return <Loading />
  return (
    <div className="studio-page">
      <PageHeading
        title="Áreas de conocimiento"
        description="Catálogo que organiza los temas de FísicaLab. Selecciona un área para explorar su contenido."
        eyebrow="ORGANIZACIÓN DEL CURRÍCULO"
      >
        <button className="studio-button" onClick={() => void reload()}>
          <Icon name="refresh" />
          Actualizar
        </button>
      </PageHeading>
      {error && <Message>{error}</Message>}
      <section className="studio-category-grid">
        {categories.map(cat => (
          <article className="studio-card" key={cat.id}>
            <span className="studio-stat-icon tone-0">
              <Icon name="category" />
            </span>
            <h2>{cat.nombre}</h2>
            <p>{cat.descripcion}</p>
            <strong>{temas.filter(tema => tema.categoriaId === cat.id).length} temas</strong>
            <Link
              className="studio-button"
              to={`/admin/temas?q=${encodeURIComponent(cat.nombre === 'Mecánica' ? '' : cat.nombre)}`}
            >
              <Icon name="folder_open" />
              Explorar temas
            </Link>
          </article>
        ))}
      </section>
      {!categories.length && <Empty title="No hay áreas disponibles" />}
    </div>
  )
}
