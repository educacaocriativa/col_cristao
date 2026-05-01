-- Adiciona coluna subject (disciplina) à tabela books.
-- Idempotente.

ALTER TABLE books
  ADD COLUMN IF NOT EXISTS subject VARCHAR(150);
