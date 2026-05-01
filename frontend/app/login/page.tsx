"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ColCristLogo from "../_components/ColCristLogo";
import StarField from "../_components/StarField";
import {
  loginRequest,
  saveSession,
  ROLE_DASHBOARD,
  ROLE_LABELS,
  ROLE_ICONS,
  type UserRole,
  type AuthUser,
} from "../_lib/auth";

const DEMO_USERS: { role: UserRole; name: string; schoolName: string }[] = [
  { role: "super_admin", name: "Sistema Admin",    schoolName: "Rede Colégio Cristão" },
  { role: "admin",       name: "Carlos Diretor",   schoolName: "Unidade Centro"       },
  { role: "pedagogico",  name: "Carla Mendes",     schoolName: "Unidade Centro"       },
  { role: "professor",   name: "Roberto Silva",    schoolName: "Unidade Centro"       },
  { role: "aluno",       name: "Alice Fernandes",  schoolName: "Unidade Centro"       },
  { role: "pais",        name: "Maria Fernandes",  schoolName: "Unidade Centro"       },
];

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState<UserRole | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const { token, user } = await loginRequest(email.trim(), password);
        saveSession(token, user);
        router.push(ROLE_DASHBOARD[user.role as UserRole]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao conectar. Tente novamente.");
      }
    });
  }

  function handleDemoLogin(demo: typeof DEMO_USERS[0]) {
    setDemoLoading(demo.role);
    const user: AuthUser = {
      id: `demo-${demo.role}`,
      name: demo.name,
      email: `${demo.role}@demo.colegiocristao.edu.br`,
      role: demo.role,
      schoolId: "demo-school",
      schoolName: demo.schoolName,
    };
    saveSession("demo-token", user);
    router.push(ROLE_DASHBOARD[demo.role]);
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden py-8"
      style={{ background: "linear-gradient(135deg, #0a1638 0%, #1b3a8f 55%, #102257 100%)" }}
    >
      <StarField count={100} />

      {/* Planetas decorativos */}
      <div className="absolute hidden lg:block pointer-events-none" style={{
        right: "-80px", bottom: "-80px", width: "420px", height: "420px",
        borderRadius: "50%",
        background: "radial-gradient(circle at 35% 35%, #f0c040 0%, #eab308 40%, #a16207 100%)",
        opacity: 0.12, filter: "blur(2px)",
      }} />
      <div className="absolute hidden lg:block pointer-events-none" style={{
        left: "-60px", top: "80px", width: "200px", height: "200px",
        borderRadius: "50%",
        background: "radial-gradient(circle at 40% 40%, #5674cf 0%, #1b3a8f 70%)",
        opacity: 0.2,
      }} />

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Glow atrás do card */}
        <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(240,192,64,0.15) 0%, transparent 70%)",
          filter: "blur(20px)", transform: "translateY(-20px)",
        }} />

        <div className="relative rounded-3xl overflow-hidden" style={{
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(240,192,64,0.2)",
          boxShadow: "0 32px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
        }}>
          {/* Header */}
          <div className="px-8 pt-8 pb-6 flex flex-col items-center"
            style={{ borderBottom: "1px solid rgba(240,192,64,0.15)" }}>
            <div className="float-animation mb-4">
              <ColCristLogo size={96} />
            </div>
            <h1 className="text-2xl font-bold tracking-wide mt-2"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#f0c040", textShadow: "0 0 20px rgba(240,192,64,0.4)" }}>
              Centro de Controle
            </h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
              Missão Educacional — Colégio Cristão
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "rgba(240,192,64,0.8)" }}>
                Identificação do Cosmonauta
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base" aria-hidden>📧</span>
                <input
                  id="email" type="text" autoComplete="username" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="e-mail ou matricula"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm transition-all duration-200"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.12)", color: "#ffffff", outline: "none" }}
                  onFocus={(e) => { e.currentTarget.style.border = "1.5px solid rgba(240,192,64,0.6)"; e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(240,192,64,0.1)"; }}
                  onBlur={(e)  => { e.currentTarget.style.border = "1.5px solid rgba(255,255,255,0.12)"; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "rgba(240,192,64,0.8)" }}>
                Código de Acesso
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base" aria-hidden>🔐</span>
                <input
                  id="password" type={showPass ? "text" : "password"}
                  autoComplete="current-password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3.5 rounded-xl text-sm transition-all duration-200"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.12)", color: "#ffffff", outline: "none" }}
                  onFocus={(e) => { e.currentTarget.style.border = "1.5px solid rgba(240,192,64,0.6)"; e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(240,192,64,0.1)"; }}
                  onBlur={(e)  => { e.currentTarget.style.border = "1.5px solid rgba(255,255,255,0.12)"; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.boxShadow = "none"; }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                  aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}>
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm" role="alert"
                style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
                <span aria-hidden>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={isPending}
              className="w-full py-4 rounded-xl font-bold text-sm tracking-widest uppercase transition-all duration-200"
              style={{
                background: isPending ? "rgba(240,192,64,0.5)" : "linear-gradient(135deg, #f0c040 0%, #eab308 100%)",
                color: "#102257",
                boxShadow: isPending ? "none" : "0 8px 24px rgba(240,192,64,0.35), inset 0 1px 0 rgba(255,255,255,0.3)",
                cursor: isPending ? "not-allowed" : "pointer",
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Iniciando Missão...
                </span>
              ) : "🚀 Iniciar Missão"}
            </button>

            <div className="text-center">
              <button type="button" className="text-xs transition-colors duration-200"
                style={{ color: "rgba(255,255,255,0.4)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#f0c040")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}>
                Esqueceu seu código de acesso?
              </button>
            </div>
          </form>

          {/* ── MODO DEMO ── */}
          <div className="px-8 pb-7" style={{ borderTop: "1px solid rgba(240,192,64,0.1)" }}>
            <div className="flex items-center gap-3 mt-5 mb-4">
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                style={{ background: "rgba(240,192,64,0.12)", border: "1px solid rgba(240,192,64,0.25)" }}>
                <span className="text-xs font-bold" style={{ color: "#f0c040", letterSpacing: "0.1em" }}>MODO DEMO</span>
                <span className="text-xs">🧪</span>
              </div>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            </div>

            <p className="text-xs text-center mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>
              Acesse qualquer perfil sem senha para explorar a plataforma
            </p>

            <div className="grid grid-cols-2 gap-2">
              {DEMO_USERS.map((demo) => {
                const isLoading = demoLoading === demo.role;
                return (
                  <button
                    key={demo.role}
                    onClick={() => handleDemoLogin(demo)}
                    disabled={demoLoading !== null}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-150"
                    style={{
                      background: isLoading ? "rgba(240,192,64,0.15)" : "rgba(255,255,255,0.04)",
                      border: isLoading
                        ? "1px solid rgba(240,192,64,0.4)"
                        : "1px solid rgba(255,255,255,0.08)",
                      cursor: demoLoading !== null ? "not-allowed" : "pointer",
                      opacity: demoLoading !== null && !isLoading ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (demoLoading) return;
                      e.currentTarget.style.background = "rgba(240,192,64,0.1)";
                      e.currentTarget.style.borderColor = "rgba(240,192,64,0.3)";
                    }}
                    onMouseLeave={(e) => {
                      if (isLoading) return;
                      e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                    }}
                  >
                    {isLoading ? (
                      <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none"
                        style={{ color: "#f0c040" }}>
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <span className="text-lg leading-none shrink-0">{ROLE_ICONS[demo.role]}</span>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: isLoading ? "#f0c040" : "#ffffff" }}>
                        {ROLE_LABELS[demo.role]}
                      </p>
                      <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)", fontSize: "10px" }}>
                        {demo.name}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <p className="text-center mt-5 text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
          Plataforma Educacional Colégio Cristão • v1.0.0
        </p>
      </div>
    </div>
  );
}
