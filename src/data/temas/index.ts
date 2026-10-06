import type { TemaConfig } from './types'
import { alcancesMRUData } from './alcances-mru'

export * from './types'
export { alcancesMRUData }

export const vectoresData: TemaConfig = {
  id: 'sim-000',
  slug: 'vectores',
  titulo: 'Vectores y Coordenadas',
  descripcionCorta: 'Coordenadas rectangulares, polares y geográficas con práctica interactiva.',
  categoriaId: 'mecanica',
  dificultad: 'basico',
  estado: 'active',
  orden: 1,
  icono: '↗',
  etiquetas: ['vectores', 'coordenadas', 'polar', 'rectangular', 'geográfico', 'práctica'],
  formulaPrincipal: 'V = (V_x, V_y) = (r, \\theta)',
  simComponentSlug: 'vectores',
  formulas: [
    {
      id: 'polar-a-rectangular',
      nombre: 'Conversión Polar a Rectangular',
      expresion: 'V_x = r \\cos\\theta, \\quad V_y = r \\sin\\theta',
      descripcion: 'Calcula las componentes ortogonales cartesianas a partir de la magnitud y el ángulo polar.',
      variables: [
        { simbolo: 'r', descripcion: 'Módulo o magnitud del vector (no negativo)', unidad: 'u' },
        { simbolo: '\\theta', descripcion: 'Ángulo medido en sentido antihorario desde el eje +X', unidad: 'rad / °' },
        { simbolo: 'V_x, V_y', descripcion: 'Componentes escalares en los ejes X e Y', unidad: 'u' },
      ],
      ejemploResuelto: {
        enunciado: 'Un vector de fuerza tiene magnitud r = 50 N y ángulo θ = 30°. Halla sus componentes rectangulares.',
        datos: 'r = 50 N, θ = 30°',
        desarrollo: 'V_x = 50 \\cdot \\cos(30°) = 43.30 \\text{ N}, \\quad V_y = 50 \\cdot \\sin(30°) = 25.00 \\text{ N}',
        resultado: 'V = (43.30, 25.00) N.',
      },
    },
    {
      id: 'magnitud-vector',
      nombre: 'Magnitud y Dirección (Teorema de Pitágoras y Arcotangente)',
      expresion: 'r = \\sqrt{V_x^2 + V_y^2}, \\quad \\theta = \\arctan\\left(\\frac{V_y}{V_x}\\right)',
      descripcion: 'Reconstruye el módulo y ángulo direccional a partir de las componentes cartesianas.',
      variables: [
        { simbolo: 'r', descripcion: 'Módulo o magnitud del vector', unidad: 'u' },
        { simbolo: 'V_x, V_y', descripcion: 'Componentes rectangulares', unidad: 'u' },
      ],
    },
  ],
  glosario: [
    { termino: 'Vector', definicion: 'Entidad matemática y física caracterizada por un módulo (magnitud), una dirección y un sentido.' },
    { termino: 'Coordenadas Polares', definicion: 'Sistema de representación de puntos o vectores mediante un radio r y un ángulo θ.' },
    { termino: 'Coordenadas Geográficas', definicion: 'Notación que especifica la dirección a partir de los puntos cardinales (N, S, E, O) y un ángulo de rumbo.' },
  ],
  teoria: {
    introduccion: 'Los vectores son esenciales para representar magnitudes físicas donde la dirección importa, como fuerza, velocidad, aceleración y campo eléctrico.',
    secciones: [
      {
        titulo: 'Sistemas de Coordenadas Vectoriales',
        contenido: 'Un vector en el plano puede expresarse en coordenadas rectangulares (Vx, Vy), coordenadas polares (r, θ) o coordenadas geográficas con rumbo (ej. N 30° E).',
      },
    ],
    resumen: [
      'Un vector queda unívocamente determinado por su magnitud y dirección.',
      'Las componentes ortogonales permiten operar algebraicamente con facilidad.',
    ],
  },
}

export const mruaData: TemaConfig = {
  id: 'sim-001',
  slug: 'movimiento-aceleracion-constante',
  titulo: 'Movimiento con Aceleración Constante (MRUA)',
  descripcionCorta: 'MRUA con gráficas x-t, v-t y a-t en tiempo real con parámetros dinámicos.',
  categoriaId: 'mecanica',
  dificultad: 'basico',
  estado: 'active',
  orden: 2,
  icono: '→',
  etiquetas: ['cinemática', 'MRUA', 'gráficas', 'aceleración', 'velocidad'],
  formulaPrincipal: 'x(t) = x_0 + v_0 t + \\frac{1}{2} a t^2',
  simComponentSlug: 'movimiento-aceleracion-constante',
  formulas: [
    {
      id: 'mrua-posicion',
      nombre: 'Ecuación Horaria de Posición',
      expresion: 'x(t) = x_0 + v_0 t + \\frac{1}{2} a t^2',
      descripcion: 'Posición cuadrática en función del tiempo para aceleración constante.',
      variables: [
        { simbolo: 'x(t)', descripcion: 'Posición al instante t', unidad: 'm' },
        { simbolo: 'x_0', descripcion: 'Posición inicial', unidad: 'm' },
        { simbolo: 'v_0', descripcion: 'Velocidad inicial', unidad: 'm/s' },
        { simbolo: 'a', descripcion: 'Aceleración constante', unidad: 'm/s²' },
      ],
    },
    {
      id: 'mrua-velocidad',
      nombre: 'Ecuación de Velocidad',
      expresion: 'v(t) = v_0 + a t',
      descripcion: 'Evolución lineal de la velocidad con el tiempo.',
      variables: [
        { simbolo: 'v(t)', descripcion: 'Velocidad en el instante t', unidad: 'm/s' },
        { simbolo: 'v_0', descripcion: 'Velocidad inicial', unidad: 'm/s' },
        { simbolo: 'a', descripcion: 'Aceleración constante', unidad: 'm/s²' },
      ],
    },
  ],
  glosario: [
    { termino: 'Aceleración (a)', definicion: 'Razón de cambio instantánea del vector velocidad respecto al tiempo.' },
    { termino: 'MRUA', definicion: 'Movimiento Rectilíneo Uniformemente Acelerado donde la aceleración es constante y no nula.' },
  ],
  teoria: {
    introduccion: 'El MRUA modela cuerpos sometidos a fuerzas netas constantes, como la caída libre cerca de la superficie terrestre.',
    secciones: [
      {
        titulo: 'Cinemática Cuadrática y Gráficas',
        contenido: 'La gráfica x-t es una parábola, la gráfica v-t es una recta con pendiente igual a la aceleración y la gráfica a-t es una recta horizontal.',
      },
    ],
    resumen: [
      'La aceleración constante produce variaciones lineales de la velocidad.',
      'El área bajo la curva v-t representa el desplazamiento neto.',
    ],
  },
}

export const tresFuerzasData: TemaConfig = {
  id: 'sim-002',
  slug: 'tres-fuerzas-equilibrio',
  titulo: 'Tres Fuerzas en Equilibrio',
  descripcionCorta: 'Equilibrio estático con poleas y pesas arrastrables.',
  categoriaId: 'mecanica',
  dificultad: 'basico',
  estado: 'active',
  orden: 3,
  icono: '△',
  etiquetas: ['estática', 'equilibrio', 'vectores', 'fuerzas'],
  formulaPrincipal: '\\sum \\vec{F} = \\vec{F}_1 + \\vec{F}_2 + \\vec{F}_3 = \\vec{0}',
  simComponentSlug: 'tres-fuerzas-equilibrio',
  formulas: [
    {
      id: 'primera-condicion-equilibrio',
      nombre: 'Primera Condición de Equilibrio (Fuerza Neta Nula)',
      expresion: '\\sum F_x = 0, \\quad \\sum F_y = 0',
      descripcion: 'Para que un cuerpo puntual esté en reposo estático, la resultante de todas las fuerzas concurrentes debe anularse.',
      variables: [
        { simbolo: '\\sum F_x', descripcion: 'Suma algebraica de componentes horizontales', unidad: 'N' },
        { simbolo: '\\sum F_y', descripcion: 'Suma algebraica de componentes verticales', unidad: 'N' },
      ],
    },
  ],
  glosario: [
    { termino: 'Equilibrio Estático', definicion: 'Estado de un cuerpo en reposo en el que la suma vectorial de todas las fuerzas y momentos aplicados es idénticamente cero.' },
  ],
  teoria: {
    introduccion: 'La estática de la partícula analiza las condiciones necesarias para que un sistema permanezca en equilibrio.',
    secciones: [
      {
        titulo: 'Polígono Cerrado de Fuerzas',
        contenido: 'Cuando tres fuerzas concurrentes están en equilibrio, al colocarlas secuencialmente forman un triángulo cerrado.',
      },
    ],
    resumen: ['La resultante de las tres fuerzas debe ser el vector nulo.'],
  },
}

export const sumaVectoresData: TemaConfig = {
  id: 'sim-003',
  slug: 'suma-vectores',
  titulo: 'Suma de Vectores',
  descripcionCorta: 'Método del paralelogramo, triángulo, polígono y método analítico.',
  categoriaId: 'mecanica',
  dificultad: 'basico',
  estado: 'active',
  orden: 4,
  icono: '⊕',
  etiquetas: ['vectores', 'suma vectorial', 'resultante', 'analítico'],
  formulaPrincipal: '\\vec{R} = \\vec{A} + \\vec{B} = \\sqrt{R_x^2 + R_y^2}',
  simComponentSlug: 'suma-vectores',
  formulas: [
    {
      id: 'vector-resultante',
      nombre: 'Vector Resultante por Componentes',
      expresion: 'R_x = A_x + B_x, \\quad R_y = A_y + B_y, \\quad R = \\sqrt{R_x^2 + R_y^2}',
      descripcion: 'Método analítico universal para sumar dos o más vectores descomponiendo en ejes ortogonales.',
      variables: [
        { simbolo: 'R_x, R_y', descripcion: 'Componentes cartesianas del vector resultante', unidad: 'u' },
        { simbolo: 'R', descripcion: 'Módulo del vector resultante', unidad: 'u' },
      ],
    },
  ],
  glosario: [
    { termino: 'Vector Resultante', definicion: 'Vector único que produce el mismo efecto que el conjunto de vectores sumados.' },
  ],
  teoria: {
    introduccion: 'La adición vectorial puede realizarse por métodos gráficos (paralelogramo, triángulo, polígono) o por descomposición analítica cartesiana.',
    secciones: [
      {
        titulo: 'Métodos Gráficos y Analíticos',
        contenido: 'El método analítico es el más preciso y permite sumar cualquier cantidad finita de vectores sumando sus componentes cartesianas algebraicamente.',
      },
    ],
    resumen: ['La suma de vectores respeta la conmutatividad y asociatividad.'],
  },
}

export const distanciaDesplazamientoData: TemaConfig = {
  id: 'sim-011',
  slug: 'distancia-desplazamiento',
  titulo: 'Distancia vs Desplazamiento',
  descripcionCorta: 'Comparativa interactiva entre longitud de trayectoria escalar s(t) y vector desplazamiento Δr(t).',
  categoriaId: 'mecanica',
  dificultad: 'basico',
  estado: 'active',
  orden: 6,
  icono: 'route',
  etiquetas: ['cinemática', 'distancia', 'desplazamiento', 'trayectoria', 'escalar', 'vectorial'],
  formulaPrincipal: 'd = \\int |v(t)| dt \\quad \\text{vs} \\quad \\Delta \\vec{r} = \\vec{r}_f - \\vec{r}_i',
  simComponentSlug: 'distancia-desplazamiento',
  formulas: [
    {
      id: 'desplazamiento-vectorial',
      nombre: 'Vector Desplazamiento',
      expresion: '\\Delta \\vec{r} = \\vec{r}_f - \\vec{r}_i',
      descripcion: 'Vector que une la posición inicial con la posición final, independientemente del camino seguido.',
      variables: [
        { simbolo: '\\Delta \\vec{r}', descripcion: 'Vector desplazamiento neto', unidad: 'm' },
        { simbolo: '\\vec{r}_i, \\vec{r}_f', descripcion: 'Posiciones inicial y final', unidad: 'm' },
      ],
    },
  ],
  glosario: [
    { termino: 'Distancia Recorrida', definicion: 'Longitud total de la trayectoria recorrida por un móvil; es una magnitud escalar siempre mayor o igual a cero.' },
    { termino: 'Desplazamiento', definicion: 'Magnitud vectorial que mide el cambio de posición en línea recta desde el punto inicial hasta el final.' },
  ],
  teoria: {
    introduccion: 'Distinguir entre distancia (escalar) y desplazamiento (vectorial) es el primer paso fundamental para dominar la cinemática moderna.',
    secciones: [
      {
        titulo: 'Trayectoria vs Vector Desplazamiento',
        contenido: 'Si un móvil da una vuelta completa a una pista circular y regresa al punto de partida, la distancia recorrida es 2πR mientras que su desplazamiento neto es estrictamente cero.',
      },
    ],
    resumen: ['La distancia nunca disminuye con el tiempo; el módulo del desplazamiento puede ser cero si el móvil retorna al origen.'],
  },
}

export const velocidadRapidezData: TemaConfig = {
  id: 'sim-012',
  slug: 'velocidad-rapidez',
  titulo: 'Velocidad vs Rapidez',
  descripcionCorta: 'Análisis de rapidez tangencial escalar vs vector velocidad en trayectorias curvilíneas y periódicas.',
  categoriaId: 'mecanica',
  dificultad: 'intermedio',
  estado: 'active',
  orden: 7,
  icono: 'speed',
  etiquetas: ['cinemática', 'velocidad', 'rapidez', 'órbita', 'vectorial'],
  formulaPrincipal: '\\vec{v}_{\\text{med}} = \\frac{\\Delta \\vec{r}}{\\Delta t} \\quad \\text{vs} \\quad r = \\frac{d}{\\Delta t}',
  simComponentSlug: 'velocidad-rapidez',
  formulas: [
    {
      id: 'velocidad-media',
      nombre: 'Velocidad Media Vectorial',
      expresion: '\\vec{v}_{\\text{med}} = \\frac{\\Delta \\vec{r}}{\\Delta t}',
      descripcion: 'Cociente entre el vector desplazamiento neto y el intervalo de tiempo empleado.',
      variables: [
        { simbolo: '\\vec{v}_{\\text{med}}', descripcion: 'Vector velocidad media', unidad: 'm/s' },
        { simbolo: '\\Delta \\vec{r}', descripcion: 'Desplazamiento neto', unidad: 'm' },
        { simbolo: '\\Delta t', descripcion: 'Intervalo temporal', unidad: 's' },
      ],
    },
  ],
  glosario: [
    { termino: 'Rapidez Media', definicion: 'Escalar correspondiente a la distancia total recorrida dividida entre el tiempo total.' },
    { termino: 'Velocidad Instantánea', definicion: 'Derivada temporal del vector posición en un instante infinitesimal (dr/dt).' },
  ],
  teoria: {
    introduccion: 'La velocidad es un vector con magnitud, dirección y sentido; la rapidez es simplemente el módulo escalar de la velocidad.',
    secciones: [
      {
        titulo: 'Velocidad y Rapidez en Movimientos Curvilíneos',
        contenido: 'Un móvil en movimiento circular uniforme tiene rapidez constante, pero su vector velocidad cambia de dirección en cada instante, generando aceleración centrípeta.',
      },
    ],
    resumen: ['La rapidez es una magnitud escalar no negativa; la velocidad es un vector.'],
  },
}

export const TEMAS_REGISTRY: Record<string, TemaConfig> = {
  'alcances-mru': alcancesMRUData,
  'alcances-encuentros': alcancesMRUData,
  'vectores': vectoresData,
  'movimiento-aceleracion-constante': mruaData,
  'tres-fuerzas-equilibrio': tresFuerzasData,
  'suma-vectores': sumaVectoresData,
  'distancia-desplazamiento': distanciaDesplazamientoData,
  'velocidad-rapidez': velocidadRapidezData,
}

export function getTemaBySlug(slug: string): TemaConfig | undefined {
  return TEMAS_REGISTRY[slug]
}
