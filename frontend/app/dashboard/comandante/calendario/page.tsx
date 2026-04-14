"use client";

import { useState } from "react";
import { MOCK_EVENTS, type CalendarEvent } from "../../_components/mockData";

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  prova:      { label: "Prova",        color: "#f87171", bg: "rgba(248,113,113,0.12)", icon: "📋" },
  atividade:  { label: "Atividade",    color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  icon: "📝" },
  feriado:    { label: "Feriado",      color: "#6b7280", bg: "rgba(107,114,128,0.12)", icon: "🏖" },
  evento:     { label: "Evento",       color: "#ec4899", bg: "rgba(236,72,153,0.12)",  icon: "🎉" },
  reuniao:    { label: "Reunião",      color: "#10b981", bg: "rgba(16,185,129,0.12)",  icon: "👥" },
  aula:       { label: "Aula",         color: "#f0c040", bg: "rgba(240,192,64,0.12)",  icon: "📚" },
  recesso:    { label: "Recesso",      color: "#a78bfa", bg: "rgba(139,92,246,0.12)",  icon: "🌙" },
};

export default function CalendarioPage() {
  const [events, setEvents] = useState<CalendarEvent[]>(MOCK_EVENTS);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate]   = useState("");
  const [newType, setNewType]   = useState<string>("evento");

  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));

  function addEvent() {
    if (!newTitle.trim() || !newDate) return;
    const cfg = TYPE_CONFIG[newType];
    setEvents((prev) => [...prev, {
      id: `e${Date.now()}`,
      title: newTitle.trim(),
      date: newDate,
      type: newType as CalendarEvent["type"],
      color: cfg.color,
      allDay: true,
    }]);
    setNewTitle(""); setNewDate(""); setAdding(false);
  }

  const grouped = sorted.reduce<Record<string, CalendarEvent[]>>((acc, e) => {
    const month = e.date.slice(0, 7);
    return { ...acc, [month]: [...(acc[month] ?? []), e] };
  }, {});

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            Calendário Escolar
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            Datas e eventos da unidade
          </p>
        </div>
        <button onClick={() => setAdding(true)}
          className="px-5 py-3 rounded-xl font-bold text-sm"
          style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif" }}>
          + Novo Evento
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: "rgba(240,192,64,0.05)", border: "1px solid rgba(240,192,64,0.2)" }}>
          <h2 className="text-sm font-bold text-white">Novo Evento</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Título</label>
              <input type="text" placeholder="Nome do evento..." value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(240,192,64,0.25)" }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Data</label>
              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(240,192,64,0.25)" }}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: "rgba(255,255,255,0.5)" }}>Tipo</label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                <button key={key} onClick={() => setNewType(key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150"
                  style={{
                    background: newType === key ? cfg.bg : "rgba(255,255,255,0.05)",
                    color: newType === key ? cfg.color : "rgba(255,255,255,0.4)",
                    border: `1px solid ${newType === key ? cfg.color + "40" : "rgba(255,255,255,0.08)"}`,
                  }}>
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setAdding(false)}
              className="flex-1 py-3 rounded-xl font-semibold text-sm"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
              Cancelar
            </button>
            <button onClick={addEvent} disabled={!newTitle.trim() || !newDate}
              className="flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-150"
              style={{
                background: newTitle.trim() && newDate ? "linear-gradient(135deg,#f0c040,#eab308)" : "rgba(255,255,255,0.06)",
                color: newTitle.trim() && newDate ? "#0a1638" : "rgba(255,255,255,0.25)",
                fontFamily: "'Space Grotesk',sans-serif",
              }}>
              📅 Adicionar
            </button>
          </div>
        </div>
      )}

      {/* Events by month */}
      {Object.entries(grouped).map(([month, evts]) => (
        <section key={month}>
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
            {new Date(month + "-01T12:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </h2>
          <div className="space-y-2">
            {evts.map((e) => {
              const cfg = TYPE_CONFIG[e.type] ?? TYPE_CONFIG.evento;
              return (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.color}25` }}>
                  <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0"
                    style={{ background: `${cfg.color}20` }}>
                    <p className="text-sm font-bold leading-none" style={{ color: cfg.color }}>
                      {new Date(e.date + "T12:00:00").getDate()}
                    </p>
                    <p className="leading-none" style={{ color: `${cfg.color}80`, fontSize: "9px" }}>
                      {new Date(e.date + "T12:00:00").toLocaleString("pt-BR", { weekday: "short" }).toUpperCase().replace(".", "")}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{e.title}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {cfg.icon} {cfg.label}{e.time ? ` · ${e.time}` : " · Dia todo"}
                    </p>
                  </div>
                  <button onClick={() => setEvents((prev) => prev.filter((ev) => ev.id !== e.id))}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0"
                    style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>
                    🗑
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
