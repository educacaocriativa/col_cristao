// ──────────────────────────────────────────────────────────────
// Mock API responses for demo sessions.
// Intercepted in api.ts when `isDemoSession()` is true.
// Reuses existing demo data from dashboard/_components/*.
// ──────────────────────────────────────────────────────────────

import {
  MOCK_SUBJECTS,
  MOCK_ACTIVITIES,
  MOCK_ANNOUNCEMENTS,
  MOCK_EVENTS,
} from "../dashboard/_components/mockData";
import {
  TEACHER_CLASSES,
  CLASS_GRADES,
  CLASS_STUDENTS,
  DIARY_ENTRIES,
} from "../dashboard/_components/teacherMockData";

// ── Escolas (super_admin) ────────────────────────────────────
const DEMO_SCHOOLS = [
  {
    id: "demo-school",
    name: "Unidade Centro",
    city: "Maringá",
    state: "PR",
    address: "Av. Colombo, 1234",
    zip_code: "87000-000",
    manager_name: "Roberto Alves",
    manager_email: "diretor@colegiocristao.edu.br",
    manager_whatsapp: "41999990000",
    active: true,
    created_at: "2025-02-10T10:00:00Z",
    student_count: 420,
    teacher_count: 28,
    admin_count: 1,
    admin_id: "demo-admin-id",
    admin_name: "Maria Santos",
    admin_email: "admin@colegiocristao.edu.br",
    admin_profile_code: "ADM25001",
    admin_cpf: "111.111.111-11",
  },
  {
    id: "demo-school-2",
    name: "Unidade Norte",
    city: "Sarandi",
    state: "PR",
    address: "Rua das Palmeiras, 500",
    zip_code: "87100-000",
    manager_name: "Patrícia Lima",
    manager_email: "patricia@colegiocristao.edu.br",
    manager_whatsapp: "41988880000",
    active: true,
    created_at: "2025-03-01T10:00:00Z",
    student_count: 310,
    teacher_count: 21,
    admin_count: 1,
    admin_id: "demo-admin-id-2",
    admin_name: "André Souza",
    admin_email: "andre@colegiocristao.edu.br",
    admin_profile_code: "ADM25002",
    admin_cpf: "222.222.222-22",
  },
  {
    id: "demo-school-3",
    name: "Unidade Oeste",
    city: "Paiçandu",
    state: "PR",
    address: "Rua Brasil, 88",
    zip_code: "87140-000",
    manager_name: "Fernanda Rocha",
    manager_email: "fernanda@colegiocristao.edu.br",
    manager_whatsapp: "41977770000",
    active: true,
    created_at: "2025-03-15T10:00:00Z",
    student_count: 275,
    teacher_count: 18,
    admin_count: 1,
    admin_id: "demo-admin-id-3",
    admin_name: "Júlio César",
    admin_email: "julio@colegiocristao.edu.br",
    admin_profile_code: "ADM25003",
    admin_cpf: "333.333.333-33",
  },
];

// ── Grade levels ─────────────────────────────────────────────
const DEMO_GRADE_LEVELS = [
  { id: "gl1", name: "1º Ano",    order_index: 1,  segment: "Fundamental I" },
  { id: "gl2", name: "2º Ano",    order_index: 2,  segment: "Fundamental I" },
  { id: "gl3", name: "3º Ano",    order_index: 3,  segment: "Fundamental I" },
  { id: "gl4", name: "4º Ano",    order_index: 4,  segment: "Fundamental I" },
  { id: "gl5", name: "5º Ano",    order_index: 5,  segment: "Fundamental I" },
  { id: "gl6", name: "6º Ano",    order_index: 6,  segment: "Fundamental II" },
  { id: "gl7", name: "7º Ano",    order_index: 7,  segment: "Fundamental II" },
  { id: "gl8", name: "8º Ano",    order_index: 8,  segment: "Fundamental II" },
  { id: "gl9", name: "9º Ano",    order_index: 9,  segment: "Fundamental II" },
];

// ── Turmas (reutiliza TEACHER_CLASSES) ───────────────────────
const DEMO_TURMAS = TEACHER_CLASSES.map((t) => ({
  id:             t.id,
  name:           t.className,
  grade_level_id: "gl4",
  grade_name:     t.gradeName,
  full_name:      t.name,
  shift:          "manha",
  year:           t.gradeName,
  student_count:  t.studentCount,
  subject_count:  3,
}));

// ── Alunos (flatten CLASS_STUDENTS) ──────────────────────────
const DEMO_ALUNOS = Object.entries(CLASS_STUDENTS).flatMap(([classId, students]) =>
  students.map((s) => {
    const turma = DEMO_TURMAS.find((t) => t.id === classId);
    return {
      id: s.id,
      name: s.name,
      email: `${s.name.toLowerCase().replace(/\s+/g, ".").normalize("NFD").replace(/[\u0300-\u036f]/g, "")}@aluno.colegiocristao.edu.br`,
      cpf: `000.000.000-${s.id.slice(-2).padStart(2, "0")}`,
      enrollment: s.enrollment,
      internal_enrollment: s.enrollment,
      sere_enrollment: "",
      classes: turma?.full_name ?? "",
      class_id: classId,
      active: true,
      profile_code: `ALU25${s.enrollment.slice(-3)}`,
    };
  })
);

// ── Professores (mock fixo) ──────────────────────────────────
const DEMO_PROFESSORES = [
  { id: "t1", name: "Roberto Silva",  email: "roberto@colegiocristao.edu.br",  cpf: "123.456.789-00", whatsapp: "41999990001", role: "professor", profile_code: "PRO25001", active: true },
  { id: "t2", name: "Mariana Costa",  email: "mariana@colegiocristao.edu.br",  cpf: "234.567.890-11", whatsapp: "41999990002", role: "professor", profile_code: "PRO25002", active: true },
  { id: "t3", name: "André Lima",     email: "andre.lima@colegiocristao.edu.br", cpf: "345.678.901-22", whatsapp: "41999990003", role: "professor", profile_code: "PRO25003", active: true },
  { id: "t4", name: "Carla Mendes",   email: "carla@colegiocristao.edu.br",    cpf: "456.789.012-33", whatsapp: "41999990004", role: "professor", profile_code: "PRO25004", active: true },
  { id: "t5", name: "Lucas Ferreira", email: "lucas@colegiocristao.edu.br",    cpf: "567.890.123-44", whatsapp: "41999990005", role: "professor", profile_code: "PRO25005", active: false },
];

// ── Pedagógicos ──────────────────────────────────────────────
const DEMO_PEDAGOGICOS = [
  { id: "p1", name: "Ana Paula Oliveira", email: "ana.paula@colegiocristao.edu.br", cpf: "987.654.321-00", whatsapp: "41999990010", role: "pedagogico", profile_code: "PED25001", active: true },
  { id: "p2", name: "Ricardo Barros",     email: "ricardo@colegiocristao.edu.br",   cpf: "876.543.210-11", whatsapp: "41999990011", role: "pedagogico", profile_code: "PED25002", active: true },
];

// ── BNCC ─────────────────────────────────────────────────────
const DEMO_BNCC = [
  { id: "b1", code: "EF04MA08", description: "Frações como parte de um todo",       discipline: "Matemática", segment: "Fundamental I", year: 4, coverage: 85 },
  { id: "b2", code: "EF04LP01", description: "Interpretação de textos narrativos",  discipline: "Português",  segment: "Fundamental I", year: 4, coverage: 72 },
  { id: "b3", code: "EF04CI01", description: "Fenômenos naturais e sua explicação", discipline: "Ciências",   segment: "Fundamental I", year: 4, coverage: 63 },
  { id: "b4", code: "EF04HI04", description: "Brasil Colonial e suas dinâmicas",    discipline: "História",   segment: "Fundamental I", year: 4, coverage: 90 },
  { id: "b5", code: "EF04GE02", description: "Elementos naturais e transformados",  discipline: "Geografia",  segment: "Fundamental I", year: 4, coverage: 78 },
];

// ── Subjects ─────────────────────────────────────────────────
const DEMO_SUBJECTS = MOCK_SUBJECTS.map((s, i) => ({
  id: `s${i + 1}`,
  name: s.name,
  icon: s.icon,
  color: s.color,
  active: true,
}));

// ── Coins / Gamification ─────────────────────────────────────
const DEMO_COINS_BALANCE = { balance: 750, total_earned: 1250, total_spent: 500 };
const DEMO_COINS_RANKING = CLASS_STUDENTS["t1"]?.slice(0, 10).map((s, i) => ({
  user_id: s.id,
  name: s.name,
  school_name: "Unidade Centro",
  coins: 900 - i * 60,
  position: i + 1,
})) ?? [];

// ── Loja ─────────────────────────────────────────────────────
const DEMO_LOJA = [
  { id: "l1", name: "Camiseta Cosmonauta",  description: "Camiseta oficial da plataforma",           price: 400, stock: 15, image_url: null, active: true },
  { id: "l2", name: "Ingresso Cinema",      description: "Ingresso para sessão no cinema da cidade", price: 800, stock: 6,  image_url: null, active: true },
  { id: "l3", name: "Livro ilustrado",      description: "Livro infantil de aventura",                price: 300, stock: 20, image_url: null, active: true },
];

// ── Social feed ──────────────────────────────────────────────
const DEMO_SOCIAL_POSTS = [
  {
    id: "sp1",
    content: "Parabéns à turma Cativante pela conquista no desafio de matemática! 🎉",
    status: "approved",
    likes_count: 14,
    created_at: "2025-04-10T14:30:00Z",
    author_id: "t1",
    author_name: "Roberto Silva",
    author_role: "professor",
    comments: [
      { id: "c1", content: "Arrasaram!!", author_name: "Alice Fernandes", created_at: "2025-04-10T15:00:00Z" },
    ],
  },
  {
    id: "sp2",
    content: "Hoje começamos o projeto de leitura compartilhada. Muito empolgante ver a turma engajada!",
    status: "approved",
    likes_count: 9,
    created_at: "2025-04-09T10:20:00Z",
    author_id: "t2",
    author_name: "Mariana Costa",
    author_role: "professor",
    comments: [],
  },
  {
    id: "sp3",
    content: "Feira de ciências confirmada para 20/04. Todas as turmas participarão!",
    status: "approved",
    likes_count: 22,
    created_at: "2025-04-08T08:00:00Z",
    author_id: "demo-admin-id",
    author_name: "Maria Santos",
    author_role: "admin",
    comments: [],
  },
];

// ── Comunicados ──────────────────────────────────────────────
const DEMO_COMUNICADOS = MOCK_ANNOUNCEMENTS.map((a, i) => ({
  id: `com${i + 1}`,
  title: a.title,
  content: a.content,
  priority: a.priority,
  author_id: "demo-admin-id",
  author_name: a.author,
  created_at: a.date,
  read: a.read,
}));

// ── Diário ───────────────────────────────────────────────────
const DEMO_DIARIO = DIARY_ENTRIES.map((d) => ({
  id:          d.id,
  class_id:    d.classId,
  date:        d.date,
  title:       d.content.slice(0, 60),
  content:     d.content,
  objectives:  d.objectives ?? "",
  methodology: d.methodology ?? "",
  resources:   d.resources ?? "",
  author_name: "Roberto Silva",
}));

// ── Calendário ───────────────────────────────────────────────
const DEMO_CALENDAR = MOCK_EVENTS.map((e) => ({
  id:        e.id,
  title:     e.title,
  date:      e.date,
  type:      e.type,
  color:     e.color,
  all_day:   true,
  class_id:  null,
}));

// ── Atividades ───────────────────────────────────────────────
const DEMO_ATIVIDADES = MOCK_ACTIVITIES.map((a) => ({
  id:         a.id,
  title:      a.title,
  subject:    a.subject,
  due_date:   a.dueDate,
  due_time:   a.dueTime ?? null,
  status:     a.status,
  type:       a.type,
  color:      a.subjectColor,
  class_id:   "t1",
  max_score:  a.maxScore,
  bimester:   a.bimester,
}));

const DEMO_PROVAS = [
  {
    id: "prova-demo-1",
    name: "Prova Diagnostica - Matematica",
    original_filename: "prova-diagnostica-matematica.pdf",
    file_size: 1843200,
    mime_type: "application/pdf",
    created_at: "2026-02-15T10:00:00Z",
    created_by_name: "Sistema Admin",
  },
  {
    id: "prova-demo-2",
    name: "Simulado 1 - Lingua Portuguesa",
    original_filename: "simulado-portugues.pdf",
    file_size: 2310144,
    mime_type: "application/pdf",
    created_at: "2026-03-02T10:00:00Z",
    created_by_name: "Sistema Admin",
  },
];

// ── Matcher de endpoints ─────────────────────────────────────
// Retorna o mock apropriado para o path, ou array/objeto vazio
// para endpoints não mapeados (evita quebrar a UI).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getDemoMockFor(path: string): any {
  const pathOnly = path.split("?")[0];

  // Auth
  if (pathOnly === "/api/auth/me") {
    return null; // quem chama usa getStoredUser() que já pega do localStorage
  }

  // Schools
  if (pathOnly === "/api/schools")          return DEMO_SCHOOLS;
  if (pathOnly === "/api/schools/deleted")  return [];
  if (pathOnly === "/api/schools/grade-levels") return DEMO_GRADE_LEVELS;

  // Turmas
  if (pathOnly === "/api/turmas")          return DEMO_TURMAS;
  if (/^\/api\/turmas\/[^/]+$/.test(pathOnly)) {
    const id = pathOnly.split("/")[3];
    return DEMO_TURMAS.find((t) => t.id === id) ?? DEMO_TURMAS[0];
  }
  if (/^\/api\/turmas\/[^/]+\/alunos$/.test(pathOnly)) {
    const id = pathOnly.split("/")[3];
    return CLASS_STUDENTS[id] ?? [];
  }
  if (/^\/api\/turmas\/[^/]+\/chamada/.test(pathOnly)) return { alunos: [], registros: [] };
  if (/^\/api\/turmas\/[^/]+\/notas/.test(pathOnly))   return CLASS_GRADES[pathOnly.split("/")[3]] ?? [];
  if (/^\/api\/turmas\/[^/]+\/grade-items/.test(pathOnly)) return [];
  if (/^\/api\/turmas\/[^/]+\/activities-for-grading/.test(pathOnly)) return [];

  // Alunos
  if (pathOnly === "/api/alunos")          return DEMO_ALUNOS;
  if (pathOnly === "/api/alunos/filho")    return DEMO_ALUNOS[0];
  if (/^\/api\/alunos\/[^/]+\/notas$/.test(pathOnly))      return DEMO_ALUNOS[0] ? CLASS_GRADES["t1"] ?? [] : [];
  if (/^\/api\/alunos\/[^/]+\/frequencia$/.test(pathOnly)) return [];
  if (/^\/api\/alunos\/[^/]+\/atividades$/.test(pathOnly)) return DEMO_ATIVIDADES;

  // Usuários
  if (pathOnly === "/api/usuarios") {
    return [...DEMO_PROFESSORES, ...DEMO_PEDAGOGICOS];
  }

  // Atividades
  if (pathOnly === "/api/atividades") return DEMO_ATIVIDADES;
  if (/^\/api\/atividades\/[^/]+$/.test(pathOnly)) {
    const id = pathOnly.split("/")[3];
    return DEMO_ATIVIDADES.find((a) => a.id === id) ?? DEMO_ATIVIDADES[0];
  }

  // Materiais
  if (pathOnly === "/api/materiais") return [];

  // Comunicados
  if (pathOnly === "/api/comunicados") return DEMO_COMUNICADOS;

  // Social
  if (pathOnly === "/api/social/posts") return DEMO_SOCIAL_POSTS;

  // Diário
  if (pathOnly === "/api/diario") return DEMO_DIARIO;

  // Calendário
  if (pathOnly === "/api/calendar") return DEMO_CALENDAR;

  // Schedule
  if (pathOnly === "/api/schedule" || pathOnly === "/api/schedule/week") {
    return { slots: [], academic_year_id: null };
  }
  if (pathOnly === "/api/schedule/frequencia") return [];

  // Relatórios
  if (pathOnly === "/api/relatorios/desempenho") return { byBimester: [], byClass: [], bySubject: [] };
  if (pathOnly === "/api/relatorios/bncc")       return { skills: DEMO_BNCC };
  if (pathOnly === "/api/relatorios/frequencia") return { absences: [] };

  // BNCC
  if (pathOnly === "/api/bncc")      return DEMO_BNCC;
  if (pathOnly === "/api/bncc/meta") return { total: DEMO_BNCC.length, disciplines: ["Matemática","Português","Ciências","História","Geografia"] };

  // Subjects
  if (pathOnly === "/api/subjects") return DEMO_SUBJECTS;

  // Coins
  if (pathOnly === "/api/coins")         return DEMO_COINS_BALANCE;
  if (pathOnly === "/api/coins/ranking") return DEMO_COINS_RANKING;

  // Loja
  if (pathOnly === "/api/loja")                  return DEMO_LOJA;
  if (pathOnly === "/api/loja/compras")          return [];
  if (pathOnly === "/api/loja/admin/compras")    return [];

  // Trilhas
  if (pathOnly === "/api/trilhas") return [];

  // Provas
  if (pathOnly === "/api/provas") return DEMO_PROVAS;

  // Fallback: array vazio para GETs desconhecidos
  return [];
}
