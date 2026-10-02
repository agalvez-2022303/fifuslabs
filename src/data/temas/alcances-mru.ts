import type { TemaConfig } from './types'

export const alcancesMRUData: TemaConfig = {
  id: 'sim-013',
  slug: 'alcances-mru',
  titulo: 'Alcances y Encuentros MRU',
  descripcionCorta: 'Simulación interactiva 1D de móviles en persecución o sentidos opuestos con resolución analítica y gráfica sincrónica.',
  categoriaId: 'mecanica',
  dificultad: 'basico',
  estado: 'active',
  orden: 5,
  icono: 'compare_arrows',
  etiquetas: ['cinemática', 'MRU', 'alcance', 'encuentro', 'gráficas', 'tiempo'],
  formulaPrincipal: 'x(t) = x_0 + v \\cdot t',
  simComponentSlug: 'alcances-mru',
  formulas: [
    {
      id: 'mru-posicion',
      nombre: 'Ecuación Horaria de la Posición en MRU',
      expresion: 'x(t) = x_0 + v \\cdot t',
      descripcion: 'Describe la posición unidimensional de un cuerpo en función del tiempo para un movimiento rectilíneo con velocidad constante.',
      variables: [
        { simbolo: 'x(t)', descripcion: 'Posición final en el instante t', unidad: 'm' },
        { simbolo: 'x_0', descripcion: 'Posición inicial del móvil en t = 0', unidad: 'm' },
        { simbolo: 'v', descripcion: 'Velocidad constante del móvil (con signo de dirección)', unidad: 'm/s' },
        { simbolo: 't', descripcion: 'Tiempo transcurrido desde el origen', unidad: 's' },
      ],
      ejemploResuelto: {
        enunciado: 'Un automóvil parte del kilómetro 20 (x₀ = 20 m) con velocidad constante de 15 m/s. Determina su posición al cabo de 8 segundos.',
        datos: 'x₀ = 20 m, v = 15 m/s, t = 8 s',
        desarrollo: 'x(8) = 20 + (15 \\cdot 8) = 20 + 120 = 140 \\text{ m}',
        resultado: 'El automóvil se encuentra en la posición x = 140 m.',
      },
    },
    {
      id: 'tiempo-alcance',
      nombre: 'Tiempo de Alcance (Móviles en el Mismo Sentido)',
      expresion: 't_{\\text{alcance}} = \\frac{x_{B0} - x_{A0}}{v_A - v_B} \\quad (v_A > v_B)',
      descripcion: 'Tiempo requerido para que un móvil posterior A alcance a un móvil delantero B que se desplaza en el mismo sentido con menor velocidad.',
      variables: [
        { simbolo: 't_{\\text{alcance}}', descripcion: 'Tiempo necesario para el alcance', unidad: 's' },
        { simbolo: 'x_{B0} - x_{A0}', descripcion: 'Distancia inicial de separación entre ambos móviles', unidad: 'm' },
        { simbolo: 'v_A', descripcion: 'Velocidad del móvil que persigue (A)', unidad: 'm/s' },
        { simbolo: 'v_B', descripcion: 'Velocidad del móvil perseguido (B)', unidad: 'm/s' },
      ],
      ejemploResuelto: {
        enunciado: 'El móvil A parte del origen (x₀ = 0 m) a 20 m/s persiguiendo al móvil B que parte de x₀ = 100 m a 10 m/s en la misma dirección. ¿En cuánto tiempo lo alcanza?',
        datos: 'x_{A0} = 0 \\text{ m}, v_A = 20 \\text{ m/s}, x_{B0} = 100 \\text{ m}, v_B = 10 \\text{ m/s}',
        desarrollo: 't_{\\text{alcance}} = \\frac{100 - 0}{20 - 10} = \\frac{100}{10} = 10 \\text{ s}',
        resultado: 'El móvil A alcanza al móvil B a los 10 segundos.',
      },
    },
    {
      id: 'tiempo-encuentro',
      nombre: 'Tiempo de Encuentro (Móviles en Sentidos Opuestos)',
      expresion: 't_{\\text{encuentro}} = \\frac{x_{B0} - x_{A0}}{v_A - v_B} = \\frac{d_0}{|v_A| + |v_B|} \\quad (v_B < 0)',
      descripcion: 'Tiempo en el que dos móviles que viajan uno hacia el otro colisionan o se cruzan en la pista.',
      variables: [
        { simbolo: 't_{\\text{encuentro}}', descripcion: 'Tiempo hasta el cruce frontal', unidad: 's' },
        { simbolo: 'd_0', descripcion: 'Distancia inicial de separación absoluta', unidad: 'm' },
        { simbolo: 'v_A', descripcion: 'Velocidad hacia la derecha del móvil A', unidad: 'm/s' },
        { simbolo: 'v_B', descripcion: 'Velocidad hacia la izquierda del móvil B (negativa)', unidad: 'm/s' },
      ],
      ejemploResuelto: {
        enunciado: 'Dos trenes parten simultáneamente de dos estaciones separadas 5 000 m. El tren A va a 300 m/s hacia el este y el tren B a 200 m/s hacia el oeste. ¿Cuándo se cruzan?',
        datos: 'x_{A0} = 0 \\text{ m}, v_A = 300 \\text{ m/s}, x_{B0} = 5000 \\text{ m}, v_B = -200 \\text{ m/s}',
        desarrollo: 't = \\frac{5000 - 0}{300 - (-200)} = \\frac{5000}{500} = 10 \\text{ s}',
        resultado: 'Los trenes se encuentran a los 10 segundos de haber partido.',
      },
    },
    {
      id: 'posicion-encuentro',
      nombre: 'Posición del Punto de Encuentro o Alcance',
      expresion: 'x_{\\text{encuentro}} = x_{A0} + v_A \\cdot t_{\\text{encuentro}} = x_{B0} + v_B \\cdot t_{\\text{encuentro}}',
      descripcion: 'Punto del sistema de coordenadas cartesianas 1D donde coinciden las trayectorias de ambos móviles.',
      variables: [
        { simbolo: 'x_{\\text{encuentro}}', descripcion: 'Coordenada del punto de cruce en el eje x', unidad: 'm' },
        { simbolo: 'x_{A0}, x_{B0}', descripcion: 'Posiciones de origen de los móviles', unidad: 'm' },
        { simbolo: 't_{\\text{encuentro}}', descripcion: 'Instante de tiempo del cruce', unidad: 's' },
      ],
      ejemploResuelto: {
        enunciado: 'Con los datos del ejemplo anterior (t = 10 s, x_{A0} = 0 m, v_A = 300 m/s), halla la posición de encuentro.',
        datos: 'x_{A0} = 0 \\text{ m}, v_A = 300 \\text{ m/s}, t = 10 \\text{ s}',
        desarrollo: 'x = 0 + (300 \\cdot 10) = 3000 \\text{ m}. Comprobando con B: x = 5000 + (-200 \\cdot 10) = 3000 \\text{ m}.',
        resultado: 'El encuentro se produce exactamente a los 3 000 m (3 km) del origen.',
      },
    },
  ],
  glosario: [
    {
      termino: 'Móvil',
      definicion: 'Cualquier cuerpo u objeto idealizado como partícula puntual cuya posición cambia respecto a un marco de referencia a lo largo del tiempo.',
      categoria: 'Conceptos Generales',
    },
    {
      termino: 'Movimiento Rectilíneo Uniforme (MRU)',
      definicion: 'Movimiento en el cual un cuerpo se desplaza a lo largo de una línea recta con velocidad constante, lo que implica aceleración nula (a = 0) y distancias iguales recorridas en tiempos iguales.',
      categoria: 'Cinemática',
    },
    {
      termino: 'Velocidad (v)',
      definicion: 'Magnitud física vectorial que expresa el cambio de posición en el tiempo. En 1D su signo (+ o −) indica estrictamente el sentido del movimiento.',
      categoria: 'Magnitudes Físicas',
    },
    {
      termino: 'Rapidez',
      definicion: 'Magnitud escalar no negativa correspondiente al módulo o valor absoluto del vector velocidad (|v|).',
      categoria: 'Magnitudes Físicas',
    },
    {
      termino: 'Posición Inicial (x₀)',
      definicion: 'Coordenada espacial que ocupa un móvil en el instante de tiempo t = 0 con respecto al origen de coordenadas.',
      categoria: 'Cinemática',
    },
    {
      termino: 'Tiempo de Alcance',
      definicion: 'Instante en el que un móvil más rápido alcanza a otro que viaja delante en el mismo sentido, igualando sus coordenadas de posición.',
      categoria: 'Encuentros',
    },
    {
      termino: 'Tiempo de Encuentro',
      definicion: 'Instante en el que dos móviles que viajan en sentidos contrarios (uno hacia el otro) coinciden en una misma coordenada espacial.',
      categoria: 'Encuentros',
    },
    {
      termino: 'Sistema de Referencia Inercial',
      definicion: 'Marco de coordenadas y cronómetro respecto al cual se miden las posiciones y tiempos sin que el observador sufra aceleración.',
      categoria: 'Fundamentos',
    },
    {
      termino: 'Móviles Paralelos',
      definicion: 'Condición cinemática donde dos móviles poseen exactamente la misma velocidad (vA = vB) partiendo de posiciones distintas, manteniendo constante su separación y sin encontrarse jamás.',
      categoria: 'Casos Especiales',
    },
  ],
  teoria: {
    introduccion: 'El estudio de alcances y encuentros en Movimiento Rectilíneo Uniforme (MRU) es uno de los pilares clásicos de la cinemática. Permite comprender el principio de superposición, los sistemas de ecuaciones lineales aplicados a la física y la interpretación geométrica de intersección de rectas en el plano posición-tiempo (x-t).',
    secciones: [
      {
        titulo: '1. Fundamentos del MRU y Ecuación Horaria',
        contenido: 'En el Movimiento Rectilíneo Uniforme, la aceleración es nula (a = 0) y la velocidad vectorial se mantiene rigurosamente constante en magnitud y dirección.\n\nLa ley matemática de posición en función del tiempo se obtiene integrando la velocidad:\n\nx(t) = x_0 + \\int_{0}^{t} v \\, dt = x_0 + v \\cdot t\n\nEn una gráfica posición-tiempo (x vs t), esta función representa una recta con pendiente igual a la velocidad v y ordenada al origen igual a x₀.',
        destacado: 'La pendiente de la recta x(t) representa la velocidad del móvil. Pendiente positiva indica movimiento en sentido +x; pendiente negativa indica sentido −x.',
      },
      {
        titulo: '2. Alcance vs. Encuentro: Diferencia Conceptual',
        contenido: 'Se distinguen dos regímenes cinemáticos fundamentales:\n\n• **Alcance (Persecución):** Ambos móviles se desplazan en el mismo sentido (por ejemplo, vA > 0 y vB > 0 con vA > vB). El móvil posterior tiene mayor velocidad y va reduciendo la distancia de separación hasta igualar posiciones.\n\n• **Encuentro Frontal:** Los móviles viajan en sentidos contrarios (vA > 0 y vB < 0). La distancia entre ellos disminuye con una rapidez relativa igual a la suma de sus rapideces escalares (|vA| + |vB|), produciéndose el cruce en un tiempo significativamente menor.',
      },
      {
        titulo: '3. Método Analítico de Solución',
        contenido: 'Para resolver cualquier problema de encuentro o alcance:\n\n1. Se define un **único sistema de referencia** (origen x = 0 y sentido positivo hacia la derecha).\n2. Se escriben las ecuaciones horarias de cada móvil: xA(t) = xA0 + vA·t y xB(t) = xB0 + vB·t.\n3. Se impone la **condición física de encuentro**: xA(t_enc) = xB(t_enc).\n4. Se despeja el tiempo: (vA − vB)·t_enc = xB0 − xA0  ⇒  t_enc = (xB0 − xA0) / (vA − vB).\n5. Se sustituye t_enc en cualquiera de las dos ecuaciones para obtener la posición exacta x_enc.',
        destacado: 'Siempre verifica la coherencia física: un tiempo t > 0 indica un encuentro en el futuro; un tiempo t < 0 significa que se cruzaron en el pasado y ahora se alejan.',
      },
      {
        titulo: '4. Casos Especiales y Análisis de Singularidades',
        contenido: '• **vA = vB y xA0 ≠ xB0:** La diferencia de velocidades es cero (división por cero). Físicamente, la distancia entre ambos se conserva constante; son líneas paralelas en la gráfica x-t que nunca se intersecan.\n\n• **vA = vB y xA0 = xB0:** Ambos móviles ocupan la misma posición en todo instante (rectas coincidentes).\n\n• **xA0 = xB0 y vA ≠ vB:** El cruce ocurre en el instante inicial t = 0 s, a partir del cual se separan.',
      },
    ],
    resumen: [
      'La condición fundamental de encuentro es la igualdad de posiciones: x_A(t) = x_B(t).',
      'El tiempo de cruce se obtiene mediante t = (x_{B0} - x_{A0}) / (v_A - v_B).',
      'En el gráfico x-t, el instante y lugar de encuentro corresponden al punto exacto de intersección de las dos rectas horarias.',
      'Si las velocidades son iguales (v_A = v_B) y las posiciones distintas, los móviles son paralelos y nunca se encuentran.',
    ],
  },
}
