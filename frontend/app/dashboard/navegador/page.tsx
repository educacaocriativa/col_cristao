"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getStoredUser, isDemoUser, type AuthUser } from "../../_lib/auth";
import { TEACHER_CLASSES, CLASS_GRADES, DIARY_ENTRIES } from "../_components/teacherMockData";
import { MOCK_ACTIVITIES, MOCK_ANNOUNCEMENTS } from "../_components/mockData";
import NonDemoPlaceholder from "../_components/NonDemoPlaceholder";

function scoreColor(v: number) {
  return v >= 85 ? "#34d399" : v >= 70 ? "#fbbf24" : "#f87171";
}

export default function NavegadorPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    setHydrated(true);
  }, []);

  const totalStudents = useMemo(() => TEACHER_CLASSES.reduce((s, tc) => s + tc.studentCount, 0), []);

  const allGrades = useMemo(() =>
    Object.values(CLASS_GRADES).flat().flatMap((g) =>
      [g.bimester1, g.bimester2, g.bimester3, g.bimester4].filter((v): v is number => v !== undefined)
    ), []);
  const networkAvg = useMemo(() =>
    allGrades.length ? allGrades.reduce((a, b) => a + b, 0) / allGrades.length : 0, [allGrades]);

  const approvalRate = useMemo(() => {
    const students = Object.values(CLASS_GRADES).flat();
    const approved = students.filter((g) => {
      const vals = [g.bimester1, g.bimester2].filter((v): v is number => v !== undefined);
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      return avg >= 70;
    }).length;
    return students.length ? (approved / students.length) * 100 : 0;
  }, []);

  const atRisk = useMemo(() =>
    Object.values(CLASS_GRADES).flat().filter((g) => {
      const vals = [g.bimester1, g.bimester2].filter((v): v is number => v !== undefined);
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      return avg > 0 && avg < 70;
    }).length, []);

  const QUICK_ACTIONS = [
    { href: "/dashboard/navegador/comunicados", icon: "📢", label: "Novo Comunicado", color: "#f0c040", bg: "rgba(240,192,64,0.12)" },
    { href: "/dashboard/navegador/desempenho",  icon: "🤖", label: "Análise IA",      color: "#a78bfa", bg: "rgba(139,92,246,0.12)" },
    { href: "/dashboard/navegador/bncc",        icon: "🎯", label: "Mapear BNCC",     color: "#34d399", bg: "rgba(52,211,153,0.12)" },
    { href: "/dashboard/navegador/atividades",  icon: "📋", label: "Ver Expedições",  color: "#60a5fa", bg: "rgba(59,130,246,0.12)" },
  ];

  if (!hydrated) return null;
  if (!isDemoUser(user)) return <NonDemoPlaceholder role="pedagogico" />;

  return (
    <div className="p-6 space-y-6">
      {/* Hero */}
      <div className="relative rounded-2xl px-6 py-5 overflow-hidden"
        style={{ background: "linear-gradient(135deg,#1b3a8f,#0a1638)", border: "1px solid rgba(240,192,64,0.2)" }}>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10 text-9xl pointer-events-none select-none">🧭</div>
        <p className="text-sm" style={{ color: "rgba(240,192,64,0.7)" }}>Painel Pedagógico</p>
        <h2 className="text-2xl font-bold text-white mt-0.5" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
          Centro de Navegação
        </h2>
        <div className="flex gap-3 mt-4 flex-wrap">
          {[
            { icon: "👨‍🚀", label: "Cosmonautas",    value: totalStudents,            color: "#f0c040" },
            { icon: "🚀",   label: "Turmas Ativas",  value: TEACHER_CLASSES.length,   color: "#60a5fa" },
            { icon: "📊",   label: "Média da Rede",  value: networkAvg.toFixed(1),    color: scoreColor(networkAvg) },
            { icon: "✅",   label: "Aprovação",      value: `${approvalRate.toFixed(0)}%`, color: "#34d399" },
            { icon: "⚠️",  label: "Em Risco",       value: atRisk,                   color: "#f87171" },
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
        {QUICK_ACTIONS.map((a) => (
          <Link key={a.href} href={a.href}
            className="flex flex-col items-center gap-2 py-4 rounded-2xl text-sm font-semibold transition-all duration-200 text-center"
            style={{ background: a.bg, color: a.color, border: `1px solid ${a.color}25` }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
            <span className="text-2xl">{a.icon}</span>
            {a.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Turmas overview */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">🚀 Turmas Ativas</h3>
            <Link href="/dashboard/navegador/turmas" className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Ver todas →</Link>
          </div>
          <div className="space-y-2">
            {TEACHER_CLASSES.map((tc) => {
              const grades = CLASS_GRADES[tc.id] ?? [];
              const vals   = grades.flatMap((g) => [g.bimester1, g.bimester2].filter((v): v is number => v !== undefined));
              const avg    = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
              return (
                <Link key={tc.id} href={`/dashboard/piloto/turmas/${tc.id}`}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}>
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: `${tc.subjectColor}15` }}>
                    {tc.subjectIcon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{tc.name}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{tc.studentCount} alunos · {tc.subjectName}</p>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-base font-bold" style={{ color: avg > 0 ? scoreColor(avg) : "rgba(255,255,255,0.2)" }}>
                      {avg > 0 ? avg.toFixed(1) : "—"}
                    </span>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>média</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* AI alert — at-risk students */}
        <section>
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            🤖 Alerta IA — Alunos em Risco
          </h3>
          <div className="rounded-2xl p-4 space-y-3"
            style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)" }}>
            {Object.values(CLASS_GRADES).flat().filter((g) => {
              const vals = [g.bimester1, g.bimester2].filter((v): v is number => v !== undefined);
              return vals.length && vals.reduce((a, b) => a + b, 0) / vals.length < 70;
            }).slice(0, 4).map((g) => {
              const vals = [g.bimester1, g.bimester2].filter((v): v is number => v !== undefined);
              const avg  = vals.reduce((a, b) => a + b, 0) / vals.length;
              return (
                <div key={g.studentId} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: "rgba(248,113,113,0.15)", color: "#f87171" }}>
                    {g.studentName.split(" ").map((n: string) => n[0]).join("").slice(0,2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{g.studentName}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {g.absences > 5 ? `⚠️ ${g.absences} faltas ` : ""}Média: {avg.toFixed(1)}
                    </p>
                  </div>
                  <span className="text-sm font-bold shrink-0" style={{ color: scoreColor(avg) }}>
                    {avg.toFixed(1)}
                  </span>
                </div>
              );
            })}
            {atRisk === 0 && (
              <p className="text-sm text-center py-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                ✅ Nenhum aluno em risco no momento.
              </p>
            )}
          </div>

          {/* Recent diary */}
          <h3 className="text-sm font-bold text-white mt-5 mb-3">📔 Últimas Entradas do Diário</h3>
          <div className="space-y-2">
            {DIARY_ENTRIES.slice(0, 2).map((e) => {
              const tc = TEACHER_CLASSES.find((c) => c.id === e.classId);
              return (
                <div key={e.id} className="px-4 py-3 rounded-xl"
                  style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.2)" }}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-semibold" style={{ color: "#a78bfa" }}>{tc?.name}</span>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                  <p className="text-xs line-clamp-2" style={{ color: "rgba(255,255,255,0.55)" }}>{e.content}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
