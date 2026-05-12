CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TABLE IF NOT EXISTS exam_pdfs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255),
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_pdfs_name_trgm ON exam_pdfs USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_exam_pdfs_deleted_at ON exam_pdfs(deleted_at);

DROP TRIGGER IF EXISTS trigger_exam_pdfs_updated ON exam_pdfs;
CREATE TRIGGER trigger_exam_pdfs_updated BEFORE UPDATE ON exam_pdfs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
