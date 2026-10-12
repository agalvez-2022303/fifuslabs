-- Application data is private: accessed only by the backend's PostgreSQL role.
-- Supabase manages auth.users, password hashes and sessions. Never store passwords here.
CREATE TABLE fisicalab.categories (
  id text PRIMARY KEY,
  document jsonb NOT NULL CHECK (jsonb_typeof(document) = 'object' AND document->>'id' = id)
);

CREATE TABLE fisicalab.temas (
  slug text PRIMARY KEY,
  tema_id text UNIQUE NOT NULL,
  categoria_id text NOT NULL REFERENCES fisicalab.categories(id),
  status text NOT NULL CHECK (status IN ('draft', 'published')),
  version integer NOT NULL CHECK (version > 0),
  updated_at timestamptz NOT NULL,
  deleted boolean NOT NULL DEFAULT false,
  document jsonb NOT NULL,
  CHECK (jsonb_typeof(document) = 'object'),
  CHECK (document->>'slug' = slug AND document->>'id' = tema_id),
  CHECK (document->>'categoriaId' = categoria_id AND document->>'status' = status),
  CHECK ((document->>'version')::integer = version)
);
CREATE INDEX temas_publication_category ON fisicalab.temas(status, categoria_id) WHERE NOT deleted;

CREATE TABLE fisicalab.revisions (
  id uuid PRIMARY KEY,
  sequence bigserial UNIQUE NOT NULL,
  slug text NOT NULL REFERENCES fisicalab.temas(slug),
  editor text NOT NULL,
  fecha timestamptz NOT NULL,
  operation text NOT NULL,
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object' AND snapshot->>'slug' = slug)
);
CREATE INDEX revisions_theme_sequence ON fisicalab.revisions(slug, sequence DESC);

CREATE TABLE fisicalab.aliases (
  alias text PRIMARY KEY,
  slug text NOT NULL REFERENCES fisicalab.temas(slug),
  CHECK (alias <> slug)
);
CREATE TABLE fisicalab.simulations (
  slug text PRIMARY KEY,
  document jsonb NOT NULL CHECK (document->>'slug' = slug)
);

CREATE TABLE fisicalab.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  name varchar(150) NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
  active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX profiles_role_active ON fisicalab.profiles(role, active);

-- Auth metadata is user-controlled: NEVER copy its role into application permissions.
CREATE FUNCTION fisicalab.handle_auth_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO fisicalab.profiles(id, email) VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = now(),
    version = fisicalab.profiles.version + 1;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fisicalab_auth_user_created
AFTER INSERT OR UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION fisicalab.handle_auth_user();

-- Backfill accounts that were created before the application migration.
INSERT INTO fisicalab.profiles(id, email) SELECT id, email FROM auth.users ON CONFLICT (id) DO NOTHING;

-- Defense in depth: no direct browser access, even if this schema is exposed later.
ALTER TABLE fisicalab.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE fisicalab.temas ENABLE ROW LEVEL SECURITY;
ALTER TABLE fisicalab.revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fisicalab.aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE fisicalab.simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fisicalab.profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA fisicalab FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA fisicalab FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA fisicalab FROM PUBLIC;
REVOKE ALL ON FUNCTION fisicalab.handle_auth_user() FROM PUBLIC;
