"use client";

import { useEffect, useMemo, useState } from "react";
import { getStoredUser, isDemoUser, type AuthUser } from "../../../_lib/auth";
import { TEACHER_CLASSES, CLASS_GRADES, CLASS_STUDENTS } from "../../_components/teacherMockData";
import { MOCK_SUBJECTS } from "../../_components/mockData";
import NonDemoPlaceholder from "../../_components/NonDemoPlaceholder";

function scoreColor(v: number) {
  return v >= 85 ? "#34d399" : v >= 70 ? "#fbbf24" : "#f87171";
}

export default function RelatoriosPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    setHydrated(true);
  }, []);

  const allGrades = useMemo(() => Object.values(CLASS_GRADES).flat(), []);
  const allStudents = useMemo(() => Object.values(CLASS_STUDENTS).flat(), []);

  const bimesterAvgs = useMemo(() => [1,2,3,4].map((b) => {
    const key = `bimester${b}` as keyof typeof allGrades[0];
    const vals = allGrades.map((g) => g[key]).filter((v): v is number => v !== undefined);
    return { bimester: b, avg: vals.length ? vals.reduce((a,b) => a+b, 0) / vals.length : 0, count: vals.length };
  }), [allGrades]);

  const subjectPerf = useMemo(() =>
    TEACHER_CLASSES.map((tc) => {
      const grades = CLASS_GRADES[tc.id] ?? [];
      const vals   = grades.flatMap((g) => [g.bimester1, g.bimester2].filter((v): v is number => v !== undefined));
      const avg    = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      const atRisk = grades.filter((g) => {
        const v = [g.bimester1, g.bimester2].filter((x): x is number => x !== undefined);
        return v.length && v.reduce((a,b) => a+b, 0) / v.length < 70;
      }).length;
      return { ...tc, avg, atRisk };
    }), []);

  const networkAvg = useMemo(() => {
    const vals = allGrades.flatMap((g) => [g.bimester1, g.bimester2].filter((v): v is number => v !== undefined));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }, [allGrades]);

  if (!hydrated) return null;
  if (!isDemoUser(user)) return <NonDemoPlaceholder role="admin" />;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
          Relatórios
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
          Desempenho da unidade — Unidade Centro
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: "👨‍🚀", label: "Alunos",       value: allStudents.length,     color: "#60a5fa" },
          { icon: "📊",  label: "Média Geral",  value: networkAvg.toFixed(1),  color: scoreColor(networkAvg) },
          { icon: "✅",  label: "Aprovados",    value: allGrades.filter((g) => { const v = [g.bimester1, g.bimester2].filter((x): x is number => x !== undefined); return v.length && v.reduce((a,b)=>a+b,0)/v.length >= 70; }).length, color: "#34d399" },
          { icon: "⚠️", label: "Em Risco",     value: allGrades.filter((g) => { const v = [g.bimester1, g.bimester2].filter((x): x is number => x !== undefined); return v.length && v.reduce((a,b)=>a+b,0)/v.length < 70; }).length, color: "#f87171" },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center py-3 rounded-xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <span className="text-xl mb-1">{s.icon}</span>
            <p className="text-xl font-bold" style={{ color: s.color, fontFamily: "'Space Grotesk',sans-serif" }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Bimester trend */}
      <section>
        <h2 className="text-sm font-bold text-white mb-3">📈 Evolução por Bimestre</h2>
        <div className="grid grid-cols-4 gap-3">
          {bimesterAvgs.map((b) => (
            <div key={b.bimester} className="px-4 py-4 rounded-2xl text-center"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>{b.bimester}º Bimestre</p>
              <p className="text-2xl font-bold" style={{ color: b.avg > 0 ? scoreColor(b.avg) : "rgba(255,255,255,0.2)", fontFamily: "'Space Grotesk',sans-serif" }}>
                {b.avg > 0 ? b.avg.toFixed(1) : "—"}
              </p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                {b.count > 0 ? `${b.count} notas` : "Sem dados"}
              </p>
              {b.avg > 0 && (
                <div className="mt-2 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${b.avg}%`, background: scoreColor(b.avg) }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Performance by class */}
      <section>
        <h2 className="text-sm font-bold text-white mb-3">🚀 Desempenho por Turma</h2>
        <div className="space-y-2">
          {subjectPerf.map((tc) => (
            <div key={tc.id} className="px-4 py-4 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">{tc.subjectIcon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-white">{tc.name}</p>
                    <div className="flex items-center gap-3">
                      {tc.atRisk > 0 && (
                        <span className="text-xs" style={{ color: "#f87171" }}>⚠️ {tc.atRisk} em risco</span>
                      )}
                      <span className="text-base font-bold" style={{ color: tc.avg > 0 ? scoreColor(tc.avg) : "rgba(255,255,255,0.2)" }}>
                        {tc.avg > 0 ? tc.avg.toFixed(1) : "—"}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                    <div className="h-2 rounded-full transition-all duration-700"
                      style={{ width: `${tc.avg}%`, background: tc.avg > 0 ? scoreColor(tc.avg) : "rgba(255,255,255,0.1)" }} />
                  </div>
                </div>
              </div>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                {tc.studentCount} alunos · {tc.subjectName}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Export button */}
      <div className="flex gap-3">
        <button className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm"
          style={{ background: "rgba(96,165,250,0.12)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.25)" }}>
          📥 Exportar PDF
        </button>
        <button className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm"
          style={{ background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.2)" }}>
          📊 Exportar Excel
        </button>
      </div>
    </div>
  );
}
