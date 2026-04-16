import { getToken, isDemoSession } from './auth';
import { getDemoMockFor } from './demoMocks';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const DEMO_READONLY_MESSAGE =
  'Você precisa estar logado para realizar essa operação';

// ── Core fetch wrapper ────────────────────────────────────────
async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // ── Modo demo: intercepta sem bater no backend ──
  if (isDemoSession()) {
    const method = (options.method ?? 'GET').toUpperCase();

    // Qualquer mutação em demo bloqueia com alert padronizado
    if (method !== 'GET') {
      if (typeof window !== 'undefined') {
        window.alert(DEMO_READONLY_MESSAGE);
      }
      throw new Error('DEMO_READONLY');
    }

    // GET → retorna mock mapeado para o path
    return Promise.resolve(getDemoMockFor(path) as T);
  }

  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T = unknown>(path: string) =>
    apiFetch<T>(path),

  post: <T = unknown>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),

  put: <T = unknown>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),

  delete: <T = unknown>(path: string) =>
    apiFetch<T>(path, { method: 'DELETE' }),
};

// ── Typed helpers ─────────────────────────────────────────────

// Auth
export const authApi = {
  me: () => api.get('/api/auth/me'),
};

// Turmas
export const turmasApi = {
  list: (params?: Record<string, string>) =>
    api.get(`/api/turmas${toQuery(params)}`),
  create: (body: unknown) =>
    api.post('/api/turmas', body),
  importBulk: (turmas: unknown[]) =>
    api.post('/api/turmas/import', { turmas }),
  addSubjects: (classId: string, subject_ids: string[]) =>
    api.post(`/api/turmas/${classId}/add-subjects`, { subject_ids }),
  assignProfessor: (classId: string, userId: string, subject_ids: string[]) =>
    api.post(`/api/turmas/${classId}/add-professor`, { user_id: userId, subject_ids }),
  update: (id: string, body: unknown) =>
    api.put(`/api/turmas/${id}`, body),
  get: (id: string) =>
    api.get(`/api/turmas/${id}`),
  addAluno: (classId: string, userId: string) =>
    api.post(`/api/turmas/${classId}/add-aluno`, { user_id: userId }),
  addPedagogico: (classId: string, userId: string) =>
    api.post(`/api/turmas/${classId}/add-pedagogico`, { user_id: userId }),
  addProfessor: (classId: string, userId: string) =>
    api.post(`/api/turmas/${classId}/add-professor`, { user_id: userId }),
  getAlunos: (id: string) =>
    api.get(`/api/turmas/${id}/alunos`),
  getChamada: (id: string, params?: Record<string, string>) =>
    api.get(`/api/turmas/${id}/chamada${toQuery(params)}`),
  getChamadaHistorico: (id: string, params?: Record<string, string>) =>
    api.get(`/api/turmas/${id}/chamada/historico${toQuery(params)}`),
  saveChamada: (id: string, body: unknown) =>
    api.post(`/api/turmas/${id}/chamada`, body),
  getNotas: (id: string, params?: Record<string, string>) =>
    api.get(`/api/turmas/${id}/notas${toQuery(params)}`),
  saveNotas: (id: string, body: unknown) =>
    api.post(`/api/turmas/${id}/notas`, body),
};

// Alunos
export const alunosApi = {
  list: (params?: Record<string, string>) =>
    api.get(`/api/alunos${toQuery(params)}`),
  matricular: (body: unknown) =>
    api.post('/api/alunos/matricular', body),
  importBulk: (alunos: unknown[]) =>
    api.post('/api/alunos/import-bulk', { alunos }),
  getFilho: () =>
    api.get('/api/alunos/filho'),
  getNotas: (id: string) =>
    api.get(`/api/alunos/${id}/notas`),
  getFrequencia: (id: string) =>
    api.get(`/api/alunos/${id}/frequencia`),
  getAtividades: (id: string) =>
    api.get(`/api/alunos/${id}/atividades`),
};

// Atividades
export const atividadesApi = {
  list: (params?: Record<string, string>) =>
    api.get(`/api/atividades${toQuery(params)}`),
  get: (id: string) =>
    api.get(`/api/atividades/${id}`),
  create: (body: unknown) =>
    api.post('/api/atividades', body),
  submeter: (id: string, body: unknown) =>
    api.post(`/api/atividades/${id}/submeter`, body),
  delete: (id: string) =>
    api.delete(`/api/atividades/${id}`),
};

// Materiais
export const materiaisApi = {
  list: (params?: Record<string, string>) =>
    api.get(`/api/materiais${toQuery(params)}`),
  create: (body: unknown) =>
    api.post('/api/materiais', body),
  delete: (id: string) =>
    api.delete(`/api/materiais/${id}`),
};

// Comunicados
export const comunicadosApi = {
  list: (params?: Record<string, string>) =>
    api.get(`/api/comunicados${toQuery(params)}`),
  create: (body: unknown) =>
    api.post('/api/comunicados', body),
  delete: (id: string) =>
    api.delete(`/api/comunicados/${id}`),
};

// Social
export const socialApi = {
  getPosts: (params?: Record<string, string>) =>
    api.get(`/api/social/posts${toQuery(params)}`),
  createPost: (body: unknown) =>
    api.post('/api/social/posts', body),
  like: (id: string) =>
    api.post(`/api/social/posts/${id}/like`, {}),
  comment: (id: string, body: unknown) =>
    api.post(`/api/social/posts/${id}/comentarios`, body),
  deletePost: (id: string) =>
    api.delete(`/api/social/posts/${id}`),
  moderar: (id: string, body: unknown) =>
    api.post(`/api/social/posts/${id}/moderar`, body),
};

// Diário
export const diarioApi = {
  list: (params?: Record<string, string>) =>
    api.get(`/api/diario${toQuery(params)}`),
  create: (body: unknown) =>
    api.post('/api/diario', body),
  update: (id: string, body: unknown) =>
    api.put(`/api/diario/${id}`, body),
  delete: (id: string) =>
    api.delete(`/api/diario/${id}`),
};

// Calendário
export const calendarApi = {
  list: (params?: Record<string, string>) =>
    api.get(`/api/calendar${toQuery(params)}`),
  create: (body: unknown) =>
    api.post('/api/calendar', body),
  delete: (id: string) =>
    api.delete(`/api/calendar/${id}`),
};

// Relatórios
export const relatoriosApi = {
  desempenho: (params?: Record<string, string>) =>
    api.get(`/api/relatorios/desempenho${toQuery(params)}`),
  bncc: (params?: Record<string, string>) =>
    api.get(`/api/relatorios/bncc${toQuery(params)}`),
  frequencia: (params?: Record<string, string>) =>
    api.get(`/api/relatorios/frequencia${toQuery(params)}`),
};

// Usuários (super admin / admin)
export const usuariosApi = {
  list: (params?: Record<string, string>) =>
    api.get(`/api/usuarios${toQuery(params)}`),
  create: (body: unknown) =>
    api.post('/api/usuarios', body),
  importBulk: (usuarios: unknown[]) =>
    api.post('/api/usuarios/import', { usuarios }),
  update: (id: string, body: unknown) =>
    api.put(`/api/usuarios/${id}`, body),
  delete: (id: string) =>
    api.delete(`/api/usuarios/${id}`),
};

// Trilhas de Aprendizagem
export const trilhasApi = {
  list: (params?: Record<string, string>) =>
    api.get(`/api/trilhas${toQuery(params)}`),
  get: (id: string) =>
    api.get(`/api/trilhas/${id}`),
  create: (body: unknown) =>
    api.post('/api/trilhas', body),
  update: (id: string, body: unknown) =>
    api.put(`/api/trilhas/${id}`, body),
  delete: (id: string) =>
    api.delete(`/api/trilhas/${id}`),
  addStep: (trailId: string, body: unknown) =>
    api.post(`/api/trilhas/${trailId}/steps`, body),
  updateStep: (trailId: string, stepId: string, body: unknown) =>
    api.put(`/api/trilhas/${trailId}/steps/${stepId}`, body),
  deleteStep: (trailId: string, stepId: string) =>
    api.delete(`/api/trilhas/${trailId}/steps/${stepId}`),
  completarStep: (trailId: string, stepId: string) =>
    api.post(`/api/trilhas/${trailId}/steps/${stepId}/completar`, {}),
};

// Moedas (Estelares)
export const coinsApi = {
  getBalance: () =>
    api.get('/api/coins'),
  getRanking: () =>
    api.get('/api/coins/ranking'),
};

// Loja Galáctica
export const lojaApi = {
  list: () =>
    api.get('/api/loja'),
  create: (body: unknown) =>
    api.post('/api/loja', body),
  update: (id: string, body: unknown) =>
    api.put(`/api/loja/${id}`, body),
  delete: (id: string) =>
    api.delete(`/api/loja/${id}`),
  comprar: (id: string) =>
    api.post(`/api/loja/${id}/comprar`, {}),
  getCompras: () =>
    api.get('/api/loja/compras'),
  getAdminCompras: () =>
    api.get('/api/loja/admin/compras'),
  entregar: (id: string) =>
    api.put(`/api/loja/admin/compras/${id}/entregar`, {}),
};

// Cronograma
export const scheduleApi = {
  get: (classId: string) =>
    api.get(`/api/schedule?class_id=${classId}`),
  save: (classId: string, academicYearId: string | null, slots: unknown[]) =>
    api.post('/api/schedule', { class_id: classId, academic_year_id: academicYearId, slots }),
  frequencia: (classId: string, bimester: number) =>
    api.get(`/api/schedule/frequencia?class_id=${classId}&bimester=${bimester}`),
  week: () =>
    api.get('/api/schedule/week'),
};

// Avaliações (grade items)
export const gradeItemsApi = {
  list: (classId: string, params?: Record<string, string>) =>
    api.get(`/api/turmas/${classId}/grade-items${toQuery(params)}`),
  create: (classId: string, body: unknown) =>
    api.post(`/api/turmas/${classId}/grade-items`, body),
  update: (classId: string, itemId: string, body: unknown) =>
    api.put(`/api/turmas/${classId}/grade-items/${itemId}`, body),
  delete: (classId: string, itemId: string) =>
    api.delete(`/api/turmas/${classId}/grade-items/${itemId}`),
  saveScores: (classId: string, itemId: string, scores: unknown[]) =>
    api.post(`/api/turmas/${classId}/grade-items/${itemId}/scores`, { scores }),
  activitiesForGrading: (classId: string, params?: Record<string, string>) =>
    api.get(`/api/turmas/${classId}/activities-for-grading${toQuery(params)}`),
};

// Escolas (super_admin)
export const schoolsApi = {
  list: () => api.get('/api/schools'),
  listDeleted: () => api.get('/api/schools/deleted'),
  create: (body: unknown) => api.post('/api/schools', body),
  importBulk: (schools: unknown[]) => api.post('/api/schools/import', { schools }),
  update: (id: string, body: unknown) => api.put(`/api/schools/${id}`, body),
  deactivate: (id: string) => api.put(`/api/schools/${id}/deactivate`, {}),
  delete: (id: string) => api.delete(`/api/schools/${id}`),
  restore: (id: string) => api.put(`/api/schools/${id}/restore`, {}),
  gradeLevels: () => api.get('/api/schools/grade-levels'),
};

// BNCC (super_admin)
export const bnccApi = {
  list: (params?: Record<string, string>) => api.get(`/api/bncc${toQuery(params)}`),
  meta: () => api.get('/api/bncc/meta'),
  create: (body: unknown) => api.post('/api/bncc', body),
  bulk: (skills: unknown[]) => api.post('/api/bncc/bulk', { skills }),
  update: (id: string, body: unknown) => api.put(`/api/bncc/${id}`, body),
  delete: (id: string) => api.delete(`/api/bncc/${id}`),
};

// Disciplinas (super_admin + admin)
export const subjectsApi = {
  list: (params?: Record<string, string>) => api.get(`/api/subjects${toQuery(params)}`),
  listAll: () => api.get('/api/subjects?include_inactive=true'),
  create: (body: unknown) => api.post('/api/subjects', body),
  update: (id: string, body: unknown) => api.put(`/api/subjects/${id}`, body),
  reactivate: (id: string) => api.put(`/api/subjects/${id}`, { active: true }),
  delete: (id: string) => api.delete(`/api/subjects/${id}`),
};

// Impersonação (super_admin)
export const impersonateApi = {
  start: (userId: string) => api.post(`/api/usuarios/${userId}/impersonate`, {}),
};

// ── Utility ───────────────────────────────────────────────────
function toQuery(params?: Record<string, string>): string {
  if (!params || !Object.keys(params).length) return '';
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
  ).toString();
  return qs ? `?${qs}` : '';
}
