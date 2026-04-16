-- Migration: adiciona colunas que o código usa mas estavam faltando em
-- bancos já inicializados com a versão antiga do schema.
-- Idempotente: pode ser rodado múltiplas vezes sem erro.

-- 1. users.profile_code (código gerado: ADM25001, PRO25001, etc)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS profile_code VARCHAR(20);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_profile_code_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_profile_code_key UNIQUE (profile_code);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_profile_code ON users(profile_code);

-- 2. schools.deleted_at (soft delete / lixeira de unidades)
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_schools_deleted_at ON schools(deleted_at);
