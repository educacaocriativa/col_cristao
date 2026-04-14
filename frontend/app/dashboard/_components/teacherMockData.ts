// ============================================================
// DADOS MOCK — PROFESSOR (PILOTO)
// ============================================================

export interface TeacherClass {
  id: string;
  name: string;          // Ex: "4º Ano | Cativante"
  gradeName: string;     // Ex: "4º Ano"
  className: string;     // Ex: "Cativante"
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  subjectIcon: string;
  schedule: Record<string, string>; // { "segunda": "07:30-08:20", ... }
  studentCount: number;
  pendingGrades: number;
  lastActivity?: string;
}

export interface Student {
  id: string;
  name: string;
  enrollment: string;
  photo?: string;
  initials: string;
  email: string;
  whatsapp: string;
  parentName: string;
  active: boolean;
}

export interface AttendanceRecord {
  studentId: string;
  status: "presente" | "falta" | "justificada";
  note?: string;
}

export interface AttendanceSession {
  id: string;
  classId: string;
  date: string;
  records: AttendanceRecord[];
  saved: boolean;
}

export interface DiaryEntry {
  id: string;
  classId: string;
  date: string;
  content: string;
  objectives?: string;
  methodology?: string;
  resources?: string;
}

export interface StudentGrade {
  studentId: string;
  studentName: string;
  bimester1?: number;
  bimester2?: number;
  bimester3?: number;
  bimester4?: number;
  recovery?: number;
  absences: number;
}

// ---- TURMAS DO PROFESSOR ----
export const TEACHER_CLASSES: TeacherClass[] = [
  {
    id: "t1",
    name: "4º Ano | Cativante",
    gradeName: "4º Ano",
    className: "Cativante",
    subjectId: "mat",
    subjectName: "Matemática",
    subjectColor: "#3b82f6",
    subjectIcon: "🔢",
    schedule: { "segunda": "07:30–08:20", "quarta": "07:30–08:20", "sexta": "07:30–08:20" },
    studentCount: 28,
    pendingGrades: 5,
    lastActivity: "Lista de Frações",
  },
  {
    id: "t2",
    name: "4º Ano | Destemido",
    gradeName: "4º Ano",
    className: "Destemido",
    subjectId: "mat",
    subjectName: "Matemática",
    subjectColor: "#3b82f6",
    subjectIcon: "🔢",
    schedule: { "terça": "09:00–09:50", "quinta": "09:00–09:50", "sexta": "10:30–11:20" },
    studentCount: 25,
    pendingGrades: 3,
    lastActivity: "Multiplicação — Revisão",
  },
  {
    id: "t3",
    name: "5º Ano | Pioneiro",
    gradeName: "5º Ano",
    className: "Pioneiro",
    subjectId: "mat",
    subjectName: "Matemática",
    subjectColor: "#3b82f6",
    subjectIcon: "🔢",
    schedule: { "segunda": "09:00–09:50", "quarta": "10:30–11:20", "quinta": "07:30–08:20" },
    studentCount: 30,
    pendingGrades: 8,
    lastActivity: "Números Decimais",
  },
];

// ---- ALUNOS (por turma) ----
export const CLASS_STUDENTS: Record<string, Student[]> = {
  t1: [
    { id: "s1",  name: "Alice Fernandes",     enrollment: "2026001", initials: "AF", email: "alice@email.com",    whatsapp: "(44)99999-0001", parentName: "Maria Fernandes",  active: true },
    { id: "s2",  name: "Bruno Carvalho",      enrollment: "2026002", initials: "BC", email: "bruno@email.com",    whatsapp: "(44)99999-0002", parentName: "Paulo Carvalho",   active: true },
    { id: "s3",  name: "Camila Santos",       enrollment: "2026003", initials: "CS", email: "camila@email.com",   whatsapp: "(44)99999-0003", parentName: "Ana Santos",       active: true },
    { id: "s4",  name: "Daniel Oliveira",     enrollment: "2026004", initials: "DO", email: "daniel@email.com",   whatsapp: "(44)99999-0004", parentName: "José Oliveira",    active: true },
    { id: "s5",  name: "Eduarda Lima",        enrollment: "2026005", initials: "EL", email: "eduarda@email.com",  whatsapp: "(44)99999-0005", parentName: "Rosa Lima",        active: true },
    { id: "s6",  name: "Felipe Rodrigues",    enrollment: "2026006", initials: "FR", email: "felipe@email.com",   whatsapp: "(44)99999-0006", parentName: "Sônia Rodrigues",  active: true },
    { id: "s7",  name: "Gabriela Souza",      enrollment: "2026007", initials: "GS", email: "gabriela@email.com", whatsapp: "(44)99999-0007", parentName: "Luiza Souza",      active: true },
    { id: "s8",  name: "Henrique Costa",      enrollment: "2026008", initials: "HC", email: "henrique@email.com", whatsapp: "(44)99999-0008", parentName: "Marta Costa",      active: true },
  ],
  t2: [
    { id: "s9",  name: "Isabela Martins",     enrollment: "2026009", initials: "IM", email: "isabela@email.com",  whatsapp: "(44)99999-0009", parentName: "Cláudia Martins", active: true },
    { id: "s10", name: "João Pedro Alves",    enrollment: "2026010", initials: "JP", email: "joao@email.com",     whatsapp: "(44)99999-0010", parentName: "Marco Alves",     active: true },
    { id: "s11", name: "Karen Pereira",       enrollment: "2026011", initials: "KP", email: "karen@email.com",    whatsapp: "(44)99999-0011", parentName: "Rita Pereira",    active: true },
  ],
  t3: [
    { id: "s12", name: "Lucas Mendes",        enrollment: "2026012", initials: "LM", email: "lucas@email.com",    whatsapp: "(44)99999-0012", parentName: "Vera Mendes",     active: true },
    { id: "s13", name: "Mariana Barbosa",     enrollment: "2026013", initials: "MB", email: "mariana@email.com",  whatsapp: "(44)99999-0013", parentName: "Igor Barbosa",    active: true },
    { id: "s14", name: "Nicolas Teixeira",    enrollment: "2026014", initials: "NT", email: "nicolas@email.com",  whatsapp: "(44)99999-0014", parentName: "Sandra Teixeira", active: true },
  ],
};

// ---- NOTAS POR TURMA ----
export const CLASS_GRADES: Record<string, StudentGrade[]> = {
  t1: [
    { studentId: "s1", studentName: "Alice Fernandes",  bimester1: 92, bimester2: 88, absences: 2 },
    { studentId: "s2", studentName: "Bruno Carvalho",   bimester1: 75, bimester2: 70, absences: 4 },
    { studentId: "s3", studentName: "Camila Santos",    bimester1: 98, bimester2: 95, absences: 0 },
    { studentId: "s4", studentName: "Daniel Oliveira",  bimester1: 60, bimester2: 65, absences: 8, recovery: 72 },
    { studentId: "s5", studentName: "Eduarda Lima",     bimester1: 85, bimester2: 90, absences: 1 },
    { studentId: "s6", studentName: "Felipe Rodrigues", bimester1: 45, bimester2: 55, absences: 12, recovery: 68 },
    { studentId: "s7", studentName: "Gabriela Souza",   bimester1: 88, bimester2: 92, absences: 3 },
    { studentId: "s8", studentName: "Henrique Costa",   bimester1: 78, bimester2: 82, absences: 5 },
  ],
};

// ---- DIÁRIO PEDAGÓGICO ----
export const DIARY_ENTRIES: DiaryEntry[] = [
  {
    id: "d1", classId: "t1", date: "2026-04-01",
    content: "Revisão de frações com denominadores diferentes. Turma demonstrou boa compreensão do conteúdo. Utilizado material concreto (réguas de fração).",
    objectives: "Compreender a adição de frações com denominadores diferentes",
    methodology: "Exposição dialogada + atividade em pares",
    resources: "Livro didático pág. 45, réguas de fração",
  },
  {
    id: "d2", classId: "t1", date: "2026-03-30",
    content: "Introdução ao conceito de MMC para simplificação de frações. Alguns alunos apresentaram dificuldade inicial.",
    objectives: "Aplicar o MMC na operação com frações",
    methodology: "Aula expositiva + resolução de exercícios",
    resources: "Quadro branco, lista de exercícios",
  },
];
