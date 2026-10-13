/* =====================================================================
   FísicaLab · Esquema de base de datos
   Motor        : PostgreSQL 13+
   Descripción  : Contenido educativo (temas, teoría, fórmulas, glosario
                  y ejercicios) administrado por usuarios con rol admin.
   Ejecución    : psql -U postgres -d fisicalab -f fisicalab_schema.sql
   ===================================================================== */

BEGIN;

/* ---------------------------------------------------------------------
   0. LIMPIEZA (descomentar solo para reiniciar el esquema en desarrollo)
   --------------------------------------------------------------------- */
DROP VIEW  IF EXISTS vw_temas_resumen;
DROP TABLE IF EXISTS ejercicios, glosario, formulas, teoria, temas, area, usuario CASCADE;
DROP FUNCTION IF EXISTS fn_set_fecha_actualizacion();

/* ---------------------------------------------------------------------
   1. FUNCIÓN AUXILIAR: actualiza fecha_actualizacion en cada UPDATE
   --------------------------------------------------------------------- */
CREATE OR REPLACE FUNCTION fn_set_fecha_actualizacion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.fecha_actualizacion := NOW();
    RETURN NEW;
END;
$$;

/* ---------------------------------------------------------------------
   2. TABLA: usuario
   --------------------------------------------------------------------- */
CREATE TABLE usuario (
    id_usuario           INTEGER GENERATED ALWAYS AS IDENTITY,
    nombre               VARCHAR(100) NOT NULL,
    correo               VARCHAR(150) NOT NULL,
    password_hash        VARCHAR(255) NOT NULL,
    rol                  VARCHAR(20)  NOT NULL DEFAULT 'estudiante',
    fecha_registro       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    fecha_actualizacion  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_usuario        PRIMARY KEY (id_usuario),
    CONSTRAINT ck_usuario_rol    CHECK (rol IN ('admin', 'estudiante')),
    CONSTRAINT ck_usuario_correo CHECK (correo ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

-- Correo único sin distinguir mayúsculas/minúsculas
CREATE UNIQUE INDEX ux_usuario_correo ON usuario (LOWER(correo));

COMMENT ON TABLE  usuario               IS 'Cuentas de acceso a la plataforma.';
COMMENT ON COLUMN usuario.password_hash IS 'Hash bcrypt/argon2. Nunca almacenar la contraseña en texto plano.';
COMMENT ON COLUMN usuario.rol           IS 'admin: gestiona contenido. estudiante: solo consulta.';

/* ---------------------------------------------------------------------
   3. TABLA: area
   --------------------------------------------------------------------- */
CREATE TABLE area (
    id_area              INTEGER GENERATED ALWAYS AS IDENTITY,
    nombre               VARCHAR(120) NOT NULL,
    slug                 VARCHAR(120) NOT NULL,
    descripcion          TEXT,
    fecha_creacion       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    fecha_actualizacion  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_area      PRIMARY KEY (id_area),
    CONSTRAINT uq_area_slug UNIQUE (slug),
    CONSTRAINT ck_area_slug CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

COMMENT ON TABLE  area      IS 'Agrupación de temas (ej. Mecánica Clásica & Cinemática).';
COMMENT ON COLUMN area.slug IS 'Identificador legible para URLs, en minúsculas y con guiones.';

/* ---------------------------------------------------------------------
   4. TABLA: temas
   --------------------------------------------------------------------- */
CREATE TABLE temas (
    id_tema              INTEGER GENERATED ALWAYS AS IDENTITY,
    id_area              INTEGER      NOT NULL,
    slug                 VARCHAR(120) NOT NULL,
    titulo               VARCHAR(150) NOT NULL,
    descripcion          TEXT,
    nivel                VARCHAR(20)  NOT NULL DEFAULT 'basico',
    estado               VARCHAR(20)  NOT NULL DEFAULT 'borrador',
    fecha_creacion       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    fecha_actualizacion  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_temas        PRIMARY KEY (id_tema),
    CONSTRAINT uq_temas_slug   UNIQUE (slug),
    CONSTRAINT fk_temas_area   FOREIGN KEY (id_area)
        REFERENCES area (id_area) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_temas_slug   CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT ck_temas_nivel  CHECK (nivel  IN ('basico', 'intermedio')),
    CONSTRAINT ck_temas_estado CHECK (estado IN ('borrador', 'publicado', 'proximamente', 'archivado'))
);

CREATE INDEX ix_temas_id_area ON temas (id_area);
CREATE INDEX ix_temas_estado  ON temas (estado);

COMMENT ON TABLE  temas      IS 'Temas de estudio; cada uno agrupa teoría, fórmulas, glosario y ejercicios.';
COMMENT ON COLUMN temas.slug IS 'Se usa en la ruta de la app, ej. /tema/alcances-mru.';

/* ---------------------------------------------------------------------
   5. TABLA: teoria
   --------------------------------------------------------------------- */
CREATE TABLE teoria (
    id_teoria            INTEGER GENERATED ALWAYS AS IDENTITY,
    id_tema              INTEGER      NOT NULL,
    titulo               VARCHAR(150) NOT NULL,
    tipo                 VARCHAR(30)  NOT NULL DEFAULT 'concepto',
    contenido            TEXT         NOT NULL,
    orden                SMALLINT     NOT NULL DEFAULT 0,
    estado               VARCHAR(20)  NOT NULL DEFAULT 'borrador',
    fecha_creacion       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    fecha_actualizacion  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_teoria        PRIMARY KEY (id_teoria),
    CONSTRAINT fk_teoria_tema   FOREIGN KEY (id_tema)
        REFERENCES temas (id_tema) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_teoria_tipo   CHECK (tipo IN ('concepto', 'ideas_clave', 'ejemplo',
                                                'errores_comunes', 'resumen')),
    CONSTRAINT ck_teoria_estado CHECK (estado IN ('borrador', 'publicado', 'archivado'))
);

CREATE INDEX ix_teoria_tema_orden ON teoria (id_tema, orden);
CREATE INDEX ix_teoria_estado     ON teoria (estado);

COMMENT ON COLUMN teoria.contenido IS 'Texto en Markdown (admite LaTeX en línea).';
COMMENT ON COLUMN teoria.orden     IS 'Posición de la sección dentro del tema.';

/* ---------------------------------------------------------------------
   6. TABLA: formulas
   --------------------------------------------------------------------- */
CREATE TABLE formulas (
    id_formula           INTEGER GENERATED ALWAYS AS IDENTITY,
    id_tema              INTEGER      NOT NULL,
    titulo               VARCHAR(150) NOT NULL,
    expresion_latex      TEXT         NOT NULL,
    descripcion          TEXT,
    variables            JSONB        NOT NULL DEFAULT '[]'::jsonb,
    enunciado_ejem       TEXT,
    desarrollo_ejem      TEXT,
    resultado_ejem       TEXT,
    orden                SMALLINT     NOT NULL DEFAULT 0,
    estado               VARCHAR(20)  NOT NULL DEFAULT 'borrador',
    fecha_creacion       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    fecha_actualizacion  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_formulas            PRIMARY KEY (id_formula),
    CONSTRAINT fk_formulas_tema       FOREIGN KEY (id_tema)
        REFERENCES temas (id_tema) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_formulas_variables  CHECK (jsonb_typeof(variables) = 'array'),
    CONSTRAINT ck_formulas_estado     CHECK (estado IN ('borrador', 'publicado', 'archivado'))
);

CREATE INDEX ix_formulas_tema_orden ON formulas (id_tema, orden);
CREATE INDEX ix_formulas_estado     ON formulas (estado);

COMMENT ON COLUMN formulas.expresion_latex IS 'Expresión en LaTeX generada desde el editor visual del panel admin.';
COMMENT ON COLUMN formulas.variables       IS 'Arreglo JSON: [{"simbolo":"v","descripcion":"Velocidad","unidad":"m/s"}].';

/* ---------------------------------------------------------------------
   7. TABLA: glosario
   --------------------------------------------------------------------- */
CREATE TABLE glosario (
    id_glosario          INTEGER GENERATED ALWAYS AS IDENTITY,
    id_tema              INTEGER      NOT NULL,
    termino              VARCHAR(100) NOT NULL,
    definicion           TEXT         NOT NULL,
    estado               VARCHAR(20)  NOT NULL DEFAULT 'borrador',
    fecha_creacion       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    fecha_actualizacion  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_glosario          PRIMARY KEY (id_glosario),
    CONSTRAINT fk_glosario_tema     FOREIGN KEY (id_tema)
        REFERENCES temas (id_tema) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_glosario_estado   CHECK (estado IN ('borrador', 'publicado', 'archivado'))
);

-- Un término no puede repetirse dentro del mismo tema
CREATE UNIQUE INDEX ux_glosario_tema_termino ON glosario (id_tema, LOWER(termino));
CREATE INDEX        ix_glosario_estado       ON glosario (estado);

/* ---------------------------------------------------------------------
   8. TABLA: ejercicios
   --------------------------------------------------------------------- */
CREATE TABLE ejercicios (
    id_ejercicio         INTEGER GENERATED ALWAYS AS IDENTITY,
    id_tema              INTEGER      NOT NULL,
    titulo               VARCHAR(150) NOT NULL,
    enunciado            TEXT         NOT NULL,
    foto_ejemplo         VARCHAR(500),
    dificultad           VARCHAR(20)  NOT NULL DEFAULT 'basico',
    respuesta            VARCHAR(255),
    orden                SMALLINT     NOT NULL DEFAULT 0,
    estado               VARCHAR(20)  NOT NULL DEFAULT 'borrador',
    fecha_creacion       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    fecha_actualizacion  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_ejercicios            PRIMARY KEY (id_ejercicio),
    CONSTRAINT fk_ejercicios_tema       FOREIGN KEY (id_tema)
        REFERENCES temas (id_tema) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_ejercicios_dificultad CHECK (dificultad IN ('basico', 'intermedio', 'avanzado')),
    CONSTRAINT ck_ejercicios_estado     CHECK (estado IN ('borrador', 'publicado', 'archivado'))
);

CREATE INDEX ix_ejercicios_tema_orden ON ejercicios (id_tema, orden);
CREATE INDEX ix_ejercicios_estado     ON ejercicios (estado);

COMMENT ON COLUMN ejercicios.foto_ejemplo IS 'Ruta o URL de la imagen del ejercicio.';
COMMENT ON COLUMN ejercicios.respuesta    IS 'Respuesta final para verificación, ej. "t = 10 s; x = 200 m".';

/* ---------------------------------------------------------------------
   9. TRIGGERS: fecha_actualizacion automática
   --------------------------------------------------------------------- */
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['usuario', 'area', 'temas', 'teoria',
                             'formulas', 'glosario', 'ejercicios']
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%1$s_fecha_actualizacion
                 BEFORE UPDATE ON %1$I
                 FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_actualizacion()', t);
    END LOOP;
END;
$$;

/* ---------------------------------------------------------------------
   10. VISTA: resumen de contenido por tema (útil para el dashboard admin)
   --------------------------------------------------------------------- */
CREATE OR REPLACE VIEW vw_temas_resumen AS
SELECT  t.id_tema,
        t.titulo,
        t.slug,
        a.nombre AS area,
        t.nivel,
        t.estado,
        (SELECT COUNT(*) FROM teoria     x WHERE x.id_tema = t.id_tema) AS total_teoria,
        (SELECT COUNT(*) FROM formulas   x WHERE x.id_tema = t.id_tema) AS total_formulas,
        (SELECT COUNT(*) FROM glosario   x WHERE x.id_tema = t.id_tema) AS total_glosario,
        (SELECT COUNT(*) FROM ejercicios x WHERE x.id_tema = t.id_tema) AS total_ejercicios
FROM    temas t
JOIN    area  a ON a.id_area = t.id_area;

