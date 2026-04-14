export type UserRole =
  | "super_admin"
  | "admin"
  | "pedagogico"
  | "professor"
  | "aluno"
  | "pais";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  schoolId?: string;
  schoolName?: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

// Mapeamento de role para nomenclatura espacial
export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin:  "Comandante Geral",
  admin:        "Comandante de Base",
  pedagogico:   "Navegador",
  professor:    "Piloto",
  aluno:        "Cosmonauta",
  pais:         "Controle de Missão",
};

export const ROLE_ICONS: Record<UserRole, string> = {
  super_admin: "🚀",
  admin:       "🛸",
  pedagogico:  "🧭",
  professor:   "👨‍🚀",
  aluno:       "🌟",
  pais:        "📡",
};

// Redirecionamento após login por role
export const ROLE_DASHBOARD: Record<UserRole, string> = {
  super_admin: "/dashboard/general",
  admin:       "/dashboard/comandante",
  pedagogico:  "/dashboard/navegador",
  professor:   "/dashboard/piloto",
  aluno:       "/dashboard/cosmonauta",
  pais:        "/dashboard/controle",
};

const TOKEN_KEY = "cc_mission_token";
const USER_KEY  = "cc_mission_user";

export function saveSession(token: string, user: AuthUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthUser; } catch { return null; }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ── Impersonation ─────────────────────────────────────────────
const ORIG_TOKEN_KEY = "cc_original_token";
const ORIG_USER_KEY  = "cc_original_user";

export function startImpersonation(token: string, user: AuthUser): void {
  if (typeof window === "undefined") return;
  // Back up current super_admin session
  const curToken = getToken();
  const curUser  = getStoredUser();
  if (curToken) localStorage.setItem(ORIG_TOKEN_KEY, curToken);
  if (curUser)  localStorage.setItem(ORIG_USER_KEY, JSON.stringify(curUser));
  // Switch to impersonated session
  saveSession(token, user);
}

export function isImpersonating(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(ORIG_TOKEN_KEY);
}

export function getOriginalUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(ORIG_USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthUser; } catch { return null; }
}

export function stopImpersonation(): void {
  if (typeof window === "undefined") return;
  const token = localStorage.getItem(ORIG_TOKEN_KEY);
  const userRaw = localStorage.getItem(ORIG_USER_KEY);
  if (token && userRaw) {
    try { saveSession(token, JSON.parse(userRaw)); } catch { /* ignore */ }
  }
  localStorage.removeItem(ORIG_TOKEN_KEY);
  localStorage.removeItem(ORIG_USER_KEY);
}

export async function loginRequest(
  email: string,
  password: string
): Promise<LoginResponse> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Erro desconhecido." }));
    throw new Error(err.message || "Falha na autenticação.");
  }

  return res.json() as Promise<LoginResponse>;
}
