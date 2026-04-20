-- Migration: torna users.email opcional (NULL permitido).
-- Idempotente: pode ser rodado múltiplas vezes sem erro.

ALTER TABLE users
  ALTER COLUMN email DROP NOT NULL;
