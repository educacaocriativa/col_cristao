"use client";

import { useState } from "react";
import { MOCK_ANNOUNCEMENTS, type Announcement } from "./mockData";

const PRIORITY_CONFIG = {
  urgente:     { label: "Urgente",     color: "#f87171", bg: "rgba(248,113,113,0.1)",  icon: "🚨" },
  informativo: { label: "Informativo", color: "#60a5fa", bg: "rgba(96,165,250,0.1)",   icon: "ℹ️" },
  normal:      { label: "Normal",      color: "rgba(255,255,255,0.5)", bg: "rgba(255,255,255,0.06)", icon: "📢" },
};

interface Props {
  authorName: string;
  authorRole: string;
  canCreate?: boolean;
}

export default function ComunicadosManager({ authorName, authorRole, canCreate = true }: Props) {
  const [items, setItems]       = useState<Announcement[]>(MOCK_ANNOUNCEMENTS);
  const [creating, setCreating] = useState(false);
  const [title,    setTitle]    = useState("");
  const [content,  setContent]  = useState("");
  const [priority, setPriority] = useState<Announcement["priority"]>("normal");
  const [expanded, setExpanded] = useState<string | null>(null);

  function create() {
    if (!title.trim() || !content.trim()) return;
    setItems((prev) => [{
      id: `an${Date.now()}`,
      title: title.trim(),
      content: content.trim(),
      author: authorName,
      role: authorRole,
      date: new Date().toISOString().split("T")[0],
      priority,
      read: false,
    }, ...prev]);
    setTitle(""); setContent(""); setCreating(false);
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            Comunicados
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            {items.length} comunicado{items.length !== 1 ? "s" : ""} publicado{items.length !== 1 ? "s" : ""}
          </p>
        </div>
        {canCreate && (
          <button onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm"
            style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif", boxShadow: "0 4px 20px rgba(240,192,64,0.3)" }}>
            + Novo Comunicado
          </button>
        )}
      </div>

      {/* Create form */}
      {creating && (
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: "rgba(240,192,64,0.05)", border: "1px solid rgba(240,192,64,0.2)" }}>
          <h2 className="text-sm font-bold text-white">Novo Comunicado</h2>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Título *</label>
            <input type="text" placeholder="Título do comunicado..."
              value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(240,192,64,0.25)" }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Conteúdo *</label>
            <textarea rows={4} placeholder="Escreva o comunicado..."
              value={content} onChange={(e) => setContent(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(240,192,64,0.25)" }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: "rgba(255,255,255,0.5)" }}>Prioridade</label>
            <div className="flex gap-2">
              {(["normal", "informativo", "urgente"] as const).map((p) => {
                const cfg = PRIORITY_CONFIG[p];
                return (
                  <button key={p} onClick={() => setPriority(p)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150"
                    style={{
                      background: priority === p ? cfg.bg : "rgba(255,255,255,0.05)",
                      color: priority === p ? cfg.color : "rgba(255,255,255,0.4)",
                      border: `1px solid ${priority === p ? cfg.color + "40" : "rgba(255,255,255,0.08)"}`,
                    }}>
                    {cfg.icon} {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setCreating(false)}
              className="flex-1 py-3 rounded-xl font-semibold text-sm"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
              Cancelar
            </button>
            <button onClick={create} disabled={!title.trim() || !content.trim()}
              className="flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-150"
              style={{
                background: title.trim() && content.trim() ? "linear-gradient(135deg,#f0c040,#eab308)" : "rgba(255,255,255,0.06)",
                color: title.trim() && content.trim() ? "#0a1638" : "rgba(255,255,255,0.25)",
                fontFamily: "'Space Grotesk',sans-serif",
              }}>
              📢 Publicar
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {items.map((ann) => {
          const cfg   = PRIORITY_CONFIG[ann.priority];
          const isOpen = expanded === ann.id;
          return (
            <div key={ann.id} className="rounded-2xl overflow-hidden"
              style={{ background: cfg.bg, border: `1px solid ${cfg.color}25` }}>
              <div className="px-5 py-4 flex items-start gap-3">
                <span className="text-xl shrink-0 mt-0.5">{cfg.icon}</span>
                <div className="flex-1 min-w-0">
                  <button className="text-left w-full" onClick={() => setExpanded(isOpen ? null : ann.id)}>
                    <p className="text-sm font-bold text-white">{ann.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {ann.author} · {ann.role} · {new Date(ann.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </p>
                  </button>
                  {isOpen && (
                    <p className="text-sm mt-3 leading-relaxed" style={{ color: "rgba(255,255,255,0.8)" }}>
                      {ann.content}
                    </p>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => setExpanded(isOpen ? null : ann.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                    style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}>
                    {isOpen ? "▲" : "▼"}
                  </button>
                  {canCreate && (
                    <button onClick={() => remove(ann.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                      style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>
                      🗑
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
