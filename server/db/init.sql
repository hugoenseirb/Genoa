-- Extension pour gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Fonction trigger pour updated_at automatique
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Table users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  username VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'reader' CHECK (role IN ('admin', 'editor', 'reader')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table members
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'unknown')),
  birth_date DATE,
  birth_place VARCHAR(255),
  death_date DATE,
  death_place VARCHAR(255),
  photo_url VARCHAR(500),
  is_private BOOLEAN NOT NULL DEFAULT false,
  notes_public TEXT,
  notes_private TEXT,
  contacts JSONB,
  professions JSONB,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index sur email pour les lookups de connexion
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Trigger updated_at sur users
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_members_name ON members (last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_members_birth ON members (birth_date);
CREATE INDEX IF NOT EXISTS idx_members_created_by ON members (created_by);

-- Trigger updated_at sur members
CREATE TRIGGER members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Table relations
CREATE TABLE IF NOT EXISTS relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(30) NOT NULL CHECK (type IN ('couple', 'parent_child')),
  -- couple: member_a + member_b = les deux partenaires
  -- parent_child: member_a = parent, member_b = enfant
  member_a_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  member_b_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  union_date DATE,
  separation_date DATE,
  union_type VARCHAR(30) CHECK (union_type IN ('marriage', 'partnership', 'other')),
  filiation_type VARCHAR(30) CHECK (filiation_type IN ('biological', 'adopted', 'unknown')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_relation CHECK (member_a_id != member_b_id)
);

CREATE INDEX IF NOT EXISTS idx_relations_member_a ON relations (member_a_id);
CREATE INDEX IF NOT EXISTS idx_relations_member_b ON relations (member_b_id);
CREATE INDEX IF NOT EXISTS idx_relations_type ON relations (type);
