-- ============================================================
-- LIVROS — biblioteca de PDFs por unidade/ano/perfil
-- Idempotente: pode ser rodado múltiplas vezes sem erro.
-- ============================================================

CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,           -- caminho relativo ao diretório de uploads
  file_size BIGINT,                  -- bytes
  mime_type VARCHAR(100),
  for_aluno BOOLEAN DEFAULT false,
  for_professor BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_books_deleted_at ON books(deleted_at);

-- Vínculo livro × unidade (M:N) — um livro pode estar em várias unidades
CREATE TABLE IF NOT EXISTS book_schools (
  book_id   UUID NOT NULL REFERENCES books(id)   ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, school_id)
);

CREATE INDEX IF NOT EXISTS idx_book_schools_school ON book_schools(school_id);

-- Vínculo livro × ano escolar (M:N) — um livro pode atender vários anos
CREATE TABLE IF NOT EXISTS book_grade_levels (
  book_id        UUID NOT NULL REFERENCES books(id)        ON DELETE CASCADE,
  grade_level_id UUID NOT NULL REFERENCES grade_levels(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, grade_level_id)
);

CREATE INDEX IF NOT EXISTS idx_book_grade_levels_grade ON book_grade_levels(grade_level_id);
