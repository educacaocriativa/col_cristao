// ============================================================
// DADOS MOCK — serão substituídos por chamadas reais à API
// ============================================================

export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  teacher: string;
  schedule: string;   // ex: "Seg e Qua 07:30"
  pendingActivities: number;
}

export interface Activity {
  id: string;
  title: string;
  type: "prova" | "atividade" | "simulado" | "tarefa" | "leitura";
  subject: string;
  subjectColor: string;
  dueDate: string;
  dueTime?: string;
  maxScore: number;
  timeLimitMinutes?: number;
  status: "pending" | "in_progress" | "completed" | "late";
  bimester: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;       // YYYY-MM-DD
  type: "prova" | "atividade" | "feriado" | "evento" | "reuniao" | "aula" | "recesso";
  color: string;
  allDay: boolean;
  time?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  role: string;
  date: string;
  priority: "normal" | "urgente" | "informativo";
  read: boolean;
}

export interface Grade {
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  bimester1?: number;
  bimester2?: number;
  bimester3?: number;
  bimester4?: number;
  recovery?: number;
  average?: number;
}

// ---- SUBJECTS ----
export const MOCK_SUBJECTS: Subject[] = [
  { id: "mat", name: "Matemática",         icon: "🔢", color: "#3b82f6", teacher: "Prof. Roberto",  schedule: "Seg, Qua e Sex 07:30", pendingActivities: 1 },
  { id: "por", name: "Língua Portuguesa",  icon: "📖", color: "#8b5cf6", teacher: "Prof.ª Mariana", schedule: "Seg e Qui 09:00",      pendingActivities: 2 },
  { id: "cie", name: "Ciências",           icon: "🔬", color: "#10b981", teacher: "Prof. André",    schedule: "Ter e Qui 07:30",      pendingActivities: 0 },
  { id: "his", name: "História",           icon: "📜", color: "#f59e0b", teacher: "Prof.ª Carla",   schedule: "Ter e Sex 09:00",      pendingActivities: 1 },
  { id: "geo", name: "Geografia",          icon: "🌍", color: "#ef4444", teacher: "Prof. Lucas",    schedule: "Qua e Sex 10:30",      pendingActivities: 0 },
  { id: "art", name: "Arte",               icon: "🎨", color: "#ec4899", teacher: "Prof.ª Sofia",   schedule: "Sex 13:00",            pendingActivities: 0 },
  { id: "edf", name: "Ed. Física",         icon: "⚽", color: "#06b6d4", teacher: "Prof. Felipe",   schedule: "Ter e Qui 13:00",      pendingActivities: 0 },
  { id: "ing", name: "Inglês",             icon: "🇬🇧", color: "#6366f1", teacher: "Prof.ª Ana",    schedule: "Seg e Qua 10:30",      pendingActivities: 1 },
];

// ---- ACTIVITIES ----
export const MOCK_ACTIVITIES: Activity[] = [
  {
    id: "a1", title: "Lista de Exercícios — Frações", type: "atividade",
    subject: "Matemática", subjectColor: "#3b82f6",
    dueDate: "2026-04-04", dueTime: "23:59", maxScore: 100, timeLimitMinutes: 45,
    status: "pending", bimester: 1,
  },
  {
    id: "a2", title: "Interpretação de Texto — Conto Moderno", type: "atividade",
    subject: "Língua Portuguesa", subjectColor: "#8b5cf6",
    dueDate: "2026-04-05", dueTime: "23:59", maxScore: 100, timeLimitMinutes: 60,
    status: "pending", bimester: 1,
  },
  {
    id: "a3", title: "Redação — Carta Argumentativa", type: "tarefa",
    subject: "Língua Portuguesa", subjectColor: "#8b5cf6",
    dueDate: "2026-04-07", maxScore: 100,
    status: "pending", bimester: 1,
  },
  {
    id: "a4", title: "Prova Bimestral — Conteúdo 1º Bimestre", type: "prova",
    subject: "História", subjectColor: "#f59e0b",
    dueDate: "2026-04-10", dueTime: "07:30", maxScore: 100, timeLimitMinutes: 90,
    status: "pending", bimester: 1,
  },
  {
    id: "a5", title: "Simulado Nacional — Matemática e Ciências", type: "simulado",
    subject: "Matemática", subjectColor: "#3b82f6",
    dueDate: "2026-04-08", dueTime: "09:00", maxScore: 100, timeLimitMinutes: 120,
    status: "pending", bimester: 1,
  },
  {
    id: "a6", title: "Vocabulário e Gramática — Unit 5", type: "atividade",
    subject: "Inglês", subjectColor: "#6366f1",
    dueDate: "2026-04-03", dueTime: "23:59", maxScore: 100, timeLimitMinutes: 30,
    status: "in_progress", bimester: 1,
  },
];

// ---- CALENDAR EVENTS ----
export const MOCK_EVENTS: CalendarEvent[] = [
  { id: "e1", title: "Atividade de Mat.",      date: "2026-04-04", type: "atividade", color: "#3b82f6", allDay: false, time: "23:59" },
  { id: "e2", title: "Atividade de Port.",     date: "2026-04-05", type: "atividade", color: "#8b5cf6", allDay: false, time: "23:59" },
  { id: "e3", title: "Simulado",               date: "2026-04-08", type: "prova",     color: "#f59e0b", allDay: false, time: "09:00" },
  { id: "e4", title: "Prova de História",      date: "2026-04-10", type: "prova",     color: "#ef4444", allDay: false, time: "07:30" },
  { id: "e5", title: "Reunião de Pais",        date: "2026-04-11", type: "reuniao",   color: "#10b981", allDay: true },
  { id: "e6", title: "Feriado — Tiradentes",   date: "2026-04-21", type: "feriado",   color: "#6b7280", allDay: true },
  { id: "e7", title: "Evento Cultural",        date: "2026-04-25", type: "evento",    color: "#ec4899", allDay: true },
];

// ---- ANNOUNCEMENTS ----
export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "an1",
    title: "Reunião de Pais e Mestres — 11 de Abril",
    content: "Informamos que a Reunião de Pais e Mestres do 1º Bimestre será realizada no dia 11 de abril, às 9h, no auditório da escola. A presença é muito importante!",
    author: "Direção Escolar",
    role: "Admin",
    date: "2026-04-01",
    priority: "urgente",
    read: false,
  },
  {
    id: "an2",
    title: "Material didático disponível no sistema",
    content: "Os PDFs e videoaulas do 2º Bimestre já estão disponíveis na seção Missões. Acesse pelo menu lateral.",
    author: "Prof.ª Mariana",
    role: "Professor",
    date: "2026-04-01",
    priority: "informativo",
    read: false,
  },
  {
    id: "an3",
    title: "Simulado Nacional — Inscrição confirmada",
    content: "Sua inscrição no Simulado Nacional foi confirmada. A prova acontece no dia 08/04 às 09h.",
    author: "Coordenação",
    role: "Pedagógico",
    date: "2026-03-30",
    priority: "normal",
    read: true,
  },
];

// ---- GRADES ----
export const MOCK_GRADES: Grade[] = [
  { subjectId: "mat", subjectName: "Matemática",        subjectColor: "#3b82f6", bimester1: 87, bimester2: 92, bimester3: undefined, bimester4: undefined, average: 89.5 },
  { subjectId: "por", subjectName: "Língua Portuguesa", subjectColor: "#8b5cf6", bimester1: 75, bimester2: 80, bimester3: undefined, bimester4: undefined, average: 77.5 },
  { subjectId: "cie", subjectName: "Ciências",          subjectColor: "#10b981", bimester1: 95, bimester2: 88, bimester3: undefined, bimester4: undefined, average: 91.5 },
  { subjectId: "his", subjectName: "História",          subjectColor: "#f59e0b", bimester1: 70, bimester2: 78, bimester3: undefined, bimester4: undefined, average: 74   },
  { subjectId: "geo", subjectName: "Geografia",         subjectColor: "#ef4444", bimester1: 83, bimester2: 91, bimester3: undefined, bimester4: undefined, average: 87   },
  { subjectId: "ing", subjectName: "Inglês",            subjectColor: "#6366f1", bimester1: 88, bimester2: 90, bimester3: undefined, bimester4: undefined, average: 89   },
];
