"use client";

import { useMemo, useState } from "react";

const BNCC_DATA = [
  { code: "EF04MA07", desc: "Reconhecer frações unitárias e não unitárias", discipline: "Matemática", color: "#3b82f6", year: "4º", coverage: 90, activities: 5 },
  { code: "EF04MA08", desc: "Identificar frações equivalentes", discipline: "Matemática", color: "#3b82f6", year: "4º", coverage: 85, activities: 4 },
  { code: "EF04MA09", desc: "Resolver problemas com frações", discipline: "Matemática", color: "#3b82f6", year: "4º", coverage: 70, activities: 3 },
  { code: "EF04LP01", desc: "Identificar a finalidade de textos de diferentes gêneros", discipline: "Português", color: "#8b5cf6", year: "4º", coverage: 72, activities: 3 },
  { code: "EF04LP02", desc: "Reconhecer elementos da narrativa", discipline: "Português", color: "#8b5cf6", year: "4º", coverage: 80, activities: 4 },
  { code: "EF04LP04", desc: "Usar recursos coesivos em produções textuais", discipline: "Português", color: "#8b5cf6", year: "4º", coverage: 55, activities: 2 },
  { code: "EF04CI01", desc: "Identificar características de seres vivos", discipline: "Ciências", color: "#10b981", year: "4º", coverage: 65, activities: 2 },
  { code: "EF04CI03", desc: "Relacionar o ciclo da água ao clima", discipline: "Ciências", color: "#10b981", year: "4º", coverage: 40, activities: 1 },
  { code: "EF04HI04", desc: "Identificar características do Brasil Colonial", discipline: "História", color: "#f59e0b", year: "4º", coverage: 88, activities: 4 },
  { code: "EF04LI01", desc: "Identificar vocabulário básico em inglês", discipline: "Inglês", color: "#6366f1", year: "4º", coverage: 75, activities: 3 },
];

const DISCIPLINES = ["Todas", "Matemática", "Português", "Ciências", "História", "Inglês"];

function scoreColor(v: number) {
  return v >= 80 ? "#34d399" : v >= 60 ? "#fbbf24" : "#f87171";
}

export default function BNCCPage() {
  const [discipline, setDiscipline] = useState("Todas");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() =>
    BNCC_DATA.filter((b) =>
      (discipline === "Todas" || b.discipline === discipline) &&
      (!search || b.code.toLowerCase().includes(search.toLowerCase()) || b.desc.toLowerCase().includes(search.toLowerCase()))
    ), [discipline, search]);

  const overallCoverage = useMemo(() => {
    return BNCC_DATA.reduce((s, b) => s + b.coverage, 0) / BNCC_DATA.length;
  }, []);

  const low = BNCC_DATA.filter((b) => b.coverage < 60).length;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
          BNCC e Habilidades
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
          Cobertura curricular por habilidade e disciplina
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: "🎯", label: "Habilidades",     value: BNCC_DATA.length,           color: "#60a5fa" },
          { icon: "📊", label: "Cobertura Média", value: `${overallCoverage.toFixed(0)}%`, color: scoreColor(overallCoverage) },
          { icon: "⚠️", label: "Baixa Cobertura", value: low,                         color: low > 0 ? "#f87171" : "#34d399" },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center py-3 rounded-xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <span className="text-xl mb-1">{s.icon}</span>
            <p className="text-xl font-bold" style={{ color: s.color, fontFamily: "'Space Grotesk',sans-serif" }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>🔍</span>
          <input type="text" placeholder="Buscar habilidade ou código..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30 outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
          />
        </div>
        {DISCIPLINES.map((d) => (
          <button key={d} onClick={() => setDiscipline(d)}
            className="px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150"
            style={{
              background: discipline === d ? "rgba(240,192,64,0.15)" : "rgba(255,255,255,0.05)",
              color: discipline === d ? "#f0c040" : "rgba(255,255,255,0.4)",
              border: `1px solid ${discipline === d ? "rgba(240,192,64,0.35)" : "rgba(255,255,255,0.08)"}`,
            }}>
            {d}
          </button>
        ))}
      </div>

      {/* Skills list */}
      <div className="space-y-2">
        {filtered.map((b) => (
          <div key={b.code} className="px-4 py-4 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-start gap-3 mb-3">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg shrink-0"
                style={{ background: `${b.color}15`, color: b.color }}>
                {b.code}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">{b.desc}</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {b.discipline} · {b.year} Ano · {b.activities} atividade{b.activities !== 1 ? "s" : ""}
                </p>
              </div>
              <span className="text-sm font-bold shrink-0" style={{ color: scoreColor(b.coverage) }}>
                {b.coverage}%
              </span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div className="h-1.5 rounded-full transition-all duration-700"
                style={{ width: `${b.coverage}%`, background: b.color }} />
            </div>
            {b.coverage < 60 && (
              <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "#fbbf24" }}>
                ⚠️ Cobertura baixa — criar mais atividades para esta habilidade
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
