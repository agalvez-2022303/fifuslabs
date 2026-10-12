import type { TemaConfig } from './types'
import { alcancesMRUData } from './alcances-mru'
import { mruData } from './mru'

export * from './types'
export { alcancesMRUData, mruData }

export const vectoresData: TemaConfig = {
  id: 'sim-000',
  slug: 'vectores',
  titulo: 'Vectores y Coordenadas',
  descripcionCorta: 'Aprende a representar magnitudes vectoriales en coordenadas rectangulares, polares y geográficas.',
  categoriaId: 'mecanica',
  dificultad: 'basico',
  estado: 'active',
  orden: 1,
  icono: '↗',
  etiquetas: ['vectores', 'coordenadas', 'polar', 'rectangular', 'geográfico', 'práctica'],
  formulaPrincipal: 'V_x = r \\cos\\theta, \\quad V_y = r \\sin\\theta',
  simComponentSlug: 'vectores',
  formulas: [
    {
      id: 'polar-a-rectangular',
      nombre: 'Conversión Polar a Rectangular',
      expresion: 'V_x = r \\cos\\theta, \\quad V_y = r \\sin\\theta',
      descripcion: 'Calcula las componentes horizontales y verticales a partir de la magnitud y el ángulo del vector.',
      variables: [
        { simbolo: 'r', descripcion: 'Magnitud o tamaño del vector', unidad: 'u / m / N' },
        { simbolo: '\\theta', descripcion: 'Ángulo polar medido desde el eje +X', unidad: '°' },
        { simbolo: 'V_x, V_y', descripcion: 'Componentes horizontales y verticales', unidad: 'u / m / N' },
      ],
      ejemploResuelto: {
        enunciado: 'Un vector de fuerza tiene magnitud r = 10 N y ángulo θ = 60°. Halla sus componentes rectangulares.',
        datos: 'r = 10 N, θ = 60°',
        desarrollo: 'V_x = 10 \\cdot \\cos(60°) = 10 \\cdot 0.5 = 5.00 \\text{ N}, \\quad V_y = 10 \\cdot \\sin(60°) = 10 \\cdot 0.866 = 8.66 \\text{ N}',
        resultado: 'V = (5.00, 8.66) N.',
      },
    },
    {
      id: 'magnitud-vector',
      nombre: 'Magnitud del Vector (Teorema de Pitágoras)',
      expresion: 'r = \\sqrt{V_x^2 + V_y^2}',
      descripcion: 'Calcula la longitud total de un vector a partir de sus componentes en X e Y.',
      variables: [
        { simbolo: 'r', descripcion: 'Magnitud del vector', unidad: 'u / m / N' },
        { simbolo: 'V_x, V_y', descripcion: 'Componentes rectangulares', unidad: 'u' },
      ],
      ejemploResuelto: {
        enunciado: 'Un vector de desplazamiento tiene componentes V_x = 3 m y V_y = 4 m. Halla su magnitud.',
        datos: 'V_x = 3 m, V_y = 4 m',
        desarrollo: 'r = \\sqrt{3^2 + 4^2} = \\sqrt{9 + 16} = \\sqrt{25} = 5 \\text{ m}',
        resultado: 'La magnitud del vector es r = 5 m.',
      },
    },
    {
      id: 'angulo-vector',
      nombre: 'Ángulo de Dirección (Arcotangente)',
      expresion: '\\theta = \\arctan\\left(\\frac{|V_y|}{|V_x|}\\right)',
      descripcion: 'Encuentra la inclinación del vector a partir de sus componentes rectangulares.',
      variables: [
        { simbolo: '\\theta', descripcion: 'Ángulo respecto al eje horizontal', unidad: '°' },
        { simbolo: 'V_x, V_y', descripcion: 'Componentes rectangulares', unidad: 'u' },
      ],
      ejemploResuelto: {
        enunciado: 'Calcula el ángulo de un vector con V_x = 4 N y V_y = 4 N.',
        datos: 'V_x = 4 N, V_y = 4 N',
        desarrollo: '\\theta = \\arctan(4 / 4) = \\arctan(1) = 45°',
        resultado: 'El ángulo de dirección es \u03b8 = 45°.',
      },
    },
  ],
  glosario: [
    { termino: 'Ángulo Polar (θ)', definicion: 'Ángulo medido en sentido contrario a las agujas del reloj partiendo del semieje positivo +X.' },
    { termino: 'Componente Vectorial', definicion: 'Proyección del vector sobre uno de los ejes cartesianos (horizontal V_x o vertical V_y).' },
    { termino: 'Coordenadas Geográficas', definicion: 'Sistema que indica la dirección usando puntos cardinales (Norte, Sur, Este, Oeste).' },
    { termino: 'Coordenadas Polares', definicion: 'Sistema que define un vector mediante su magnitud r y un ángulo θ.' },
    { termino: 'Coordenadas Rectangulares', definicion: 'Sistema que describe un vector mediante sus avances en los ejes X e Y.' },
    { termino: 'Dirección', definicion: 'Inclinación de la recta sobre la que actúa el vector, medida por su ángulo.' },
    { termino: 'Magnitud (Módulo)', definicion: 'Tamaño o longitud del vector; siempre es un valor positivo con su unidad de medida.' },
    { termino: 'Sentido', definicion: 'Hacia dónde apunta la flecha del vector (ejemplo: hacia el Noreste o hacia la derecha).' },
    { termino: 'Vector', definicion: 'Magnitud física que tiene módulo (tamaño), dirección (inclinación) y sentido.' },
  ],
  teoria: {
    introduccion: '¿Te has fijado que decir "camina 5 metros" no es suficiente si no sabes hacia dónde ir? Un vector es una flecha que nos indica tamaño, inclinación y sentido.',
    secciones: [
      {
        titulo: '¿Qué es un vector y por qué es importante?',
        contenido: 'Un vector representa cantidades físicas donde la dirección importa, como la fuerza, la velocidad o el desplazamiento.\n\nSe compone de tres partes principales:\n• **Magnitud (Módulo):** El tamaño o longitud de la flecha (ejemplo: 50 N).\n• **Dirección:** La inclinación de la recta (ejemplo: 30° respecto al suelo).\n• **Sentido:** Hacia dónde apunta la flecha (ejemplo: hacia arriba a la derecha).',
      },
      {
        titulo: 'Sistemas de representación de vectores',
        contenido: '1. **Coordenadas Rectangulares:** Indican cuánto avanza el vector horizontalmente en X y verticalmente en Y: $\\vec{V} = (V_x, V_y)$.\n2. **Coordenadas Polares:** Indican la longitud total del vector $r$ y su ángulo $\\theta$ desde $+X$: $\\vec{V} = (r, \\theta)$.\n3. **Coordenadas Geográficas:** Indican el tamaño y la dirección usando puntos cardinales (Norte, Sur, Este, Oeste).',
      },
      {
        titulo: 'Explicación paso a paso con un ejemplo cotidiano',
        contenido: 'Imagina que caminas $50\\text{ metros}$ hacia el Noreste ($N\\;30^\\circ\\;E$).\n\n**Paso 1: Identifica la magnitud.**\nLa distancia que caminaste ($50\\text{ m}$) es la magnitud $r$.\n\n**Paso 2: Identifica la dirección.**\nLa inclinación de $30^\\circ$ desde el Norte hacia el Este da el sentido.\n\n**Paso 3: Descompón en X e Y.**\nAvanzaste un tramo al Este ($V_x$) y otro al Norte ($V_y$). Usando seno y coseno calculas cuántos metros caminaste exactamente en cada dirección.',
      },
      {
        titulo: 'Errores comunes',
        contenido: '• Olvidar colocar el signo negativo a las componentes que van hacia la izquierda ($-X$) o abajo ($-Y$).\n• Medir el ángulo polar desde el eje vertical $Y$ en lugar de iniciar desde el eje horizontal $+X$.',
      },
    ],
    resumen: [
      'Un vector queda definido por su magnitud (tamaño), dirección (inclinación) y sentido (flecha).',
      'Las componentes rectangulares V_x y V_y permiten trabajar fácilmente en los ejes X e Y.',
      'Usamos trigonometría para convertir entre coordenadas polares y rectangulares.',
    ],
  },
}

export const mruaData: TemaConfig = {
  id: 'sim-001',
  slug: 'movimiento-aceleracion-constante',
  titulo: 'Movimiento con Aceleración Constante (MRUA)',
  descripcionCorta: 'Aprende cómo cambia la velocidad de un objeto a un ritmo constante cuando acelera o frena.',
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
      nombre: 'Ecuación Horaria de la Posición en MRUA',
      expresion: 'x(t) = x_0 + v_0 t + \\frac{1}{2} a t^2',
      descripcion: 'Calcula la posición final de un cuerpo que acelera o frena uniformemente.',
      variables: [
        { simbolo: 'x(t)', descripcion: 'Posición final en el instante t', unidad: 'm' },
        { simbolo: 'x_0', descripcion: 'Posición inicial', unidad: 'm' },
        { simbolo: 'v_0', descripcion: 'Velocidad inicial', unidad: 'm/s' },
        { simbolo: 'a', descripcion: 'Aceleración constante', unidad: 'm/s²' },
        { simbolo: 't', descripcion: 'Tiempo transcurrido', unidad: 's' },
      ],
      ejemploResuelto: {
        enunciado: 'Un automóvil parte del reposo (x₀ = 0 m, v₀ = 0 m/s) con aceleración constante de 2 m/s². ¿Dónde está a los 4 segundos?',
        datos: 'x₀ = 0 m, v₀ = 0 m/s, a = 2 m/s², t = 4 s',
        desarrollo: 'x(4) = 0 + (0 \\cdot 4) + \\frac{1}{2}(2)(4^2) = 1 \\cdot 16 = 16 \\text{ m}',
        resultado: 'El automóvil se encuentra en la posición x = 16 m.',
      },
    },
    {
      id: 'mrua-velocidad',
      nombre: 'Ecuación de la Velocidad',
      expresion: 'v(t) = v_0 + a t',
      descripcion: 'Calcula la velocidad alcanzada tras acelerar o frenar durante cierto tiempo.',
      variables: [
        { simbolo: 'v(t)', descripcion: 'Velocidad final en el instante t', unidad: 'm/s' },
        { simbolo: 'v_0', descripcion: 'Velocidad inicial', unidad: 'm/s' },
        { simbolo: 'a', descripcion: 'Aceleración constante', unidad: 'm/s²' },
        { simbolo: 't', descripcion: 'Tiempo transcurrido', unidad: 's' },
      ],
      ejemploResuelto: {
        enunciado: 'Un autobús viaja a 10 m/s y acelera a 3 m/s² durante 5 segundos. ¿Cuál es su velocidad final?',
        datos: 'v₀ = 10 m/s, a = 3 m/s², t = 5 s',
        desarrollo: 'v(5) = 10 + (3 \\cdot 5) = 10 + 15 = 25 \\text{ m/s}',
        resultado: 'La velocidad final del autobús es 25 m/s.',
      },
    },
    {
      id: 'torricelli',
      nombre: 'Ecuación Independiente del Tiempo (Torricelli)',
      expresion: 'v_f^2 = v_0^2 + 2 a \\Delta x',
      descripcion: 'Relaciona velocidades y distancia recorrida sin necesidad de conocer el tiempo.',
      variables: [
        { simbolo: 'v_f', descripcion: 'Velocidad final', unidad: 'm/s' },
        { simbolo: 'v_0', descripcion: 'Velocidad inicial', unidad: 'm/s' },
        { simbolo: 'a', descripcion: 'Aceleración constante', unidad: 'm/s²' },
        { simbolo: '\\Delta x', descripcion: 'Distancia recorrida', unidad: 'm' },
      ],
      ejemploResuelto: {
        enunciado: 'Un auto frena a v₀ = 10 m/s con a = -2 m/s² hasta detenerse (v_f = 0). Halla la distancia de frenado.',
        datos: 'v_f = 0 m/s, v₀ = 10 m/s, a = -2 m/s²',
        desarrollo: '0 = 10^2 + 2(-2)\\Delta x \\implies 0 = 100 - 4\\Delta x \\implies 4\\Delta x = 100 \\implies \\Delta x = 25 \\text{ m}',
        resultado: 'El automóvil necesita 25 metros para detenerse por completo.',
      },
    },
  ],
  glosario: [
    { termino: 'Aceleración (a)', definicion: 'Ritmo de cambio de la velocidad por unidad de tiempo, medida en m/s².' },
    { termino: 'Aceleración de la Gravedad (g)', definicion: 'Aceleración constante con la que caen los cuerpos cerca de la Tierra (9.8 m/s²).' },
    { termino: 'Desaceleración (Frenado)', definicion: 'Aceleración con signo opuesto a la velocidad que reduce la rapidez del móvil.' },
    { termino: 'MRUA', definicion: 'Movimiento Rectilíneo Uniformemente Acelerado con aceleración constante y recta.' },
    { termino: 'Parábola', definicion: 'Curva característica que forma la gráfica posición-tiempo en el MRUA.' },
    { termino: 'Pendiente en gráfica v-t', definicion: 'La inclinación de la recta velocidad-tiempo representa la aceleración.' },
    { termino: 'Reposo', definicion: 'Estado de un móvil cuya velocidad inicial es cero (v₀ = 0 m/s).' },
    { termino: 'Velocidad Final (v_f)', definicion: 'Velocidad alcanzada al concluir el tramo de tiempo analizado.' },
    { termino: 'Velocidad Inicial (v_0)', definicion: 'Velocidad que llevaba el móvil al comenzar el tiempo (t = 0 s).' },
  ],
  teoria: {
    introduccion: 'Cuando un auto arranca en un semáforo o frena antes de un cruce, su velocidad cambia segundo a segundo. Este cambio de velocidad se llama aceleración.',
    secciones: [
      {
        titulo: '¿Qué es el MRUA?',
        contenido: 'Es un movimiento en línea recta donde la aceleración se mantiene constante.\n\n• Si el cuerpo **acelera** (a > 0), gana velocidad a un ritmo constante.\n• Si el cuerpo **frena** (a < 0), pierde velocidad a un ritmo constante.',
      },
      {
        titulo: 'Explicación paso a paso con un ejemplo cotidiano',
        contenido: 'Imagina que tu carro arranca cuando el semáforo cambia a verde con una aceleración constante de $2\\text{ m/s}^2$.\n\n• En $t = 0\\text{ s}$, va a $0\\text{ m/s}$.\n• En $t = 1\\text{ s}$, va a $2\\text{ m/s}$.\n• En $t = 2\\text{ s}$, va a $4\\text{ m/s}$.\n• En $t = 3\\text{ s}$, va a $6\\text{ m/s}$.\n\n¡Cada segundo que transcurre gana exactamente $2\\text{ m/s}$ de rapidez!',
      },
      {
        titulo: 'Errores comunes',
        contenido: '• Confundir velocidad con aceleración (mucha aceleración significa ganar velocidad rápidamente, no necesariamente ir rápido en el origen).\n• Olvidar elevar el tiempo al cuadrado ($t^2$) en la fórmula de posición.',
      },
    ],
    resumen: [
      'En el MRUA la aceleración es constante y distinta de cero.',
      'La velocidad cambia de forma lineal con el tiempo (v = v₀ + a·t).',
      'La posición cambia en forma de parábola cuadrática (x = x₀ + v₀·t + ½·a·t²).',
    ],
  },
}

export const tresFuerzasData: TemaConfig = {
  id: 'sim-002',
  slug: 'tres-fuerzas-equilibrio',
  titulo: 'Tres Fuerzas en Equilibrio',
  descripcionCorta: 'Aprende cómo tres fuerzas se cancelan entre sí para mantener un objeto inmóvil.',
  categoriaId: 'mecanica',
  dificultad: 'basico',
  estado: 'active',
  orden: 3,
  icono: '△',
  etiquetas: ['estática', 'equilibrio', 'vectores', 'fuerzas'],
  formulaPrincipal: '\\sum F_x = 0, \\quad \\sum F_y = 0',
  simComponentSlug: 'tres-fuerzas-equilibrio',
  formulas: [
    {
      id: 'primera-condicion-equilibrio',
      nombre: 'Primera Condición de Equilibrio (Fuerza Neta Nula)',
      expresion: '\\sum F_x = 0, \\quad \\sum F_y = 0',
      descripcion: 'Para que un cuerpo esté en reposo estático, la suma de fuerzas en X e Y debe ser cero.',
      variables: [
        { simbolo: '\\sum F_x', descripcion: 'Suma de componentes horizontales', unidad: 'N' },
        { simbolo: '\\sum F_y', descripcion: 'Suma de componentes verticales', unidad: 'N' },
      ],
      ejemploResuelto: {
        enunciado: 'Dos fuerzas horizontales jalan un bloque en reposo: F₁ = +50 N hacia la derecha y F₂ hacia la izquierda. Halla F₂.',
        datos: 'F₁ = 50 N, F₂ = ?',
        desarrollo: '\\sum F_x = 0 \\implies F_1 - F_2 = 0 \\implies 50 - F_2 = 0 \\implies F_2 = 50 \\text{ N}',
        resultado: 'La fuerza F₂ debe ser de 50 N hacia la izquierda.',
      },
    },
    {
      id: 'equilibrio-vertical',
      nombre: 'Equilibrio Vertical al Sostener un Peso',
      expresion: 'F_{1y} + F_{2y} = P',
      descripcion: 'Las componentes verticales hacia arriba de las cuerdas deben sostener el peso total hacia abajo.',
      variables: [
        { simbolo: 'F_{1y}, F_{2y}', descripcion: 'Componentes verticales de las cuerdas', unidad: 'N' },
        { simbolo: 'P', descripcion: 'Peso suspendido (m · g)', unidad: 'N' },
      ],
      ejemploResuelto: {
        enunciado: 'Una piñata de peso P = 100 N está sostenida simétricamente por dos cuerdas. ¿Cuánto sostiene verticalmente cada cuerda?',
        datos: 'P = 100 N, F_{1y} = F_{2y} = T_y',
        desarrollo: 'T_y + T_y = 100 \\implies 2T_y = 100 \\implies T_y = 50 \\text{ N}',
        resultado: 'Cada cuerda ejerce una fuerza vertical de 50 N.',
      },
    },
  ],
  glosario: [
    { termino: 'Diagrama de Cuerpo Libre (DCL)', definicion: 'Dibujo donde se representan todas las fuerzas externas que actúan sobre un objeto.' },
    { termino: 'Equilibrio Estático', definicion: 'Estado de reposo donde la suma de todas las fuerzas aplicadas es igual a cero.' },
    { termino: 'Fuerza (F⃗)', definicion: 'Interacción capaz de mover, detener o deformar un cuerpo, medida en Newtons (N).' },
    { termino: 'Fuerza Neta', definicion: 'Suma de todas las fuerzas que actúan sobre un cuerpo.' },
    { termino: 'Newton (N)', definicion: 'Unidad de fuerza del Sistema Internacional (1 N = 1 kg · m/s²).' },
    { termino: 'Peso (P)', definicion: 'Fuerza de atracción gravitatoria que ejerce la Tierra sobre una masa (P = m · g).' },
    { termino: 'Polígono Cerrado', definicion: 'Figura geométrica formada al conectar secuencialmente vectores de fuerza en equilibrio.' },
    { termino: 'Tensión (T)', definicion: 'Fuerza ejercida por una cuerda, cable o cadena tensada.' },
    { termino: 'Teorema de Lami', definicion: 'Ecuación trigonométrica que relaciona tres fuerzas en equilibrio con sus ángulos opuestos.' },
  ],
  teoria: {
    introduccion: '¿Por qué un semáforo colgado en medio de la calle no se cae? Gracias al equilibrio estático, las fuerzas de los cables se cancelan exactamente.',
    secciones: [
      {
        titulo: '¿Qué es el equilibrio de tres fuerzas?',
        contenido: 'Ocurre cuando tres fuerzas actúan sobre un mismo punto y su suma vectorial da cero.\n\n• **Condición horizontal:** Las fuerzas que jalan a la derecha deben igualar a las de la izquierda ($\\sum F_x = 0$).\n• **Condición vertical:** Las fuerzas que jalan hacia arriba deben igualar al peso hacia abajo ($\\sum F_y = 0$).',
      },
      {
        titulo: 'Explicación paso a paso con un ejemplo cotidiano',
        contenido: 'Imagina una piñata sostenida por dos cuerdas amarradas a dos postes.\n\n1. El peso de la piñata tira verticalmente hacia abajo ($P$).\n2. La cuerda izquierda tira hacia arriba y la izquierda ($F_1$).\n3. La cuerda derecha tira hacia arriba y la derecha ($F_2$).\n4. Las fuerzas horizontales se anulan entre sí y las componentes verticales juntas cargan el peso.',
      },
      {
        titulo: 'Errores comunes',
        contenido: '• Sumar los valores numéricos de las tensiones directamente sin descomponer en X e Y.\n• Confundir la masa en kilogramos (kg) con el peso en Newtons (N = kg · 9.8 m/s²).',
      },
    ],
    resumen: [
      'Un cuerpo en equilibrio estático tiene aceleración cero y fuerza neta nula (ΣF = 0).',
      'Las fuerzas se descomponen en los ejes X e Y para igualar las sumas a cero.',
      'Si se dibujan secuencialmente, las tres fuerzas forman un triángulo cerrado.',
    ],
  },
}

export const sumaVectoresData: TemaConfig = {
  id: 'sim-003',
  slug: 'suma-vectores',
  titulo: 'Suma de Vectores',
  descripcionCorta: 'Calcula el efecto combinado de múltiples vectores usando métodos gráficos y analíticos.',
  categoriaId: 'mecanica',
  dificultad: 'basico',
  estado: 'active',
  orden: 4,
  icono: '⊕',
  etiquetas: ['vectores', 'suma vectorial', 'resultante', 'analítico'],
  formulaPrincipal: 'R_x = A_x + B_x, \\quad R_y = A_y + B_y, \\quad R = \\sqrt{R_x^2 + R_y^2}',
  simComponentSlug: 'suma-vectores',
  formulas: [
    {
      id: 'vector-resultante',
      nombre: 'Vector Resultante por Componentes',
      expresion: 'R_x = A_x + B_x, \\quad R_y = A_y + B_y, \\quad R = \\sqrt{R_x^2 + R_y^2}',
      descripcion: 'Método analítico universal para sumar dos o más vectores descomponiendo en ejes ortogonales.',
      variables: [
        { simbolo: 'R_x, R_y', descripcion: 'Componentes cartesianas del vector resultante', unidad: 'u / N / m' },
        { simbolo: 'R', descripcion: 'Módulo del vector resultante', unidad: 'u / N / m' },
      ],
      ejemploResuelto: {
        enunciado: 'Suma dos vectores: A_x = 4 m, A_y = 0 m y B_x = 0 m, B_y = 3 m. Halla la resultante.',
        datos: 'A = (4, 0) m, B = (0, 3) m',
        desarrollo: 'R_x = 4 + 0 = 4 \\text{ m}, \\quad R_y = 0 + 3 = 3 \\text{ m}. \\quad R = \\sqrt{4^2 + 3^2} = \\sqrt{25} = 5 \\text{ m}',
        resultado: 'El vector resultante es R = 5 m a 36.87° del eje +X.',
      },
    },
  ],
  glosario: [
    { termino: 'Componente Rectangular', definicion: 'Proyección de un vector sobre el eje horizontal X o vertical Y.' },
    { termino: 'Descomposición Vectorial', definicion: 'Separación de un vector en dos proyecciones perpendiculares.' },
    { termino: 'Método Analítico', definicion: 'Procedimiento matemático exacto que suma vectores mediante sus componentes X e Y.' },
    { termino: 'Método del Paralelogramo', definicion: 'Método gráfico para sumar dos vectores formando un cuadrilátero.' },
    { termino: 'Método del Polígono', definicion: 'Método gráfico para sumar varios vectores conectándolos cabeza con cola.' },
    { termino: 'Método del Triángulo', definicion: 'Método gráfico donde la resultante une el inicio del primer vector con el fin del segundo.' },
    { termino: 'Resultante (R)', definicion: 'Vector único equivalente que produce el mismo efecto que todos los vectores sumados.' },
    { termino: 'Vector Equilibrante', definicion: 'Vector de igual tamaño pero sentido contrario a la resultante que logra anular todas las fuerzas.' },
    { termino: 'Vectores Concurrentes', definicion: 'Vectores cuyas líneas de acción se cruzan en un mismo punto.' },
  ],
  teoria: {
    introduccion: 'Si dos personas jalan una caja en direcciones diferentes, ¿hacia dónde se moverá la caja? La suma vectorial nos da la respuesta exacta.',
    secciones: [
      {
        titulo: '¿Qué es la suma de vectores?',
        contenido: 'Es el proceso de encontrar un único vector equivalente (llamado Resultante $\\vec{R}$) que produce el mismo efecto que varias fuerzas o desplazamientos combinados.',
      },
      {
        titulo: 'Métodos para sumar vectores',
        contenido: '• **Método Gráfico (Cabeza con cola):** Se dibuja el segundo vector donde termina el primero. La resultante se traza desde el origen inicial hasta la punta final.\n• **Método Analítico (Componentes):** Se suman todas las componentes horizontales ($R_x = \\sum V_x$) y verticales ($R_y = \\sum V_y$), y luego se calcula la magnitud con Pitágoras ($R = \\sqrt{R_x^2 + R_y^2}$).',
      },
      {
        titulo: 'Errores comunes',
        contenido: '• Sumar los valores numéricos directamente (pensar que $4\\text{ m} + 3\\text{ m} = 7\\text{ m}$ en diagonal).\n• Olvidar colocar signos negativos a las componentes que apuntan hacia la izquierda o abajo.',
      },
    ],
    resumen: [
      'La resultante R reemplaza a todos los vectores sumados produciendo el mismo efecto.',
      'En el método analítico sumamos componentes X por un lado e Y por otro.',
      'El módulo de la resultante se obtiene con el teorema de Pitágoras.',
    ],
  },
}

export const distanciaDesplazamientoData: TemaConfig = {
  id: 'sim-011',
  slug: 'distancia-desplazamiento',
  titulo: 'Distancia vs Desplazamiento',
  descripcionCorta: 'Entiende la diferencia entre el camino recorrido (escalar) y el cambio en línea recta de posición (vector).',
  categoriaId: 'mecanica',
  dificultad: 'basico',
  estado: 'active',
  orden: 6,
  icono: 'route',
  etiquetas: ['cinemática', 'distancia', 'desplazamiento', 'trayectoria', 'escalar', 'vectorial'],
  formulaPrincipal: 'd = d_1 + d_2 \\quad \\text{vs} \\quad \\Delta \\vec{r} = \\vec{r}_f - \\vec{r}_i',
  simComponentSlug: 'distancia-desplazamiento',
  formulas: [
    {
      id: 'desplazamiento-vectorial',
      nombre: 'Vector Desplazamiento',
      expresion: '\\Delta \\vec{r} = \\vec{r}_f - \\vec{r}_i',
      descripcion: 'Calcula el cambio de ubicación en línea recta desde la posición inicial a la final.',
      variables: [
        { simbolo: '\\Delta \\vec{r}', descripcion: 'Vector desplazamiento neto', unidad: 'm' },
        { simbolo: '\\vec{r}_i, \\vec{r}_f', descripcion: 'Posiciones inicial y final', unidad: 'm' },
      ],
      ejemploResuelto: {
        enunciado: 'Estás en la marca x_i = 10 m y caminas hasta x_f = 35 m. Halla el desplazamiento.',
        datos: 'x_i = 10 m, x_f = 35 m',
        desarrollo: '\\Delta x = 35 - 10 = 25 \\text{ m}',
        resultado: 'El desplazamiento es de +25 m a la derecha.',
      },
    },
  ],
  glosario: [
    { termino: 'Desplazamiento (Δr⃗)', definicion: 'Magnitud vectorial que mide la separación en línea recta entre el punto de origen y el de destino.' },
    { termino: 'Distancia (d)', definicion: 'Magnitud escalar que mide la longitud total del camino recorrido por un móvil.' },
    { termino: 'Escalar', definicion: 'Magnitud física que queda definida con un valor numérico y su unidad de medida (sin dirección).' },
    { termino: 'Longitud de Trayectoria', definicion: 'Suma de las longitudes de todos los tramos o curvas por los que pasa un objeto.' },
    { termino: 'Módulo del Desplazamiento', definicion: 'Valor numérico y positivo de la longitud de la línea recta entre el inicio y el final.' },
    { termino: 'Posición Final (r⃗_f)', definicion: 'Ubicación del móvil al terminar su movimiento.' },
    { termino: 'Posición Inicial (r⃗_i)', definicion: 'Ubicación del móvil al comenzar su movimiento.' },
    { termino: 'Trayectoria', definicion: 'Camino o línea imaginaria trazada por un objeto al moverse.' },
    { termino: 'Vectorial', definicion: 'Magnitud física que requiere tamaño (módulo), dirección y sentido.' },
  ],
  teoria: {
    introduccion: '¿Sabías que puedes caminar 100 metros y haberte desplazado 0 metros? En física, distancia y desplazamiento no son lo mismo.',
    secciones: [
      {
        titulo: 'Diferencia conceptual',
        contenido: '• **Distancia ($d$):** Es la longitud total del camino que recorres. Es un **escalar** (siempre suma y no le importa la dirección).\n• **Desplazamiento ($\Delta \\vec{r}$):** Es la distancia en línea recta entre el punto inicial y el punto final. Es un **vector** (cuenta hacia dónde fuiste).',
      },
      {
        titulo: 'Explicación con un ejemplo cotidiano',
        contenido: 'Si le das una vuelta completa a una cancha de fútbol de $400\\text{ m}$ de perímetro y regresas al punto de salida:\n\n• Tu **distancia recorrida** es de $400\\text{ m}$.\n• Tu **desplazamiento** es de $0\\text{ m}$ (porque terminaste en el mismo lugar de origen).',
      },
    ],
    resumen: [
      'La distancia mide todo el camino recorrido (escalar siempre positivo).',
      'El desplazamiento mide la separación en línea recta entre inicio y fin (vector).',
      'Si no das la vuelta y vas en línea recta, la distancia es igual al módulo del desplazamiento.',
    ],
  },
}

export const velocidadRapidezData: TemaConfig = {
  id: 'sim-012',
  slug: 'velocidad-rapidez',
  titulo: 'Velocidad vs Rapidez',
  descripcionCorta: 'Diferencia la rapidez (escalar) de la velocidad vectorial en movimientos rectilíneos y curvos.',
  categoriaId: 'mecanica',
  dificultad: 'intermedio',
  estado: 'active',
  orden: 7,
  icono: 'speed',
  etiquetas: ['cinemática', 'velocidad', 'rapidez', 'órbita', 'vectorial'],
  formulaPrincipal: 'r = \\frac{d}{\\Delta t} \\quad \\text{vs} \\quad \\vec{v} = \\frac{\\Delta \\vec{r}}{\\Delta t}',
  simComponentSlug: 'velocidad-rapidez',
  formulas: [
    {
      id: 'rapidez-media',
      nombre: 'Rapidez Media Escalar',
      expresion: 'r_{\\text{med}} = \\frac{d}{\\Delta t}',
      descripcion: 'Calcula el promedio de prisa o velocidad escalar en todo el viaje.',
      variables: [
        { simbolo: 'r_{\\text{med}}', descripcion: 'Rapidez media', unidad: 'm/s' },
        { simbolo: 'd', descripcion: 'Distancia total recorrida', unidad: 'm' },
        { simbolo: '\\Delta t', descripcion: 'Tiempo total empleado', unidad: 's' },
      ],
      ejemploResuelto: {
        enunciado: 'Un automóvil recorre una distancia de 120 metros en 6 segundos. Halla su rapidez media.',
        datos: 'd = 120 m, \u0394t = 6 s',
        desarrollo: 'r_{\\text{med}} = \\frac{120}{6} = 20 \\text{ m/s}',
        resultado: 'La rapidez media es de 20 m/s.',
      },
    },
  ],
  glosario: [
    { termino: 'Aceleración', definicion: 'Cambio de la velocidad (en valor o dirección) por unidad de tiempo.' },
    { termino: 'Rapidez Instantánea', definicion: 'Valor de la rapidez de un cuerpo en un instante preciso de tiempo.' },
    { termino: 'Rapidez Media', definicion: 'Distancia total recorrida dividida entre el tiempo total del viaje.' },
    { termino: 'Sistema Internacional (SI)', definicion: 'Estándar científico donde la velocidad y rapidez se miden en metros por segundo (m/s).' },
    { termino: 'Velocidad (v⃗)', definicion: 'Magnitud vectorial que indica qué tan rápido cambia la posición y en qué dirección.' },
    { termino: 'Velocidad Instantánea', definicion: 'Vector velocidad de un cuerpo en un instante determinado.' },
    { termino: 'Velocidad Media', definicion: 'Cociente entre el vector desplazamiento neto y el tiempo empleado.' },
    { termino: 'Velocidad Tangencial', definicion: 'Velocidad cuya dirección es tangente a la curva del camino.' },
    { termino: 'Velocímetro', definicion: 'Instrumento que mide la rapidez instantánea de un vehículo.' },
  ],
  teoria: {
    introduccion: 'Aunque en la vida diaria usamos rapidez y velocidad como sinónimos, en física tienen significados muy distintos.',
    secciones: [
      {
        titulo: 'Diferencia entre rapidez y velocidad',
        contenido: '• **Rapidez:** Es un escalar que indica solo qué tan rápido te mueves (ej. $60\\text{ km/h}$). El velocímetro de tu carro mide rapidez.\n• **Velocidad:** Es un vector que indica qué tan rápido te mueves Y hacia qué dirección vas (ej. $60\\text{ km/h}$ al Norte).',
      },
    ],
    resumen: [
      'La rapidez indica la magnitud de la velocidad (escalar sin dirección).',
      'La velocidad es un vector que incluye magnitud, dirección y sentido.',
      'En curvas, la velocidad cambia aunque la rapidez del velocímetro se mantenga constante.',
    ],
  },
}

export const TEMAS_REGISTRY: Record<string, TemaConfig> = {
  'mru': mruData,
  'movimiento-rectilineo-uniforme': mruData,
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
