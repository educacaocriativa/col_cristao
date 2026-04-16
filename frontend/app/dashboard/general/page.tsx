"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getStoredUser, isDemoUser, type AuthUser } from "../../_lib/auth";
import { TEACHER_CLASSES, CLASS_GRADES, CLASS_STUDENTS } from "../_components/teacherMockData";
import NonDemoPlaceholder from "../_components/NonDemoPlaceholder";

function scoreColor(v: number) {
  return v >= 85 ? "#34d399" : v >= 70 ? "#fbbf24" : "#f87171";
}

// Mock network-level data
const MOCK_UNITS = [
  { id: "u1", name: "Unidade Centro",     city: "Maringá/PR",       students: 420, teachers: 28, avg: 82.4, active: true  },
  { id: "u2", name: "Unidade Norte",      city: "Sarandi/PR",       students: 310, teachers: 21, avg: 79.8, active: true  },
  { id: "u3", name: "Unidade Oeste",      city: "Paiçandu/PR",      students: 275, teachers: 18, avg: 84.1, active: true  },
  { id: "u4", name: "Unidade Sul",        city: "Mandaguari/PR",    students: 190, teachers: 14, avg: 77.3, active: true  },
  { id: "u5", name: "Unidade Leste",      city: "Marialva/PR",      students: 140, teachers: 10, avg: 81.0, active: false },
];

const BNCC_SKILLS = [
  { code: "EF04MA08", desc: "Frações como parte de um todo",    coverage: 85, discipline: "Matemática",  color: "#3b82f6" },
  { code: "EF04LP01", desc: "Interpretação de textos narrativos", coverage: 72, discipline: "Português", color: "#8b5cf6" },
  { code: "EF04CI01", desc: "Fenômenos naturais e sua explicação", coverage: 63, discipline: "Ciências", color: "#10b981" },
  { code: "EF04HI04", desc: "Brasil Colonial e suas dinâmicas",  coverage: 90, discipline: "História",  color: "#f59e0b" },
];

export default function GeneralPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    setHydrated(true);
  }, []);

  const networkStudents = MOCK_UNITS.reduce((s, u) => s + u.students, 0);
  const networkTeachers = MOCK_UNITS.reduce((s, u) => s + u.teachers, 0);
  const activeUnits     = MOCK_UNITS.filter((u) => u.active).length;
  const networkAvg      = MOCK_UNITS.reduce((s, u) => s + u.avg, 0) / MOCK_UNITS.length;

  if (!hydrated) return null;
  if (!isDemoUser(user)) {
    return (
      <NonDemoPlaceholder
        role="super_admin"
        primaryActionHref="/dashboard/general/unidades"
        primaryActionLabel="+ Cadastrar Unidades"
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Hero */}
      <div className="relative rounded-2xl px-6 py-5 overflow-hidden"
        style={{ background: "linear-gradient(135deg,#1b3a8f,#0a1638)", border: "1px solid rgba(240,192,64,0.2)" }}>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10 text-9xl pointer-events-none select-none">🌌</div>
        <p className="text-sm" style={{ color: "rgba(240,192,64,0.7)" }}>Commandante Geral — Rede</p>
        <h2 className="text-2xl font-bold text-white mt-0.5" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
          Comando Central — Colégio Cristão
        </h2>
        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
        <div className="flex gap-3 mt-4 flex-wrap">
          {[
            { icon: "🏛",  label: "Unidades",     value: activeUnits + "/" + MOCK_UNITS.length, color: "#f0c040" },
            { icon: "👨‍🚀", label: "Alunos",       value: networkStudents,  color: "#60a5fa" },
            { icon: "👨‍🏫", label: "Professores",  value: networkTeachers,  color: "#34d399" },
            { icon: "📊",  label: "Média da Rede", value: networkAvg.toFixed(1), color: scoreColor(networkAvg) },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.08)" }}>
              <span>{s.icon}</span>
              <div>
                <p className="text-base font-bold leading-none" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)", fontSize: "10px" }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/dashboard/general/usuarios",   icon: "👥", label: "Gerenciar Usuários", color: "#f0c040", bg: "rgba(240,192,64,0.12)" },
          { href: "/dashboard/general/unidades",   icon: "🏛", label: "Ver Unidades",       color: "#60a5fa", bg: "rgba(59,130,246,0.12)" },
          { href: "/dashboard/general/relatorios", icon: "📊", label: "Relatórios",         color: "#34d399", bg: "rgba(52,211,153,0.12)" },
          { href: "/dashboard/general/config",     icon: "⚙️", label: "Configurações",      color: "#a78bfa", bg: "rgba(139,92,246,0.12)" },
        ].map((a) => (
          <Link key={a.href} href={a.href}
            className="flex flex-col items-center gap-2 py-4 rounded-2xl text-sm font-semibold text-center transition-all duration-200"
            style={{ background: a.bg, color: a.color, border: `1px solid ${a.color}25` }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
            <span className="text-2xl">{a.icon}</span>
            {a.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Units table */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">🏛 Unidades da Rede</h3>
            <Link href="/dashboard/general/unidades" className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Gerenciar →</Link>
          </div>
          <div className="space-y-2">
            {MOCK_UNITS.map((u) => (
              <div key={u.id} className="px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{u.name}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{u.city}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: scoreColor(u.avg) }}>{u.avg.toFixed(1)}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: u.active ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)", color: u.active ? "#34d399" : "#f87171" }}>
                      {u.active ? "Ativa" : "Inativa"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-4 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <span>👨‍🚀 {u.students} alunos</span>
                  <span>👨‍🏫 {u.teachers} professores</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${u.avg}%`, background: scoreColor(u.avg), transition: "width 0.7s ease" }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* BNCC coverage + system status */}
        <div className="space-y-5">
          <section>
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              🎯 Cobertura BNCC — Top Habilidades
            </h3>
            <div className="space-y-3">
              {BNCC_SKILLS.map((s) => (
                <div key={s.code} className="px-4 py-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                        style={{ background: `${s.color}15`, color: s.color }}>
                        {s.code}
                      </span>
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{s.discipline}</span>
                    </div>
                    <span className="text-xs font-bold" style={{ color: scoreColor(s.coverage) }}>{s.coverage}%</span>
                  </div>
                  <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>{s.desc}</p>
                  <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                    <div className="h-1.5 rounded-full transition-all duration-700"
                      style={{ width: `${s.coverage}%`, background: s.color }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-white mb-3">⚙️ Status do Sistema</h3>
            <div className="space-y-2">
              {[
                { label: "API Backend",        status: "online",  latency: "24ms"  },
                { label: "Banco de Dados (RDS)",status: "online",  latency: "8ms"   },
                { label: "Storage (AWS S3)",    status: "online",  latency: "–"     },
                { label: "IA (Gemini API)",     status: "online",  latency: "1.2s"  },
                { label: "CDN Vimeo",           status: "online",  latency: "–"     },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: s.status === "online" ? "#34d399" : "#f87171", boxShadow: `0 0 6px ${s.status === "online" ? "#34d399" : "#f87171"}` }} />
                  <span className="flex-1 text-xs text-white">{s.label}</span>
                  {s.latency !== "–" && (
                    <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>{s.latency}</span>
                  )}
                  <span className="text-xs font-semibold"
                    style={{ color: s.status === "online" ? "#34d399" : "#f87171" }}>
                    {s.status === "online" ? "Online" : "Offline"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
