"use client";

import { useMemo } from "react";
import { alunosApi } from "../../../_lib/api";
import { useQuery } from "../../../_lib/useQuery";

interface Filho { id: string; name: string; classes: string; }
interface FreqRow {
  subject_id: string;
  subject_name: string;
  subject_color: string;
  presencas: number;
  faltas: number;
  justificadas: number;
  total: number;
  percentual: number;
}

const STATUS_CONFIG = {
  presente:    { label: "Presente",    color: "#34d399", bg: "rgba(52,211,153,0.12)",  icon: "✅" },
  falta:       { label: "Falta",       color: "#f87171", bg: "rgba(248,113,113,0.12)", icon: "❌" },
  justificada: { label: "Justificada", color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  icon: "📝" },
};

export default function FrequenciaPage() {
  const { data: filho } = useQuery<Filho>(
    () => alunosApi.getFilho() as Promise<Filho>,
    []
  );

  const { data: freq, loading } = useQuery<FreqRow[]>(
    filho ? () => alunosApi.getFrequencia(filho.id) as Promise<FreqRow[]> : null,
    [filho?.id]
  );

  const totals = useMemo(() => {
    if (!freq) return { total: 0, present: 0, just: 0, absences: 0, rate: 100 };
    const total    = freq.reduce((s, r) => s + Number(r.total), 0);
    const present  = freq.reduce((s, r) => s + Number(r.presencas), 0);
    const just     = freq.reduce((s, r) => s + Number(r.justificadas), 0);
    const absences = freq.reduce((s, r) => s + Number(r.faltas), 0);
    const rate     = total ? (present / total) * 100 : 100;
    return { total, present, just, absences, rate };
  }, [freq]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Frequência</h1>
        <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
          {filho ? `${filho.name} — ${filho.classes || "…"}` : "Carregando…"}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: "📊", label: "Freq. Geral",  value: `${totals.rate.toFixed(0)}%`,  color: totals.rate >= 75 ? "#34d399" : "#f87171" },
          { icon: "✅", label: "Presenças",    value: totals.present,                 color: "#34d399" },
          { icon: "❌", label: "Faltas",       value: totals.absences,                color: totals.absences > 5 ? "#f87171" : "#fbbf24" },
          { icon: "📝", label: "Justificadas", value: totals.just,                    color: "#fbbf24" },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center py-4 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <span className="text-xl mb-1">{s.icon}</span>
            <p className="text-xl font-bold" style={{ color: s.color, fontFamily: "'Space Grotesk',sans-serif" }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Per subject */}
      <section>
        <h2 className="text-sm font-bold text-white mb-3">Por Disciplina</h2>

        {loading && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto"
              style={{ borderColor: "#f0c040", borderTopColor: "transparent" }} />
          </div>
        )}

        {!loading && (!freq || freq.length === 0) && (
          <p className="text-sm text-center py-8" style={{ color: "rgba(255,255,255,0.4)" }}>
            Nenhum registro de frequência ainda.
          </p>
        )}

        {!loading && freq && freq.length > 0 && (
          <div className="space-y-3">
            {freq.map((row) => {
              const rate = Number(row.percentual);
              return (
                <div key={row.subject_id} className="px-4 py-4 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                      style={{ background: row.subject_color }} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-white">{row.subject_name}</p>
                        <span className="text-sm font-bold"
                          style={{ color: rate >= 75 ? "#34d399" : "#f87171" }}>
                          {rate.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                        <div className="h-2 rounded-full transition-all duration-700"
                          style={{ width: `${rate}%`, background: rate >= 75 ? "#34d399" : "#f87171" }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span style={{ color: "#34d399" }}>✅ {row.presencas} presenças</span>
                    {Number(row.faltas) > 0 && <span style={{ color: "#f87171" }}>❌ {row.faltas} faltas</span>}
                    {Number(row.justificadas) > 0 && <span style={{ color: "#fbbf24" }}>📝 {row.justificadas} justificada{Number(row.justificadas) > 1 ? "s" : ""}</span>}
                    <span style={{ color: "rgba(255,255,255,0.3)" }}>{row.total} aulas total</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Limit warning */}
      <div className="px-4 py-3 rounded-xl flex items-center gap-3"
        style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
        <span className="text-xl">ℹ️</span>
        <div>
          <p className="text-sm font-semibold" style={{ color: "#fbbf24" }}>Limite de Faltas</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
            O limite máximo é 25% de faltas por disciplina. Acima disso, o aluno fica em situação de reprovação por frequência.
          </p>
        </div>
      </div>
    </div>
  );
}
