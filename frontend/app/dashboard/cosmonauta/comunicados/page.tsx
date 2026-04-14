"use client";

import { useState } from "react";
import { useQuery } from "../../../_lib/useQuery";
import { comunicadosApi } from "../../../_lib/api";

const PRIORITY_CONFIG = {
  urgente:     { label: "Urgente",     color: "#f87171", bg: "rgba(248,113,113,0.1)",  icon: "🚨" },
  informativo: { label: "Informativo", color: "#60a5fa", bg: "rgba(96,165,250,0.1)",   icon: "ℹ️" },
  normal:      { label: "Normal",      color: "rgba(255,255,255,0.5)", bg: "rgba(255,255,255,0.05)", icon: "📢" },
};

type Priority = keyof typeof PRIORITY_CONFIG;

interface Comunicado {
  id: string;
  title: string;
  content: string;
  priority: Priority;
  published_at: string;
  creator_name: string;
  creator_role: string;
  read?: boolean;
}

export default function ComunicadosPage() {
  const { data: rawList, loading } = useQuery<Comunicado[]>(
    () => comunicadosApi.list() as Promise<Comunicado[]>
  );

  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | Priority>("all");

  const announcements = (rawList ?? []).map((a) => ({ ...a, read: readIds.has(a.id) }));
  const filtered = announcements.filter((a) => filter === "all" || a.priority === filter);
  const unread   = announcements.filter((a) => !a.read).length;

  function markRead(id: string) { setReadIds((prev) => new Set([...prev, id])); }
  function markAllRead() { setReadIds(new Set(announcements.map((a) => a.id))); }

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-48">
      <div className="text-center space-y-3">
        <div className="text-3xl animate-spin inline-block">🔄</div>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Carregando comunicados...</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            Comunicados
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            Avisos e informações da escola
          </p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead}
            className="text-xs px-4 py-2 rounded-xl font-semibold"
            style={{ background: "rgba(240,192,64,0.12)", color: "#f0c040", border: "1px solid rgba(240,192,64,0.25)" }}>
            ✓ Marcar todos como lidos
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "urgente", "informativo", "normal"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150"
            style={{
              background: filter === f ? (f === "all" ? "rgba(240,192,64,0.15)" : PRIORITY_CONFIG[f].bg) : "rgba(255,255,255,0.05)",
              color: filter === f ? (f === "all" ? "#f0c040" : PRIORITY_CONFIG[f].color) : "rgba(255,255,255,0.4)",
              border: `1px solid ${filter === f ? "rgba(240,192,64,0.3)" : "rgba(255,255,255,0.08)"}`,
            }}>
            {f === "all" ? `Todos (${announcements.length})` : `${PRIORITY_CONFIG[f].icon} ${PRIORITY_CONFIG[f].label}`}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-3xl mb-3">📭</div>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Nenhum comunicado encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ann) => {
            const cfg = PRIORITY_CONFIG[ann.priority] ?? PRIORITY_CONFIG.normal;
            const isOpen = selected === ann.id;
            return (
              <div key={ann.id} className="rounded-2xl overflow-hidden transition-all duration-200"
                style={{ background: cfg.bg, border: `1px solid ${cfg.color}25` }}>
                <button className="w-full px-5 py-4 text-left"
                  onClick={() => {
                    setSelected(isOpen ? null : ann.id);
                    if (!ann.read) markRead(ann.id);
                  }}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl shrink-0 mt-0.5">{cfg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-sm font-bold text-white">{ann.title}</h3>
                        {!ann.read && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#f0c040" }} />}
                      </div>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                        {ann.creator_name} · {new Date(ann.published_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                      {!isOpen && (
                        <p className="text-xs mt-1.5 line-clamp-1" style={{ color: "rgba(255,255,255,0.55)" }}>{ann.content}</p>
                      )}
                    </div>
                    <span className="text-xs shrink-0 mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>{isOpen ? "▲" : "▼"}</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1">
                    <div className="h-px mb-4" style={{ background: `${cfg.color}20` }} />
                    <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.8)" }}>{ann.content}</p>
                    <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Publicado por {ann.creator_name} em {new Date(ann.published_at).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
