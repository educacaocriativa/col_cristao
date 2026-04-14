"use client";

import { useMemo } from "react";
import Link from "next/link";
import { TEACHER_CLASSES, CLASS_GRADES, CLASS_STUDENTS } from "../_components/teacherMockData";
import { MOCK_ANNOUNCEMENTS, MOCK_EVENTS } from "../_components/mockData";

function scoreColor(v: number) {
  return v >= 85 ? "#34d399" : v >= 70 ? "#fbbf24" : "#f87171";
}

const MOCK_TEACHERS = [
  { id: "t1", name: "Roberto Silva",   subject: "Matemática",        initials: "RS", color: "#3b82f6", classes: 3, active: true },
  { id: "t2", name: "Mariana Costa",   subject: "Língua Portuguesa", initials: "MC", color: "#8b5cf6", classes: 2, active: true },
  { id: "t3", name: "André Lima",      subject: "Ciências",          initials: "AL", color: "#10b981", classes: 2, active: true },
  { id: "t4", name: "Carla Mendes",    subject: "História",          initials: "CM", color: "#f59e0b", classes: 2, active: true },
  { id: "t5", name: "Lucas Ferreira",  subject: "Geografia",         initials: "LF", color: "#ef4444", classes: 1, active: false },
];

export default function ComandantePage() {
  const totalStudents = useMemo(() => Object.values(CLASS_STUDENTS).flat().length, []);

  const allGrades = useMemo(() =>
    Object.values(CLASS_GRADES).flat().flatMap((g) =>
      [g.bimester1, g.bimester2].filter((v): v is number => v !== undefined)
    ), []);
  const networkAvg = useMemo(() =>
    allGrades.length ? allGrades.reduce((a, b) => a + b, 0) / allGrades.length : 0, [allGrades]);

  const atRisk = useMemo(() =>
    Object.values(CLASS_GRADES).flat().filter((g) => {
      const vals = [g.bimester1, g.bimester2].filter((v): v is number => v !== undefined);
      return vals.length && vals.reduce((a, b) => a + b, 0) / vals.length < 70;
    }).length, []);

  const upcomingEvents = MOCK_EVENTS.filter((e) => e.date >= new Date().toISOString().split("T")[0]).slice(0, 4);

  const KPI = [
    { icon: "👨‍🚀", label: "Alunos",       value: totalStudents,              color: "#f0c040" },
    { icon: "👨‍🏫", label: "Professores",  value: MOCK_TEACHERS.length,       color: "#60a5fa" },
    { icon: "🚀",   label: "Turmas",       value: TEACHER_CLASSES.length,     color: "#34d399" },
    { icon: "📊",   label: "Média Rede",   value: networkAvg.toFixed(1),      color: scoreColor(networkAvg) },
    { icon: "⚠️",  label: "Em Risco",     value: atRisk,                     color: atRisk > 0 ? "#f87171" : "#34d399" },
    { icon: "📢",   label: "Comunicados",  value: MOCK_ANNOUNCEMENTS.length,  color: "#a78bfa" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Hero */}
      <div className="relative rounded-2xl px-6 py-5 overflow-hidden"
        style={{ background: "linear-gradient(135deg,#1b3a8f,#0a1638)", border: "1px solid rgba(240,192,64,0.2)" }}>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10 text-9xl pointer-events-none select-none">🏛</div>
        <p className="text-sm" style={{ color: "rgba(240,192,64,0.7)" }}>Administração — Unidade Centro</p>
        <h2 className="text-2xl font-bold text-white mt-0.5" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
          Base de Operações
        </h2>
        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
        <div className="flex gap-3 mt-4 flex-wrap">
          {KPI.map((k) => (
            <div key={k.label} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.08)" }}>
              <span>{k.icon}</span>
              <div>
                <p className="text-base font-bold leading-none" style={{ color: k.color }}>{k.value}</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)", fontSize: "10px" }}>{k.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/dashboard/comandante/cronograma",  icon: "📅", label: "Cronograma",       color: "#f0c040", bg: "rgba(240,192,64,0.12)" },
          { href: "/dashboard/comandante/turmas",      icon: "🚀", label: "Turmas",           color: "#60a5fa", bg: "rgba(59,130,246,0.12)" },
          { href: "/dashboard/comandante/comunicados", icon: "📢", label: "Comunicados",      color: "#a78bfa", bg: "rgba(139,92,246,0.12)" },
          { href: "/dashboard/comandante/relatorios",  icon: "📊", label: "Relatórios",       color: "#34d399", bg: "rgba(52,211,153,0.12)" },
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Professores */}
        <div className="xl:col-span-2 space-y-5">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">👨‍🏫 Corpo Docente</h3>
              <Link href="/dashboard/comandante/professores" className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Ver todos →</Link>
            </div>
            <div className="space-y-2">
              {MOCK_TEACHERS.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: `${t.color}20`, color: t.color }}>
                    {t.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{t.subject} · {t.classes} turmas</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                    style={{ background: t.active ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)", color: t.active ? "#34d399" : "#f87171" }}>
                    {t.active ? "Ativo" : "Afastado"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Turmas performance */}
          <section>
            <h3 className="text-sm font-bold text-white mb-3">🚀 Performance por Turma</h3>
            <div className="space-y-2">
              {TEACHER_CLASSES.map((tc) => {
                const grades = CLASS_GRADES[tc.id] ?? [];
                const vals   = grades.flatMap((g) => [g.bimester1, g.bimester2].filter((v): v is number => v !== undefined));
                const avg    = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                const pct    = Math.min(100, (avg / 100) * 100);
                return (
                  <div key={tc.id} className="px-4 py-3 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span>{tc.subjectIcon}</span>
                        <span className="text-sm font-semibold text-white">{tc.name}</span>
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{tc.studentCount} alunos</span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: avg > 0 ? scoreColor(avg) : "rgba(255,255,255,0.2)" }}>
                        {avg > 0 ? avg.toFixed(1) : "—"}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-1.5 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: avg > 0 ? scoreColor(avg) : "rgba(255,255,255,0.1)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Upcoming events */}
          <section>
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              📅 Próximos Eventos
            </h3>
            <div className="space-y-2">
              {upcomingEvents.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-3 py-3 rounded-xl"
                  style={{ background: `${e.color}08`, border: `1px solid ${e.color}25` }}>
                  <div className="w-9 h-9 rounded-xl flex flex-col items-center justify-center shrink-0"
                    style={{ background: `${e.color}20` }}>
                    <p className="text-xs font-bold leading-none" style={{ color: e.color }}>
                      {new Date(e.date + "T12:00:00").getDate()}
                    </p>
                    <p className="text-xs leading-none" style={{ color: `${e.color}80`, fontSize: "9px" }}>
                      {new Date(e.date + "T12:00:00").toLocaleString("pt-BR", { month: "short" }).toUpperCase()}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{e.title}</p>
                    {e.time && <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{e.time}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Announcements */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">📢 Comunicados</h3>
              <Link href="/dashboard/comandante/comunicados" className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Gerenciar →</Link>
            </div>
            <div className="space-y-2">
              {MOCK_ANNOUNCEMENTS.slice(0, 3).map((a) => {
                const c = a.priority === "urgente" ? "#f87171" : a.priority === "informativo" ? "#60a5fa" : "rgba(255,255,255,0.45)";
                return (
                  <div key={a.id} className="px-3 py-2.5 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${c}20` }}>
                    <p className="text-xs font-semibold text-white line-clamp-1">{a.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: c }}>
                      {a.priority.charAt(0).toUpperCase() + a.priority.slice(1)} · {a.author}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
