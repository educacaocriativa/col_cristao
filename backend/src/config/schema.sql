-- ============================================================
-- PLATAFORMA COLÉGIO CRISTÃO - Schema do Banco de Dados
-- Nomenclatura: Expedição Espacial
-- ============================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- busca por texto

-- ============================================================
-- ESCOLAS (Bases Orbitais)
-- ============================================================
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  zip_code VARCHAR(10),
  manager_name VARCHAR(255) NOT NULL,
  manager_whatsapp VARCHAR(20) NOT NULL,
  manager_email VARCHAR(255) NOT NULL UNIQUE,
  manager_cpf VARCHAR(14) NOT NULL UNIQUE,
  active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ, -- soft delete
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USUÁRIOS
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin','admin','pedagogico','professor','aluno','pais')),
  cpf VARCHAR(14),
  whatsapp VARCHAR(20),
  profile_code VARCHAR(20) UNIQUE, -- código gerado automaticamente (ADM25001, PRO25001, etc)
  active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ, -- soft delete
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_school ON users(school_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_profile_code ON users(profile_code);

-- ============================================================
-- PERFIL DO ESTUDANTE (Cosmonautas) - dados completos
-- ============================================================
CREATE TABLE student_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id),
  full_name VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) UNIQUE,
  rg VARCHAR(20),
  birth_date DATE,
  -- Endereço
  address TEXT,
  address_number VARCHAR(20),
  address_complement VARCHAR(100),
  neighborhood VARCHAR(100),
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  -- Matrículas
  internal_enrollment VARCHAR(50),   -- Nº interno de matrícula
  sere_enrollment VARCHAR(50),       -- Nº matrícula SERE
  -- Família
  mother_name VARCHAR(255),
  mother_email VARCHAR(255),
  mother_whatsapp VARCHAR(20),
  father_name VARCHAR(255),
  father_email VARCHAR(255),
  father_whatsapp VARCHAR(20),
  -- Contato do estudante
  student_email VARCHAR(255),
  student_whatsapp VARCHAR(20),
  -- Status
  active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ANO LETIVO
-- ============================================================
CREATE TABLE academic_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id),
  year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEGMENTOS / ANOS ESCOLARES
-- ============================================================
CREATE TABLE grade_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,      -- Ex: "4º Ano", "1ª Série EM"
  order_index INTEGER NOT NULL,    -- Para ordenação
  segment VARCHAR(50) NOT NULL,
  max_alternatives INTEGER NOT NULL DEFAULT 4 -- 4 para fund., 5 para EM
);

-- Inserir anos escolares padrão
INSERT INTO grade_levels (name, order_index, segment, max_alternatives) VALUES
('1º Ano', 1, 'fundamental_i', 4),
('2º Ano', 2, 'fundamental_i', 4),
('3º Ano', 3, 'fundamental_i', 4),
('4º Ano', 4, 'fundamental_i', 4),
('5º Ano', 5, 'fundamental_i', 4),
('6º Ano', 6, 'fundamental_ii', 4),
('7º Ano', 7, 'fundamental_ii', 4),
('8º Ano', 8, 'fundamental_ii', 4),
('9º Ano', 9, 'fundamental_ii', 4),
('1ª Série', 10, 'medio', 5),
('2ª Série', 11, 'medio', 5),
('3ª Série', 12, 'medio', 5);

-- ============================================================
-- TURMAS (Módulos)
-- ============================================================
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  grade_level_id UUID NOT NULL REFERENCES grade_levels(id),
  name VARCHAR(100) NOT NULL,      -- Ex: "Cativante", "Destemido"
  full_name VARCHAR(200),          -- Ex: "4º Ano | Cativante" (gerado)
  shift VARCHAR(20) CHECK (shift IN ('manha','tarde','noturno','integral')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_classes_school ON classes(school_id);

-- ============================================================
-- DISCIPLINAS (Missões)
-- ============================================================
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id),
  name VARCHAR(150) NOT NULL,      -- Ex: "Matemática", "Língua Portuguesa"
  code VARCHAR(20),
  color VARCHAR(7),                -- Cor hex para identificação visual
  icon VARCHAR(50),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROFESSORES POR TURMA E DISCIPLINA (Pilotos)
-- ============================================================
CREATE TABLE class_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  teacher_id UUID REFERENCES users(id),
  schedule JSONB,  -- { "monday": "08:00-09:00", "wednesday": "08:00-09:00" }
  workload_hours INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, subject_id, teacher_id)
);

-- ============================================================
-- ESTUDANTES POR TURMA
-- ============================================================
CREATE TABLE class_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id),
  student_id UUID NOT NULL REFERENCES users(id),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT true,
  UNIQUE(class_id, student_id)
);

-- ============================================================
-- PEDAGÓGICO POR TURMA
-- ============================================================
CREATE TABLE class_pedagogico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id),
  pedagogico_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, pedagogico_id)
);

-- ============================================================
-- HABILIDADES BNCC
-- ============================================================
CREATE TABLE bncc_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) NOT NULL,       -- Ex: EF04MA01
  description TEXT NOT NULL,
  subject_area VARCHAR(100),
  grade_level VARCHAR(50),
  component VARCHAR(150),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bncc_code ON bncc_skills(code);
CREATE INDEX idx_bncc_subject ON bncc_skills(subject_area);

-- ============================================================
-- BANCO DE QUESTÕES (Biblioteca Galáctica)
-- ============================================================
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),  -- NULL = questão compartilhada em rede
  creator_id UUID NOT NULL REFERENCES users(id),
  subject_id UUID REFERENCES subjects(id),
  grade_level_id UUID REFERENCES grade_levels(id),
  bncc_skill_id UUID REFERENCES bncc_skills(id),
  -- Metadados
  question_type VARCHAR(30) NOT NULL CHECK (question_type IN (
    'multipla_escolha','verdadeiro_falso','ligar','arrastar','selecionar_imagem'
  )),
  difficulty VARCHAR(10) DEFAULT 'medio' CHECK (difficulty IN ('facil','medio','dificil')),
  difficulty_dynamic FLOAT DEFAULT 0.5,  -- Calculado pelo TRI (0=fácil, 1=difícil)
  bloom_level VARCHAR(30),               -- remembering, understanding, applying, analyzing, evaluating, creating
  -- Conteúdo
  context TEXT,                          -- Texto/enunciado base (contextualização)
  command TEXT NOT NULL,                 -- Comando da questão
  media_urls JSONB DEFAULT '[]',         -- [ { type: "image", url: "..." } ]
  -- TRI params
  tri_difficulty FLOAT,                  -- Parâmetro b (dificuldade)
  tri_discrimination FLOAT,             -- Parâmetro a (discriminação)
  tri_guessing FLOAT,                    -- Parâmetro c (chute)
  times_applied INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  is_shared BOOLEAN DEFAULT false,       -- Compartilhada com toda a rede
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_questions_subject ON questions(subject_id);
CREATE INDEX idx_questions_grade ON questions(grade_level_id);
CREATE INDEX idx_questions_bncc ON questions(bncc_skill_id);

-- ============================================================
-- ALTERNATIVAS DAS QUESTÕES
-- ============================================================
CREATE TABLE question_alternatives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  label CHAR(1) NOT NULL,       -- A, B, C, D, E
  text TEXT,
  media_url TEXT,
  is_correct BOOLEAN DEFAULT false,
  partial_score FLOAT DEFAULT 0, -- 0, 0.25, 0.5, 0.75, 1.0
  explanation TEXT,              -- Explicação do erro/acerto
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ATIVIDADES / PROVAS (Expedições)
-- ============================================================
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id),
  class_id UUID REFERENCES classes(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  creator_id UUID NOT NULL REFERENCES users(id),  -- Prof ou Pedagógico
  grade_level_id UUID REFERENCES grade_levels(id),
  -- Identificação
  title VARCHAR(255) NOT NULL,
  description TEXT,
  activity_type VARCHAR(30) NOT NULL CHECK (activity_type IN (
    'atividade','prova','simulado','tarefa','leitura'
  )),
  -- Bimestre
  bimester INTEGER CHECK (bimester BETWEEN 1 AND 4),
  academic_year_id UUID REFERENCES academic_years(id),
  -- Configuração
  max_score FLOAT DEFAULT 100,
  weight FLOAT DEFAULT 1.0,
  time_limit_minutes INTEGER,     -- NULL = sem limite
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  -- Flags
  use_tri BOOLEAN DEFAULT true,
  randomize_questions BOOLEAN DEFAULT false,
  show_feedback_immediately BOOLEAN DEFAULT false,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_class ON activities(class_id);
CREATE INDEX idx_activities_subject ON activities(subject_id);

-- ============================================================
-- QUESTÕES POR ATIVIDADE
-- ============================================================
CREATE TABLE activity_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),
  order_index INTEGER NOT NULL,
  score FLOAT DEFAULT 1.0,
  UNIQUE(activity_id, question_id)
);

-- ============================================================
-- RESPOSTAS DOS ESTUDANTES
-- ============================================================
CREATE TABLE student_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID NOT NULL REFERENCES activities(id),
  student_id UUID NOT NULL REFERENCES users(id),
  question_id UUID NOT NULL REFERENCES questions(id),
  alternative_id UUID REFERENCES question_alternatives(id),
  text_response TEXT,
  is_correct BOOLEAN,
  raw_score FLOAT,
  tri_adjusted_score FLOAT,       -- Nota após ajuste TRI
  response_time_seconds INTEGER,
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id, student_id, question_id)
);

-- ============================================================
-- RESULTADOS DE ATIVIDADE (sumário por estudante)
-- ============================================================
CREATE TABLE activity_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID NOT NULL REFERENCES activities(id),
  student_id UUID NOT NULL REFERENCES users(id),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  raw_score FLOAT,
  final_score FLOAT,              -- Após TRI
  tri_theta FLOAT,                -- Habilidade estimada pelo TRI
  attempt_number INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','late')),
  UNIQUE(activity_id, student_id)
);

-- ============================================================
-- NOTAS BIMESTRAIS
-- ============================================================
CREATE TABLE grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  bimester INTEGER NOT NULL CHECK (bimester BETWEEN 1 AND 4),
  score FLOAT CHECK (score BETWEEN 0 AND 100),
  recovery_score FLOAT CHECK (recovery_score BETWEEN 0 AND 100),
  final_score FLOAT,              -- Calculado
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, class_id, subject_id, academic_year_id, bimester)
);

-- ============================================================
-- CHAMADA (Attendance)
-- ============================================================
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  teacher_id UUID NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attendance_id UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(10) NOT NULL CHECK (status IN ('presente','falta','justificada')),
  note TEXT,
  UNIQUE(attendance_id, student_id)
);

-- ============================================================
-- DIÁRIO PEDAGÓGICO
-- ============================================================
CREATE TABLE pedagogical_diary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES users(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  date DATE NOT NULL,
  content TEXT NOT NULL,
  objectives TEXT,
  methodology TEXT,
  resources TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CALENDÁRIO ESCOLAR (Mapa de Rota)
-- ============================================================
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id),
  class_id UUID REFERENCES classes(id),         -- NULL = evento da escola toda
  creator_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(30) CHECK (event_type IN (
    'aula','feriado','evento','prova','atividade','reuniao','recesso','outro'
  )),
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,
  color VARCHAR(7),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COMUNICADOS
-- ============================================================
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id),
  class_id UUID REFERENCES classes(id),         -- NULL = para toda escola
  creator_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  attachment_urls JSONB DEFAULT '[]',
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('normal','urgente','informativo')),
  published BOOLEAN DEFAULT true,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REDE SOCIAL (Canal de Comunicação)
-- ============================================================
CREATE TABLE social_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id),
  author_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  media_urls JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','blacklisted')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE social_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blacklist da rede social
CREATE TABLE social_blacklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  class_id UUID REFERENCES classes(id),
  reason TEXT,
  blocked_by UUID NOT NULL REFERENCES users(id),
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT true
);

-- ============================================================
-- MATERIAIS (Videoaulas / PDFs)
-- ============================================================
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id),
  class_id UUID REFERENCES classes(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  creator_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  material_type VARCHAR(20) CHECK (material_type IN ('video','pdf','link','imagem','audio')),
  -- Para vídeos Vimeo
  vimeo_id VARCHAR(50),
  vimeo_url TEXT,
  -- Para outros arquivos
  file_url TEXT,
  s3_key TEXT,
  file_size_bytes BIGINT,
  -- Organização
  grade_level_id UUID REFERENCES grade_levels(id),
  bimester INTEGER CHECK (bimester BETWEEN 1 AND 4),
  published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_materials_subject ON materials(subject_id);
CREATE INDEX idx_materials_class ON materials(class_id);

-- ============================================================
-- NOTIFICAÇÕES
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(30),   -- 'atividade', 'nota', 'comunicado', 'chamada', 'social'
  reference_id UUID,  -- ID da entidade relacionada
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read);

-- ============================================================
-- ANÁLISE DE DESEMPENHO (IA)
-- ============================================================
CREATE TABLE ai_performance_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  subject_id UUID REFERENCES subjects(id),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  bimester INTEGER,
  report_data JSONB NOT NULL,     -- Dados completos do relatório IA
  recommendations JSONB,          -- Recomendações personalizadas
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS para updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_schools_updated BEFORE UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_student_profiles_updated BEFORE UPDATE ON student_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_questions_updated BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_activities_updated BEFORE UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_grades_updated BEFORE UPDATE ON grades FOR EACH ROW EXECUTE FUNCTION update_updated_at();
