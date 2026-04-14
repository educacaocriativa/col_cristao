"use client";

import Link from "next/link";
import { useQuery } from "../../../_lib/useQuery";
import { atividadesApi } from "../../../_lib/api";

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  atividade: { label: "Atividade", color: "#60a5fa", bg: "rgba(59,130,246,0.12)",  icon: "📝" },
  prova:     { label: "Prova",     color: "#f0c040", bg: "rgba(240,192,64,0.12)",  icon: "📋" },
  simulado:  { label: "Simulado",  color: "#a78bfa", bg: "rgba(139,92,246,0.12)",  icon: "🎯" },
  tarefa:    { label: "Tarefa",    color: "#34d399", bg: "rgba(52,211,153,0.12)",  icon: "📌" },
  leitura:   { label: "Leitura",   color: "#f97316", bg: "rgba(249,115,22,0.12)",  icon: "📖" },
};

interface Activity {
  id: string;
  title: string;
  activity_type: string;
  bimester: number | null;
  published: boolean;
  time_limit_minutes: number | null;
  available_until: string | null;
  max_score: number;
  subject_name: string;
  subject_color: string;
  class_name: string | null;
  question_count: number;
  created_at: string;
}

export default function AtividadesPage() {
  const { data, loading } = useQuery<Activity[]>(
    () => atividadesApi.list() as Promise<Activity[]>
  );

  const activities = data ?? [];

  const counts = (["atividade","prova","simulado","tarefa"] as const).map((t) => ({
    type: t, count: activities.filter(a => a.activity_type === t).length, ...TYPE_CONFIG[t],
  }));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            Expedições
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            Atividades, provas e simulados criados
          </p>
        </div>
        <Link href="/dashboard/piloto/atividades/nova"
          className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-150"
          style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif", boxShadow: "0 4px 20px rgba(240,192,64,0.35)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
          ✏️ Nova Expedição
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {counts.map(({ type, count, color, bg, label }) => (
          <div key={type} className="flex flex-col items-center py-3 rounded-xl"
            style={{ background: bg, border: `1px solid ${color}25` }}>
            <p className="text-xl font-bold" style={{ color, fontFamily: "'Space Grotesk',sans-serif" }}>{count}</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-3">
            <div className="text-3xl animate-spin inline-block">🔄</div>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Carregando expedições...</p>
          </div>
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-12 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-3xl mb-3">🚀</div>
          <p className="text-sm font-semibold text-white">Nenhuma expedição criada ainda.</p>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Crie sua primeira atividade clicando em "Nova Expedição".</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((act) => {
            const cfg = TYPE_CONFIG[act.activity_type] ?? TYPE_CONFIG.atividade;
            return (
              <div key={act.id}
                className="flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-150"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: cfg.bg }}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">{act.title}</p>
                    {!act.published && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
                        rascunho
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {act.subject_name}
                    {act.class_name ? ` • ${act.class_name}` : ""}
                    {" • "}{act.question_count} questões
                    {" • "}{act.max_score} pts
                    {act.time_limit_minutes ? ` • ${act.time_limit_minutes}min` : ""}
                    {act.bimester ? ` • ${act.bimester}º bim` : ""}
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                  style={{ background: cfg.bg, color: cfg.color }}>
                  {cfg.label}
                </span>
                {act.available_until && (
                  <span className="text-xs shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>
                    até {new Date(act.available_until).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </span>
                )}
                <Link href={`/dashboard/piloto/atividades/nova`}
                  className="text-xs px-3 py-2 rounded-lg font-semibold shrink-0 transition-all duration-150"
                  style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(240,192,64,0.15)"; (e.currentTarget as HTMLElement).style.color = "#f0c040"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)"; }}>
                  Editar
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
