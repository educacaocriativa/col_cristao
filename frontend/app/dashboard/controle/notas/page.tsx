"use client";

import { useMemo } from "react";
import { alunosApi } from "../../../_lib/api";
import { useQuery } from "../../../_lib/useQuery";
import { getScoreColor } from "../../_lib/dashboardUtils";

interface Filho { id: string; name: string; classes: string; }
interface GradeRow {
  bimester: number;
  score: number | null;
  final_score: number | null;
  subject_id: string;
  subject_name: string;
  subject_color: string;
}
interface SubjectSummary {
  subject_id: string;
  subject_name: string;
  subject_color: string;
  b1: number | null; b2: number | null; b3: number | null; b4: number | null;
  average: number | null;
}

function Badge({ v }: { v: number | null }) {
  if (v === null) return <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>;
  return <span className="text-sm font-bold" style={{ color: getScoreColor(v) }}>{v}</span>;
}

export default function ControleNotasPage() {
  const { data: filho } = useQuery<Filho>(
    () => alunosApi.getFilho() as Promise<Filho>,
    []
  );

  const { data: grades, loading } = useQuery<GradeRow[]>(
    filho ? () => alunosApi.getNotas(filho.id) as Promise<GradeRow[]> : null,
    [filho?.id]
  );

  const subjects = useMemo<SubjectSummary[]>(() => {
    if (!grades) return [];
    const map = new Map<string, SubjectSummary>();
    grades.forEach((g) => {
      if (!map.has(g.subject_id)) {
        map.set(g.subject_id, { subject_id: g.subject_id, subject_name: g.subject_name, subject_color: g.subject_color, b1: null, b2: null, b3: null, b4: null, average: null });
      }
      const s = map.get(g.subject_id)!;
      const val = g.final_score ?? g.score;
      if (g.bimester === 1) s.b1 = val;
      else if (g.bimester === 2) s.b2 = val;
      else if (g.bimester === 3) s.b3 = val;
      else if (g.bimester === 4) s.b4 = val;
    });
    map.forEach((s) => {
      const vals = [s.b1, s.b2, s.b3, s.b4].filter((v): v is number => v !== null);
      s.average = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    });
    return [...map.values()];
  }, [grades]);

  const overallAvg = useMemo(() => {
    const avgs = subjects.map((s) => s.average).filter((v): v is number => v !== null);
    return avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : 0;
  }, [subjects]);

  const best  = useMemo(() => [...subjects].sort((a, b) => (b.average ?? 0) - (a.average ?? 0))[0], [subjects]);
  const worst = useMemo(() => [...subjects].filter((s) => s.average !== null).sort((a, b) => (a.average ?? 0) - (b.average ?? 0))[0], [subjects]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Boletim Escolar</h1>
        <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
          {filho ? `${filho.name} — ${filho.classes || "…"}` : "Carregando…"}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: "📊", label: "Média Geral",   value: overallAvg > 0 ? overallAvg.toFixed(1) : "—", color: getScoreColor(overallAvg) },
          { icon: "🌟", label: "Melhor Matéria", value: best?.subject_name.split(" ")[0] ?? "—",       color: "#34d399" },
          { icon: "📚", label: "Atenção",        value: worst?.subject_name.split(" ")[0] ?? "—",      color: worst && (worst.average ?? 0) < 70 ? "#f87171" : "#fbbf24" },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center py-4 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <span className="text-xl mb-1">{s.icon}</span>
            <p className="text-xl font-bold" style={{ color: s.color, fontFamily: "'Space Grotesk',sans-serif" }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Grade table */}
      <section>
        <h2 className="text-sm font-bold text-white mb-3">Notas por Disciplina</h2>

        {loading && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto"
              style={{ borderColor: "#f0c040", borderTopColor: "transparent" }} />
          </div>
        )}

        {!loading && subjects.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: "rgba(255,255,255,0.4)" }}>
            Nenhuma nota lançada ainda.
          </p>
        )}

        {!loading && subjects.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="grid grid-cols-6 gap-2 px-4 py-2.5"
              style={{ background: "rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="col-span-2 text-xs font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>Disciplina</div>
              {["1º Bim.", "2º Bim.", "3º Bim.", "4º Bim."].map((b) => (
                <div key={b} className="text-xs font-semibold text-center" style={{ color: "rgba(255,255,255,0.4)" }}>{b}</div>
              ))}
              <div className="text-xs font-semibold text-center" style={{ color: "#f0c040" }}>Média</div>
            </div>
            {subjects.map((s) => (
              <div key={s.subject_id} className="grid grid-cols-6 gap-2 px-4 py-3 items-center"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="col-span-2 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.subject_color }} />
                  <p className="text-sm font-semibold text-white truncate">{s.subject_name}</p>
                </div>
                <div className="text-center"><Badge v={s.b1} /></div>
                <div className="text-center"><Badge v={s.b2} /></div>
                <div className="text-center"><Badge v={s.b3} /></div>
                <div className="text-center"><Badge v={s.b4} /></div>
                <div className="text-center">
                  <span className="text-sm font-bold"
                    style={{ color: s.average !== null ? getScoreColor(s.average) : "rgba(255,255,255,0.2)" }}>
                    {s.average !== null ? s.average.toFixed(1) : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap">
        {[
          { color: "#34d399", label: "Aprovado (≥85)" },
          { color: "#fbbf24", label: "Regular (70–84)" },
          { color: "#f87171", label: "Risco (<70)" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: l.color }} />
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
