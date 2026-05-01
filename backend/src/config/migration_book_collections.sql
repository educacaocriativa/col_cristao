-- ============================================================
-- LIVROS PRINCIPAIS
-- Agrupador de PDFs por unidade/ano/perfil.
-- Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS book_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(150),
  for_aluno BOOLEAN DEFAULT false,
  for_professor BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_book_collections_deleted_at ON book_collections(deleted_at);

ALTER TABLE books
  ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES book_collections(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_books_collection_id ON books(collection_id);

-- Migra livros antigos para o novo modelo: cada PDF antigo vira um livro principal.
WITH inserted AS (
  INSERT INTO book_collections (name, subject, for_aluno, for_professor, created_by, deleted_at, created_at, updated_at)
  SELECT b.name, b.subject, b.for_aluno, b.for_professor, b.created_by, b.deleted_at, b.created_at, b.updated_at
    FROM books b
   WHERE b.collection_id IS NULL
     AND NOT EXISTS (
       SELECT 1 FROM book_collections bc
        WHERE bc.name = b.name
          AND COALESCE(bc.subject, '') = COALESCE(b.subject, '')
          AND bc.created_at = b.created_at
     )
  RETURNING id, name, subject, created_at
)
UPDATE books b
   SET collection_id = i.id
  FROM inserted i
 WHERE b.collection_id IS NULL
   AND b.name = i.name
   AND COALESCE(b.subject, '') = COALESCE(i.subject, '')
   AND b.created_at = i.created_at;

