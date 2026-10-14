CREATE TABLE IF NOT EXISTS fisicalab.ejercicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tema_slug text NOT NULL REFERENCES fisicalab.temas(slug) ON DELETE CASCADE,
  titulo text NOT NULL,
  enunciado text NOT NULL,
  dificultad text NOT NULL CHECK (dificultad IN ('basico', 'intermedio', 'avanzado')),
  respuesta text NOT NULL,
  solucion_detallada text,
  parametros jsonb NOT NULL DEFAULT '{}'::jsonb,
  pistas text,
  estado text NOT NULL DEFAULT 'published' CHECK (estado IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ejercicios_tema_slug ON fisicalab.ejercicios(tema_slug);
ALTER TABLE fisicalab.ejercicios ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fisicalab.ejercicios FROM PUBLIC;

