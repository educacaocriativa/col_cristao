"use client";

import { useMemo, useState } from "react";
import { alunosApi } from "../../../_lib/api";
import { useQuery } from "../../../_lib/useQuery";
import { getScoreColor } from "../../_lib/dashboardUtils";

interface GradeRow {
  bimester: number;
  score: number | null;
  final_score: number | null;
  subject_id: string;
  subject_name: string;
  subject_color: string;
  class_name: string;
}

interface SubjectSummary {
  subject_id: string;
  subject_name: string;
  subject_color: string;
  b1: number | null;
  b2: number | null;
  b3: number | null;
  b4: number | null;
  average: number | null;
}

function ScoreCell({ value }: { value: number | null }) {
  if (value === null) return <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>;
  return <span className="font-bold" style={{ color: getScoreColor(value) }}>{value.toFixed(1)}</span>;
}

function ProgressBar({ value }: { value: number | null }) {
  if (value === null) return null;
  return (
    <div className="w-full rounded-full h-1.5 mt-1" style={{ background: "rgba(255,255,255,0.1)" }}>
      <div className="h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${value}%`, background: getScoreColor(value) }} />
    </div>
  );
}

export default function NotasPage() {
  const [activeBimester, setActiveBimester] = useState<number | "all">("all");

  const { data: grades, loading, error } = useQuery<GradeRow[]>(
    () => alunosApi.getNotas("me") as Promise<GradeRow[]>,
    []
  );

  const subjects = useMemo<SubjectSummary[]>(() => {
    if (!grades) return [];
    const map = new Map<string, SubjectSummary>();
    grades.forEach((g) => {
      if (!map.has(g.subject_id)) {
        map.set(g.subject_id, {
          subject_id: g.subject_id,
          subject_name: g.subject_name,
          subject_color: g.subject_color,
          b1: null, b2: null, b3: null, b4: null, average: null,
        });
      }
      const s = map.get(g.subject_id)!;
      const val = g.final_score ?? g.score;
      if (g.bimester === 1) s.b1 = val;
      else if (g.bimester === 2) s.b2 = val;
      else if (g.bimester === 3) s.b3 = val;
      else if (g.bimester === 4) s.b4 = val;
    });
    // compute averages
    map.forEach((s) => {
      const vals = [s.b1, s.b2, s.b3, s.b4].filter((v): v is number => v !== null);
      s.average = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    });
    return [...map.values()];
  }, [grades]);

  const stats = useMemo(() => {
    if (!subjects.length) return [];
    const avgs = subjects.map((s) => s.average).filter((v): v is number => v !== null);
    const overall = avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : 0;
    const best = subjects.reduce((a, b) => ((a.average ?? 0) > (b.average ?? 0) ? a : b), subjects[0]);
    const b1vals = subjects.map((s) => s.b1).filter((v): v is number => v !== null);
    const b2vals = subjects.map((s) => s.b2).filter((v): v is number => v !== null);
    const b1avg = b1vals.length ? b1vals.reduce((a, b) => a + b, 0) / b1vals.length : 0;
    const b2avg = b2vals.length ? b2vals.reduce((a, b) => a + b, 0) / b2vals.length : 0;
    return [
      { label: "Média Geral",    value: overall.toFixed(1),       icon: "⭐", color: "#34d399" },
      { label: "Melhor Missão",  value: best?.subject_name ?? "—", icon: "🏆", color: "#f0c040" },
      { label: "1º Bimestre",   value: b1avg.toFixed(1),          icon: "📊", color: "#60a5fa" },
      { label: "2º Bimestre",   value: b2avg.toFixed(1),          icon: "📈", color: "#a78bfa" },
    ];
  }, [subjects]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "#f0c040", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl px-4 py-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{stat.icon}</span>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{stat.label}</p>
            </div>
            <p className="text-2xl font-bold" style={{ color: stat.color, fontFamily: "'Space Grotesk', sans-serif" }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Bimester filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setActiveBimester("all")}
          className="px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
          style={{
            background: activeBimester === "all" ? "rgba(240,192,64,0.15)" : "rgba(255,255,255,0.04)",
            border: activeBimester === "all" ? "1px solid rgba(240,192,64,0.4)" : "1px solid rgba(255,255,255,0.07)",
            color: activeBimester === "all" ? "#f0c040" : "rgba(255,255,255,0.5)",
          }}>
          Todos os Bimestres
        </button>
        {[1, 2, 3, 4].map((b) => (
          <button key={b} onClick={() => setActiveBimester(b)}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
            style={{
              background: activeBimester === b ? "rgba(240,192,64,0.15)" : "rgba(255,255,255,0.04)",
              border: activeBimester === b ? "1px solid rgba(240,192,64,0.4)" : "1px solid rgba(255,255,255,0.07)",
              color: activeBimester === b ? "#f0c040" : "rgba(255,255,255,0.5)",
            }}>
            {b}º Bimestre
          </button>
        ))}
      </div>

      {/* Grades table */}
      {subjects.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="text-4xl">📊</span>
          <p className="text-sm font-semibold text-white">Nenhuma nota lançada ainda.</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="grid px-5 py-3 text-xs font-semibold"
            style={{
              gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr",
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.4)",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
            }}>
            <span>Missão (Disciplina)</span>
            <span className="text-center">1º Bim.</span>
            <span className="text-center">2º Bim.</span>
            <span className="text-center">3º Bim.</span>
            <span className="text-center">4º Bim.</span>
            <span className="text-center">Média</span>
          </div>

          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            {subjects.map((s) => {
              const bimVal = activeBimester === "all" ? null : (
                activeBimester === 1 ? s.b1 : activeBimester === 2 ? s.b2 : activeBimester === 3 ? s.b3 : s.b4
              );
              if (activeBimester !== "all" && bimVal === null) return null;
              return (
                <div key={s.subject_id}
                  className="grid px-5 py-4 items-center transition-colors duration-150"
                  style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.subject_color }} />
                    <div>
                      <p className="text-sm font-medium text-white">{s.subject_name}</p>
                      <ProgressBar value={s.average} />
                    </div>
                  </div>
                  <span className="text-sm text-center"><ScoreCell value={s.b1} /></span>
                  <span className="text-sm text-center"><ScoreCell value={s.b2} /></span>
                  <span className="text-sm text-center"><ScoreCell value={s.b3} /></span>
                  <span className="text-sm text-center"><ScoreCell value={s.b4} /></span>
                  <span className="text-sm text-center"><ScoreCell value={s.average} /></span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-6 flex-wrap">
        {[
          { color: "#34d399", label: "Excelente (≥ 85)" },
          { color: "#fbbf24", label: "Bom (70 – 84)" },
          { color: "#f87171", label: "Atenção (< 70)" },
          { color: "rgba(255,255,255,0.2)", label: "Não lançado" },
        ].map((leg) => (
          <div key={leg.label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: leg.color }} />
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{leg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
