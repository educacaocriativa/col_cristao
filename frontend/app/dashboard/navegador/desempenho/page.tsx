"use client";

import { useState } from "react";
import { relatoriosApi } from "../../../_lib/api";
import { useQuery } from "../../../_lib/useQuery";
import { getScoreColor } from "../../_lib/dashboardUtils";

interface ClassAvg  { class_id: string; class_name: string; average: number; student_count: number; approved: number; failing: number; }
interface SubjectAvg { subject_id: string; subject_name: string; color: string; average: number; failing_count: number; }
interface AtRisk    { id: string; student_name: string; class_name: string; failing_subjects: number; average: number; }

interface DesempenhoData {
  classAverages: ClassAvg[];
  subjectAverages: SubjectAvg[];
  atRiskStudents: AtRisk[];
}

export default function DesempenhoIAPage() {
  const [expandedClass, setExpandedClass] = useState<string | null>(null);

  const { data, loading, error } = useQuery<DesempenhoData>(
    () => relatoriosApi.desempenho() as Promise<DesempenhoData>,
    []
  );

  const totalStudents  = data?.classAverages.reduce((s, c) => s + Number(c.student_count), 0) ?? 0;
  const networkAvg     = data?.classAverages.length
    ? data.classAverages.reduce((s, c) => s + Number(c.average ?? 0), 0) / data.classAverages.length
    : 0;
  const atRiskTotal    = data?.atRiskStudents.length ?? 0;
  const approvedPct    = totalStudents
    ? (((totalStudents - atRiskTotal) / totalStudents) * 100).toFixed(0)
    : "0";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-2xl"
          style={{ background: "rgba(139,92,246,0.15)" }}>
          🤖
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            Análise de Desempenho
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            Diagnóstico por turma, disciplina e alunos em risco
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: "👨‍🚀", label: "Alunos",      value: loading ? "…" : totalStudents,                color: "#60a5fa" },
          { icon: "📊",  label: "Média Geral", value: loading ? "…" : networkAvg.toFixed(1),        color: getScoreColor(networkAvg) },
          { icon: "⚠️", label: "Em Risco",   value: loading ? "…" : atRiskTotal,                  color: atRiskTotal > 0 ? "#f87171" : "#34d399" },
          { icon: "✅",  label: "Aprovados",  value: loading ? "…" : `${approvedPct}%`,             color: "#34d399" },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center py-3 rounded-xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <span className="text-xl mb-1">{s.icon}</span>
            <p className="text-xl font-bold" style={{ color: s.color, fontFamily: "'Space Grotesk',sans-serif" }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {loading && (
        <div className="text-center py-10">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto"
            style={{ borderColor: "#a78bfa", borderTopColor: "transparent" }} />
        </div>
      )}

      {error && (
        <div className="text-center py-6">
          <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>
        </div>
      )}

      {!loading && data && (
        <>
          {/* Worst subjects */}
          {data.subjectAverages.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-white mb-3">Desempenho por Disciplina</h2>
              <div className="space-y-2">
                {data.subjectAverages.map((sub) => {
                  const avg = Number(sub.average);
                  return (
                    <div key={sub.subject_id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: sub.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-white">{sub.subject_name}</p>
                          <span className="text-sm font-bold" style={{ color: avg > 0 ? getScoreColor(avg) : "rgba(255,255,255,0.3)" }}>
                            {avg > 0 ? avg.toFixed(1) : "—"}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                          <div className="h-1.5 rounded-full"
                            style={{ width: `${avg}%`, background: avg > 0 ? getScoreColor(avg) : "rgba(255,255,255,0.1)" }} />
                        </div>
                      </div>
                      {Number(sub.failing_count) > 0 && (
                        <span className="text-xs shrink-0" style={{ color: "#f87171" }}>
                          ⚠️ {sub.failing_count} em risco
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Per class */}
          {data.classAverages.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-white mb-3">Análise por Turma</h2>
              <div className="space-y-3">
                {data.classAverages.map((cls) => {
                  const avg = Number(cls.average);
                  return (
                    <div key={cls.class_id} className="rounded-2xl overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <button className="w-full px-4 py-4 text-left flex items-center gap-3"
                        onClick={() => setExpandedClass(expandedClass === cls.class_id ? null : cls.class_id)}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">{cls.class_name}</p>
                          <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                            {cls.student_count} alunos · {cls.approved} aprovados · {cls.failing} em risco
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-bold" style={{ color: avg > 0 ? getScoreColor(avg) : "rgba(255,255,255,0.2)" }}>
                            {avg > 0 ? avg.toFixed(1) : "—"}
                          </p>
                        </div>
                        <span className="text-xs ml-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                          {expandedClass === cls.class_id ? "▲" : "▼"}
                        </span>
                      </button>

                      {expandedClass === cls.class_id && (
                        <div className="px-4 pb-4 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                          {/* At-risk students for this class */}
                          {data.atRiskStudents.filter((s) => s.class_name === cls.class_name).length > 0 && (
                            <>
                              <p className="text-xs font-bold uppercase tracking-widest pt-3 mb-2"
                                style={{ color: "#f87171" }}>
                                Alunos em Risco
                              </p>
                              <div className="space-y-2">
                                {data.atRiskStudents
                                  .filter((s) => s.class_name === cls.class_name)
                                  .map((s) => (
                                    <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                                      style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.2)" }}>
                                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                        style={{ background: "rgba(248,113,113,0.2)", color: "#f87171" }}>
                                        {s.student_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs text-white">{s.student_name}</p>
                                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                                          {s.failing_subjects} disciplina{Number(s.failing_subjects) > 1 ? "s" : ""} abaixo de 50
                                        </p>
                                      </div>
                                      <span className="text-sm font-bold shrink-0" style={{ color: "#f87171" }}>
                                        {Number(s.average).toFixed(1)}
                                      </span>
                                    </div>
                                  ))}
                              </div>

                              <div className="mt-3 px-3 py-3 rounded-xl flex gap-2"
                                style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
                                <span>🤖</span>
                                <div>
                                  <p className="text-xs font-bold" style={{ color: "#a78bfa" }}>Recomendação</p>
                                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                                    {data.atRiskStudents.filter((s) => s.class_name === cls.class_name).length} aluno(s) precisam de acompanhamento. Considere reforço e recuperação paralela.
                                  </p>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* At-risk overview */}
          {data.atRiskStudents.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <span>⚠️</span> Alunos em Situação de Risco
              </h2>
              <div className="space-y-2">
                {data.atRiskStudents.slice(0, 10).map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: "rgba(248,113,113,0.2)", color: "#f87171" }}>
                      {s.student_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{s.student_name}</p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {s.class_name} · {s.failing_subjects} disciplina{Number(s.failing_subjects) > 1 ? "s" : ""} abaixo de 50
                      </p>
                    </div>
                    <span className="text-sm font-bold shrink-0" style={{ color: "#f87171" }}>
                      {Number(s.average).toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
