"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { alunosApi } from "../../../_lib/api";
import { useQuery } from "../../../_lib/useQuery";

interface ActivityRow {
  id: string;
  title: string;
  activity_type: string;
  bimester: number | null;
  subject_name: string;
  subject_color: string;
  status: string | null;
  final_score: number | null;
  finished_at: string | null;
}

const TYPE_CONFIG: Record<string, { label: string; icon: string; bg: string; color: string }> = {
  prova:     { label: "Prova",     icon: "📝", bg: "rgba(239,68,68,0.15)",  color: "#f87171" },
  atividade: { label: "Atividade", icon: "📋", bg: "rgba(59,130,246,0.15)", color: "#60a5fa" },
  simulado:  { label: "Simulado",  icon: "🎯", bg: "rgba(245,158,11,0.15)", color: "#fbbf24" },
  tarefa:    { label: "Tarefa",    icon: "✏️",  bg: "rgba(16,185,129,0.15)", color: "#34d399" },
  leitura:   { label: "Leitura",   icon: "📖", bg: "rgba(139,92,246,0.15)", color: "#a78bfa" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:     { label: "Pendente",     color: "#fbbf24" },
  in_progress: { label: "Em Andamento", color: "#60a5fa" },
  completed:   { label: "Concluída",    color: "#34d399" },
  late:        { label: "Atrasada",     color: "#f87171" },
};

const STATUS_TABS = [
  { key: "all",       label: "Todas",        icon: "🗂️" },
  { key: "pending",   label: "Pendentes",    icon: "⏳" },
  { key: "completed", label: "Concluídas",   icon: "✅" },
];

export default function ExpeditationsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter,   setTypeFilter]   = useState("all");
  const [search, setSearch]             = useState("");

  const { data: activities, loading, error } = useQuery<ActivityRow[]>(
    () => alunosApi.getAtividades("me") as Promise<ActivityRow[]>,
    []
  );

  const filtered = useMemo(() => {
    if (!activities) return [];
    return activities.filter((a) => {
      const st = a.status ?? "pending";
      if (statusFilter !== "all" && st !== statusFilter) return false;
      if (typeFilter   !== "all" && a.activity_type !== typeFilter) return false;
      if (search && !a.title.toLowerCase().includes(search.toLowerCase()) &&
          !a.subject_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [activities, statusFilter, typeFilter, search]);

  const counts = useMemo(() => ({
    all:       activities?.length ?? 0,
    pending:   activities?.filter((a) => !a.status || a.status === "pending").length ?? 0,
    completed: activities?.filter((a) => a.status === "completed").length ?? 0,
  }), [activities]);

  return (
    <div className="p-6 space-y-5">
      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((tab) => {
          const count = counts[tab.key as keyof typeof counts] ?? 0;
          const isActive = statusFilter === tab.key;
          return (
            <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150"
              style={{
                background: isActive ? "rgba(240,192,64,0.15)" : "rgba(255,255,255,0.04)",
                border: isActive ? "1px solid rgba(240,192,64,0.4)" : "1px solid rgba(255,255,255,0.07)",
                color: isActive ? "#f0c040" : "rgba(255,255,255,0.5)",
              }}>
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: isActive ? "#f0c040" : "rgba(255,255,255,0.1)", color: isActive ? "#0a1638" : "rgba(255,255,255,0.6)" }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search + type filter */}
      <div className="flex gap-3 flex-wrap">
        <input type="text" placeholder="🔍  Buscar expedição…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 px-4 py-2.5 rounded-xl text-sm text-white outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
          onFocus={(e)  => { e.currentTarget.style.borderColor = "rgba(240,192,64,0.5)"; }}
          onBlur={(e)   => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm text-white outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <option value="all"       style={{ background: "#0a1638" }}>Todos os tipos</option>
          <option value="atividade" style={{ background: "#0a1638" }}>Atividades</option>
          <option value="prova"     style={{ background: "#0a1638" }}>Provas</option>
          <option value="simulado"  style={{ background: "#0a1638" }}>Simulados</option>
          <option value="tarefa"    style={{ background: "#0a1638" }}>Tarefas</option>
          <option value="leitura"   style={{ background: "#0a1638" }}>Leituras</option>
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto"
            style={{ borderColor: "#f0c040", borderTopColor: "transparent" }} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-8">
          <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>
        </div>
      )}

      {/* Results */}
      {!loading && !error && (
        filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <span className="text-5xl">🌌</span>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              Nenhuma expedição encontrada neste setor
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              {filtered.length} expedição{filtered.length !== 1 ? "ões" : ""} encontrada{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((act) => {
                const tc = TYPE_CONFIG[act.activity_type] ?? TYPE_CONFIG["atividade"];
                const sc = STATUS_LABELS[act.status ?? "pending"] ?? STATUS_LABELS["pending"];
                return (
                  <Link key={act.id}
                    href={`/dashboard/cosmonauta/expedicoes/${act.id}`}
                    className="block rounded-2xl p-4 transition-all duration-200"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                      (e.currentTarget as HTMLElement).style.borderColor = `${act.subject_color}40`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
                    }}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                          style={{ background: tc.bg }}>
                          {tc.icon}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: tc.bg, color: tc.color }}>
                          {tc.label}
                        </span>
                      </div>
                      <span className="text-xs font-medium px-2 py-1 rounded-full shrink-0"
                        style={{ background: `${sc.color}15`, color: sc.color }}>
                        {sc.label}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-white mb-1 line-clamp-2">{act.title}</h3>

                    <div className="flex items-center gap-1.5 mb-3">
                      <span className="w-2 h-2 rounded-full" style={{ background: act.subject_color }} />
                      <span className="text-xs" style={{ color: act.subject_color }}>{act.subject_name}</span>
                      {act.bimester && (
                        <>
                          <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>•</span>
                          <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{act.bimester}º Bim.</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      {act.final_score !== null ? (
                        <span className="text-xs font-bold" style={{ color: act.final_score >= 70 ? "#34d399" : "#f87171" }}>
                          Nota: {act.final_score}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Sem nota</span>
                      )}
                      <span className="text-xs font-semibold px-3 py-1.5 rounded-xl"
                        style={{ background: "#f0c040", color: "#0a1638" }}>
                        Acessar →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )
      )}
    </div>
  );
}
