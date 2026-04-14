"use client";

const UNITS = [
  { name: "Unidade Centro",  avg: 82.4, students: 420, approval: 88 },
  { name: "Unidade Norte",   avg: 79.8, students: 310, approval: 82 },
  { name: "Unidade Oeste",   avg: 84.1, students: 275, approval: 91 },
  { name: "Unidade Sul",     avg: 77.3, students: 190, approval: 79 },
  { name: "Unidade Leste",   avg: 81.0, students: 140, approval: 85 },
];

function scoreColor(v: number) {
  return v >= 85 ? "#34d399" : v >= 70 ? "#fbbf24" : "#f87171";
}

const NETWORK_AVG = UNITS.reduce((s, u) => s + u.avg, 0) / UNITS.length;
const NETWORK_STUDENTS = UNITS.reduce((s, u) => s + u.students, 0);
const NETWORK_APPROVAL = UNITS.reduce((s, u) => s + u.approval, 0) / UNITS.length;

export default function GeneralRelatoriosPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
          Relatórios da Rede
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
          Dados consolidados — todas as unidades
        </p>
      </div>

      {/* Network KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: "👨‍🚀", label: "Alunos na Rede",    value: NETWORK_STUDENTS,              color: "#60a5fa" },
          { icon: "📊",  label: "Média da Rede",     value: NETWORK_AVG.toFixed(1),        color: scoreColor(NETWORK_AVG) },
          { icon: "✅",  label: "Taxa de Aprovação",  value: `${NETWORK_APPROVAL.toFixed(0)}%`, color: "#34d399" },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center py-5 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="text-2xl mb-2">{s.icon}</span>
            <p className="text-2xl font-bold" style={{ color: s.color, fontFamily: "'Space Grotesk',sans-serif" }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Per-unit comparison */}
      <section>
        <h2 className="text-sm font-bold text-white mb-3">📊 Comparativo por Unidade</h2>
        <div className="space-y-3">
          {[...UNITS].sort((a, b) => b.avg - a.avg).map((u, i) => (
            <div key={u.name} className="px-4 py-4 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-3 mb-2">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: i === 0 ? "rgba(240,192,64,0.2)" : "rgba(255,255,255,0.07)", color: i === 0 ? "#f0c040" : "rgba(255,255,255,0.4)" }}>
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-semibold text-white">{u.name}</p>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{u.students} alunos</span>
                      <span className="text-xs font-semibold" style={{ color: "#34d399" }}>{u.approval}% aprovação</span>
                      <span className="text-base font-bold" style={{ color: scoreColor(u.avg) }}>{u.avg.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                    <div className="h-2 rounded-full transition-all duration-700"
                      style={{ width: `${u.avg}%`, background: scoreColor(u.avg) }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Export */}
      <div className="flex gap-3 pt-2">
        <button className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm"
          style={{ background: "rgba(96,165,250,0.12)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.25)" }}>
          📥 Exportar PDF
        </button>
        <button className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm"
          style={{ background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.2)" }}>
          📊 Exportar Excel
        </button>
      </div>
    </div>
  );
}
