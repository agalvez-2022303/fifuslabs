import type { TemaConfig } from './types'

export const alcancesMRUData: TemaConfig = {
  id: 'sim-013',
  slug: 'alcances-mru',
  titulo: 'Alcances y Encuentros MRU',
  descripcionCorta: 'Aprende cómo dos móviles se encuentran o se alcanzan en línea recta con velocidad constante.',
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
      descripcion: 'Calcula la ubicación exacta de un móvil en cualquier instante cuando se mueve a velocidad constante.',
      variables: [
        { simbolo: 'x(t)', descripcion: 'Posición final en el tiempo t', unidad: 'm' },
        { simbolo: 'x_0', descripcion: 'Posición inicial en t = 0', unidad: 'm' },
        { simbolo: 'v', descripcion: 'Velocidad constante (positiva a la derecha, negativa a la izquierda)', unidad: 'm/s' },
        { simbolo: 't', descripcion: 'Tiempo transcurrido', unidad: 's' },
      ],
      ejemploResuelto: {
        enunciado: 'Un automóvil parte del kilómetro 10 (x₀ = 10 m) con velocidad constante de 15 m/s. Determina su posición al cabo de 4 segundos.',
        datos: 'x₀ = 10 m, v = 15 m/s, t = 4 s',
        desarrollo: 'x(4) = 10 + (15 \\cdot 4) = 10 + 60 = 70 \\text{ m}',
        resultado: 'El automóvil se encuentra en la posición x = 70 m.',
      },
    },
    {
      id: 'tiempo-alcance',
      nombre: 'Tiempo de Alcance (Móviles en el Mismo Sentido)',
      expresion: 't_{\\text{alcance}} = \\frac{x_{B0} - x_{A0}}{v_A - v_B}',
      descripcion: 'Tiempo que tarda un móvil más rápido (A) en alcanzar a otro más lento (B) que va adelante en su misma dirección.',
      variables: [
        { simbolo: 't_{\\text{alcance}}', descripcion: 'Tiempo necesario para alcanzarlo', unidad: 's' },
        { simbolo: 'x_{B0} - x_{A0}', descripcion: 'Distancia inicial de separación', unidad: 'm' },
        { simbolo: 'v_A', descripcion: 'Velocidad del móvil que persigue (A > B)', unidad: 'm/s' },
        { simbolo: 'v_B', descripcion: 'Velocidad del móvil perseguido (B)', unidad: 'm/s' },
      ],
      ejemploResuelto: {
        enunciado: 'Una moto A sale del origen (x₀ = 0 m) a 15 m/s persiguiendo a una bicicleta B que está en x₀ = 40 m a 5 m/s. ¿En cuánto tiempo la alcanza?',
        datos: 'x_{A0} = 0 \\text{ m}, v_A = 15 \\text{ m/s}, x_{B0} = 40 \\text{ m}, v_B = 5 \\text{ m/s}',
        desarrollo: 't_{\\text{alcance}} = \\frac{40 - 0}{15 - 5} = \\frac{40}{10} = 4 \\text{ s}',
        resultado: 'La moto A alcanza a la bicicleta B a los 4 segundos.',
      },
    },
    {
      id: 'tiempo-encuentro',
      nombre: 'Tiempo de Encuentro (Móviles en Sentidos Opuestos)',
      expresion: 't_{\\text{encuentro}} = \\frac{d_0}{|v_A| + |v_B|}',
      descripcion: 'Tiempo que tardan dos móviles en cruzarse cuando viajan uno hacia el otro.',
      variables: [
        { simbolo: 't_{\\text{encuentro}}', descripcion: 'Tiempo hasta el cruce', unidad: 's' },
        { simbolo: 'd_0', descripcion: 'Distancia inicial de separación entre ambos', unidad: 'm' },
        { simbolo: 'v_A', descripcion: 'Rapidez del móvil A', unidad: 'm/s' },
        { simbolo: 'v_B', descripcion: 'Rapidez del móvil B', unidad: 'm/s' },
      ],
      ejemploResuelto: {
        enunciado: 'Dos amigos están separados 100 m. Uno camina a 2 m/s hacia la derecha y el otro corre a 3 m/s hacia la izquierda al encuentro. ¿Cuándo se cruzan?',
        datos: 'd₀ = 100 m, |v_A| = 2 m/s, |v_B| = 3 m/s',
        desarrollo: 't_{\\text{encuentro}} = \\frac{100}{2 + 3} = \\frac{100}{5} = 20 \\text{ s}',
        resultado: 'Los dos amigos se encuentran a los 20 segundos.',
      },
    },
    {
      id: 'posicion-encuentro',
      nombre: 'Posición del Punto de Encuentro o Alcance',
      expresion: 'x_{\\text{encuentro}} = x_{A0} + v_A \\cdot t_{\\text{encuentro}}',
      descripcion: 'Lugar exacto en la pista o calle donde coinciden ambos móviles.',
      variables: [
        { simbolo: 'x_{\\text{encuentro}}', descripcion: 'Lugar de coincidencia en el eje X', unidad: 'm' },
        { simbolo: 'x_{A0}', descripcion: 'Posición inicial del móvil A', unidad: 'm' },
        { simbolo: 'v_A', descripcion: 'Velocidad del móvil A', unidad: 'm/s' },
        { simbolo: 't_{\\text{encuentro}}', descripcion: 'Tiempo hallado de encuentro/alcance', unidad: 's' },
      ],
      ejemploResuelto: {
        enunciado: 'Con el ejemplo anterior (t = 20 s, x_{A0} = 0 m, v_A = 2 m/s), determina la posición de encuentro.',
        datos: 'x_{A0} = 0 m, v_A = 2 m/s, t = 20 s',
        desarrollo: 'x = 0 + (2 \\cdot 20) = 40 \\text{ m}',
        resultado: 'El encuentro ocurre exactamente a los 40 metros del origen.',
      },
    },
  ],
  glosario: [
    {
      termino: 'Alcance',
      definicion: 'Situación en la que un móvil posterior más rápido atrapa a uno delantero que viaja en su mismo sentido.',
      categoria: 'Conceptos Clave',
    },
    {
      termino: 'Desplazamiento',
      definicion: 'Cambio neto de posición de un objeto desde su punto inicial hasta el final.',
      categoria: 'Magnitudes Físicas',
    },
    {
      termino: 'Encuentro',
      definicion: 'Cruzamiento de dos móviles que se desplazan en sentidos opuestos a lo largo de una misma recta.',
      categoria: 'Conceptos Clave',
    },
    {
      termino: 'Movimiento Rectilíneo Uniforme (MRU)',
      definicion: 'Movimiento en línea recta con velocidad constante y aceleración nula (a = 0).',
      categoria: 'Cinemática',
    },
    {
      termino: 'Móvil',
      definicion: 'Cualquier objeto o vehículo en movimiento representado como un punto sin importar su tamaño.',
      categoria: 'Conceptos Generales',
    },
    {
      termino: 'Origen de Coordenadas',
      definicion: 'Punto de referencia fijo (x = 0 m) desde donde se miden todas las distancias.',
      categoria: 'Fundamentos',
    },
    {
      termino: 'Posición (x)',
      definicion: 'Ubicación exacta de un objeto en una recta en un instante de tiempo.',
      categoria: 'Cinemática',
    },
    {
      termino: 'Rapidez',
      definicion: 'Valor numérico de la velocidad sin tomar en cuenta la dirección (siempre positiva).',
      categoria: 'Magnitudes Físicas',
    },
    {
      termino: 'Velocidad (v)',
      definicion: 'Magnitud que indica qué tan rápido se mueve un cuerpo y hacia qué sentido se dirige.',
      categoria: 'Magnitudes Físicas',
    },
  ],
  teoria: {
    introduccion: '¿Te has preguntado cuánto tiempo tarda un autobús en alcanzar a un ciclista en la carretera? El estudio de alcances y encuentros nos ayuda a calcular el momento y lugar exacto donde dos cuerpos se cruzan.',
    secciones: [
      {
        titulo: '¿Qué es un alcance y un encuentro en física?',
        contenido: 'Es el análisis de dos objetos que se mueven en línea recta con velocidad constante (MRU).\n\n• **Alcance:** Ocurre cuando dos móviles van en el **mismo sentido** y el de atrás viaja más rápido para alcanzar al de adelante.\n• **Encuentro:** Ocurre cuando dos móviles viajan en **sentidos opuestos** (uno al encuentro del otro).',
      },
      {
        titulo: 'Ideas clave para entender este tema',
        contenido: '1. Ambos objetos se mueven en línea recta con velocidad constante (sin acelerar ni frenar).\n2. Para resolver cualquier problema, debemos elegir un **único punto cero (origen)** para medir las posiciones.\n3. Si los móviles van en el mismo sentido, restamos sus velocidades para saber qué tan rápido se acorta la distancia.\n4. Si van frente a frente, sumamos sus rapideces porque la distancia entre ellos disminuye mucho más rápido.\n5. El encuentro o alcance ocurre cuando ambos objetos llegan a la **misma coordenada de posición** ($x_A = x_B$).',
      },
      {
        titulo: 'Explicación paso a paso con un ejemplo cotidiano',
        contenido: 'Imagina que vas en un autobús a $15\\text{ m/s}$ y un automóvil viene detrás a $25\\text{ m/s}$ intentando alcanzarte desde $100\\text{ m}$ atrás.\n\n**Paso 1: Coloca el punto cero.**\nEl auto empieza en $x_A = 0\\text{ m}$ y el autobús en $x_B = 100\\text{ m}$.\n\n**Paso 2: Escribe las posiciones de cada uno.**\n• Auto: $x_A(t) = 0 + 25t$\n• Autobús: $x_B(t) = 100 + 15t$\n\n**Paso 3: Iguala las posiciones.**\n$25t = 100 + 15t \\implies 10t = 100 \\implies t = 10\\text{ s}$.\n\n**Paso 4: Encuentra el lugar del alcance.**\n$x = 25 \\times 10 = 250\\text{ m}$. ¡El auto alcanza al autobús a los 10 segundos y a los 250 metros del origen!',
      },
      {
        titulo: 'Errores comunes que debes evitar',
        contenido: '• **Confundir los signos:** Si un móvil regresa a la izquierda, su velocidad debe llevar signo negativo ($-v$).\n• **Usar dos origenes distintos:** Todas las posiciones iniciales deben medirse desde el mismo punto cero.\n• **Olvidar comprobar las unidades:** Asegúrate de que las distancias estén en metros (m) y los tiempos en segundos (s).',
      },
    ],
    resumen: [
      'El alcance sucede en el mismo sentido ($v_A > v_B$) y el encuentro sucede en sentidos opuestos.',
      'La clave matemática es igualar las ecuaciones de posición de ambos móviles: x_A(t) = x_B(t).',
      'El punto de intersección en la gráfica posición-tiempo indica el instante y lugar exacto del encuentro.',
    ],
  },
}
