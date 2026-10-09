import type { TemaConfig } from './types'

export const mruData: TemaConfig = {
  id: 'sim-014',
  slug: 'mru',
  titulo: 'Movimiento Rectilíneo Uniforme (MRU)',
  descripcionCorta: 'Estudia el movimiento en línea recta con velocidad constante, gráficas x-t y v-t y tabla de valores.',
  categoriaId: 'mecanica',
  dificultad: 'basico',
  estado: 'active',
  orden: 1.5,
  icono: 'east',
  etiquetas: ['cinemática', 'MRU', 'velocidad constante', 'gráficas', 'posición', 'tiempo'],
  formulaPrincipal: 'x(t) = x_0 + v \\cdot t',
  simComponentSlug: 'mru',
  formulas: [
    {
      id: 'mru-posicion',
      nombre: 'Ecuación Horaria de la Posición en MRU',
      expresion: 'x(t) = x_0 + v \\cdot t',
      descripcion: 'Determina la ubicación exacta de un móvil en cualquier instante t sabiendo su posición inicial y velocidad constante.',
      variables: [
        { simbolo: 'x(t)', descripcion: 'Posición final en el instante t', unidad: 'm' },
        { simbolo: 'x_0', descripcion: 'Posición inicial en el tiempo t = 0', unidad: 'm' },
        { simbolo: 'v', descripcion: 'Velocidad constante del móvil', unidad: 'm/s' },
        { simbolo: 't', descripcion: 'Tiempo transcurrido', unidad: 's' },
      ],
      ejemploResuelto: {
        enunciado: 'Un móvil parte de la posición x₀ = 15 m con velocidad constante de v = 8 m/s. ¿Dónde estará a los t = 5 segundos?',
        datos: 'x₀ = 15 m, v = 8 m/s, t = 5 s',
        desarrollo: 'x(5) = 15 + (8 \\cdot 5) = 15 + 40 = 55 \\text{ m}',
        resultado: 'El móvil alcanza la posición x = 55 metros.',
      },
    },
    {
      id: 'mru-velocidad',
      nombre: 'Definición de Velocidad Constante',
      expresion: 'v = \\frac{\\Delta x}{\\Delta t} = \\frac{x - x_0}{t - t_0}',
      descripcion: 'Calcula el ritmo constante con el que un móvil cambia su posición por unidad de tiempo.',
      variables: [
        { simbolo: 'v', descripcion: 'Velocidad constante', unidad: 'm/s' },
        { simbolo: '\\Delta x', descripcion: 'Desplazamiento efectuado (x - x₀)', unidad: 'm' },
        { simbolo: '\\Delta t', descripcion: 'Intervalo de tiempo empleado', unidad: 's' },
      ],
      ejemploResuelto: {
        enunciado: 'Un atleta recorre una recta de 100 metros en 12.5 segundos a ritmo uniforme. Halla su velocidad.',
        datos: 'Δx = 100 m, Δt = 12.5 s',
        desarrollo: 'v = \\frac{100}{12.5} = 8.00 \\text{ m/s}',
        resultado: 'La velocidad constante del atleta es de 8.00 m/s.',
      },
    },
    {
      id: 'mru-tiempo',
      nombre: 'Cálculo del Tiempo Transcurrido',
      expresion: 't = \\frac{\\Delta x}{v} = \\frac{x - x_0}{v}',
      descripcion: 'Despeje para hallar el tiempo exacto necesario para recorrer cierto desplazamiento.',
      variables: [
        { simbolo: 't', descripcion: 'Tiempo transcurrido', unidad: 's' },
        { simbolo: '\\Delta x', descripcion: 'Desplazamiento requerido', unidad: 'm' },
        { simbolo: 'v', descripcion: 'Velocidad constante', unidad: 'm/s' },
      ],
      ejemploResuelto: {
        enunciado: '¿Cuánto tiempo tardará un tren a 20 m/s constante en recorrer un tramo recto de 300 metros?',
        datos: 'Δx = 300 m, v = 20 m/s',
        desarrollo: 't = \\frac{300}{20} = 15 \\text{ s}',
        resultado: 'El tren empleará 15 segundos en recorrer dicho tramo.',
      },
    },
  ],
  glosario: [
    { termino: 'Área bajo la curva v-t', definicion: 'En la gráfica velocidad-tiempo, el área del rectángulo delimitado representa el desplazamiento neto (Δx = v · t).' },
    { termino: 'Desplazamiento (Δx)', definicion: 'Cambio de posición experimentado por el móvil en la recta (Δx = x - x₀).' },
    { termino: 'Gráfica x-t', definicion: 'Representación cartesiana de la posición en función del tiempo. En MRU es siempre una recta inclinada cuyo valor de pendiente es la velocidad v.' },
    { termino: 'Gráfica v-t', definicion: 'Representación de la velocidad en función del tiempo. En MRU es una recta horizontal constante.' },
    { termino: 'Movimiento Rectilíneo Uniforme (MRU)', definicion: 'Movimiento en línea recta con velocidad constante y aceleración exactamente cero.' },
    { termino: 'Pendiente de la recta x-t', definicion: 'Inclinación de la función lineal posición-tiempo que equivale numéricamente a la velocidad del móvil.' },
    { termino: 'Posición Inicial (x₀)', definicion: 'Ubicación en la recta del móvil en el instante t = 0 s.' },
    { termino: 'Velocidad Constante (v)', definicion: 'Vector constante en magnitud, dirección y sentido; indica que el móvil recorre distancias iguales en tiempos iguales.' },
  ],
  teoria: {
    introduccion: 'Imagina viajar por una autopista recta en modo de control de crucero: tu velocímetro no cambia y la carretera es recta. Eso es el Movimiento Rectilíneo Uniforme (MRU).',
    secciones: [
      {
        titulo: '¿Qué es el Movimiento Rectilíneo Uniforme (MRU)?',
        contenido: 'El **MRU** es el tipo de movimiento más elemental en la física cinemática. Se caracteriza por dos condiciones fundamentales:\n\n• **Trayectoria recta:** El objeto se mueve sin cambiar de dirección ni dar curvas.\n• **Velocidad constante ($v = \\text{cte}$):** El móvil recorre distancias exactamente iguales en intervalos de tiempo iguales. En consecuencia, la **aceleración es nula ($a = 0\\text{ m/s}^2$).**',
      },
      {
        titulo: 'Ecuación Horaria y Comportamiento Matemático',
        contenido: 'La posición $x(t)$ de un móvil en MRU evoluciona mediante una función de primer grado (lineal):\n\n$$x(t) = x_0 + v \\cdot t$$\n\nDonde:\n• $x_0$ es la posición inicial al iniciar el cronómetro ($t = 0$).\n• $v$ es la velocidad (si es positiva el objeto avanza hacia la derecha, si es negativa se desplaza hacia la izquierda).\n• $t$ es el tiempo transcurrido.',
      },
      {
        titulo: 'Interpretación de las Gráficas Cinemáticas en MRU',
        contenido: '1. **Gráfica Posición vs Tiempo ($x-t$):** Es una línea recta. La **pendiente** de esta recta representa la velocidad $v$.\n   - Pendiente positiva ($v > 0$): el móvil se aleja en dirección $+X$.\n   - Pendiente negativa ($v < 0$): el móvil regresa hacia la izquierda ($-X$).\n2. **Gráfica Velocidad vs Tiempo ($v-t$):** Es una línea horizontal paralela al eje del tiempo. El **área bajo la recta** entre $0$ y $t$ equivale exactamente al desplazamiento $\\Delta x$.',
      },
      {
        titulo: 'Errores Comunes a Evitar',
        contenido: '• Sumar o restar la posición inicial $x_0$ sin tomar en cuenta su signo cartesiano.\n• Usar la fórmula de aceleración $x = \\frac{1}{2}a t^2$ cuando la velocidad es constante y $a = 0$.\n• Olvidar que una velocidad negativa no significa frenar, sino moverse en sentido contrario al eje positivo.',
      },
    ],
    resumen: [
      'En el MRU la velocidad se mantiene constante y la aceleración es igual a cero (a = 0).',
      'El móvil recorre distancias iguales en intervalos de tiempo iguales.',
      'La gráfica posición-tiempo es una recta cuya pendiente es la velocidad v.',
      'La gráfica velocidad-tiempo es una línea horizontal cuyo área representa el desplazamiento Δx.',
    ],
  },
}
