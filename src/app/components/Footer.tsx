import { Link } from 'react-router-dom'
import { SIMULATIONS_REGISTRY } from '../registry/simulations.registry'
import styles from './Footer.module.css'

const simulations = SIMULATIONS_REGISTRY.filter(simulation => simulation.estado === 'active')

export default function Footer(): JSX.Element {
  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <div className={styles.brand}>
          <Link to="/" className={styles.logo} aria-label="FísicaLab, Inicio">
            <span className={`material-symbols-outlined ${styles.logoIcon}`} aria-hidden="true">
              science
            </span>
            <span className={styles.logoName}>FísicaLab</span>
          </Link>
          <p className={styles.description}>
            Aprende física practicando con simulaciones interactivas.
          </p>
        </div>

        <section className={styles.section} aria-labelledby="footer-explorar">
          <h2 className={styles.heading} id="footer-explorar">Explorar</h2>
          <nav className={styles.linkList} aria-label="Explorar">
            <Link to="/">Inicio</Link>
            <Link to="/#simulaciones">Temas</Link>
            <Link to="/?buscar=1">Buscar</Link>
          </nav>
        </section>

        <section className={styles.section} aria-labelledby="footer-simulaciones">
          <h2 className={styles.heading} id="footer-simulaciones">Simulaciones</h2>
          <nav className={styles.linkList} aria-label="Simulaciones">
            {simulations.map(simulation => (
              <Link key={simulation.id} to={simulation.path}>
                {simulation.titulo}
              </Link>
            ))}
          </nav>
        </section>

        <section className={styles.section} aria-labelledby="footer-incluye">
          <h2 className={styles.heading} id="footer-incluye">Cada tema incluye</h2>
          <p className={styles.included}>
            Simulación <span aria-hidden="true">·</span> Fórmulas <span aria-hidden="true">·</span>{' '}
            Glosario <span aria-hidden="true">·</span> Teoría
          </p>
        </section>
      </div>

      <p className={styles.copyright}>© 2026 FísicaLab</p>
    </footer>
  )
}
