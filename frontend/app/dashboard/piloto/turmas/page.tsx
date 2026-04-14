"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "../../../_lib/useQuery";
import { turmasApi, scheduleApi } from "../../../_lib/api";

const SHIFT_LABEL: Record<string, string> = {
  manha: "Manhã", tarde: "Tarde", noturno: "Noturno", integral: "Integral",
};
const SEGMENT_COLOR: Record<string, string> = {
  fundamental_i: "#60a5fa", fundamental_ii: "#a78bfa", medio: "#f0c040",
};

const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const PERIOD_LABELS = ["1ª Aula", "2ª Aula", "3ª Aula", "4ª Aula", "5ª Aula", "6ª Aula"];

interface Turma {
  id: string; name: string; full_name: string; shift: string;
  grade_level_name: string; segment: string; student_count: number; school_name: string;
}

interface WeekSlot {
  day_of_week: number; period: number;
  subject_id: string; subject_name: string; subject_color: string; subject_icon: string;
  class_id: string; class_name: string;
}

function getWeekDates(): Date[] {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function fmtDate(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function TurmasPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"semana" | "turmas">("semana");

  // Read ?tab= from URL on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("tab");
    if (t === "turmas" || t === "semana") setTab(t);
  }, []);
  const [search, setSearch] = useState("");

  const { data, loading } = useQuery<Turma[]>(
    () => turmasApi.list() as Promise<Turma[]>
  );

  const { data: weekSlots, loading: weekLoading } = useQuery<WeekSlot[]>(
    () => scheduleApi.week() as Promise<WeekSlot[]>,
    []
  );

  const turmas = data ?? [];
  const filtered = turmas.filter((t) =>
    t.full_name.toLowerCase().includes(search.toLowerCase()) ||
    t.grade_level_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalStudents = turmas.reduce((s, t) => s + (t.student_count ?? 0), 0);
  const weekDates = useMemo(() => getWeekDates(), []);

  // Build a lookup: day → period → slot
  const slotMap = useMemo(() => {
    const map: Record<string, WeekSlot> = {};
    (weekSlots ?? []).forEach((s) => { map[`${s.day_of_week}:${s.period}`] = s; });
    return map;
  }, [weekSlots]);

  // Today's day_of_week (1=Mon…6=Sat, 0=Sun)
  const todayDow = useMemo(() => {
    const d = new Date().getDay();
    return d === 0 ? 0 : d; // 0=Sun(no class), 1–6
  }, []);

  // Which periods actually have any slot this week
  const activePeriods = useMemo(() => {
    const set = new Set<number>();
    (weekSlots ?? []).forEach((s) => set.add(s.period));
    return Array.from({ length: 6 }, (_, i) => i + 1).filter((p) =>
      set.size === 0 || set.has(p)
    );
  }, [weekSlots]);

  function openChamada(slot: WeekSlot, dayIndex: number) {
    const date = fmtDate(weekDates[dayIndex]);
    router.push(
      `/dashboard/piloto/turmas/${slot.class_id}/chamada?date=${date}&subject_id=${slot.subject_id}`
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { icon: "🚀", label: "Turmas",      value: turmas.length,  color: "#60a5fa" },
          { icon: "👨‍🚀", label: "Cosmonautas", value: totalStudents, color: "#f0c040" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-3 px-4 py-4 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="text-xl font-bold leading-none" style={{ color: s.color, fontFamily: "'Space Grotesk',sans-serif" }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([["semana", "📅 Semana"], ["turmas", "🚀 Turmas"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150"
            style={{
              background: tab === key ? "rgba(240,192,64,0.2)" : "rgba(255,255,255,0.05)",
              color: tab === key ? "#f0c040" : "rgba(255,255,255,0.45)",
              border: `1px solid ${tab === key ? "rgba(240,192,64,0.4)" : "rgba(255,255,255,0.08)"}`,
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── WEEKLY CALENDAR TAB ─────────────────────────────── */}
      {tab === "semana" && (
        <>
          {weekLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "#f0c040", borderTopColor: "transparent" }} />
            </div>
          )}

          {!weekLoading && (weekSlots ?? []).length === 0 && (
            <div className="flex flex-col items-center gap-4 py-16 text-center rounded-2xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <span className="text-4xl">📅</span>
              <p className="text-sm font-bold text-white">Nenhuma aula agendada esta semana.</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                O Admin precisa configurar o cronograma de horários.
              </p>
            </div>
          )}

          {!weekLoading && (weekSlots ?? []).length > 0 && (
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: "3px" }}>
                <thead>
                  <tr>
                    <th className="text-left px-2 py-1" style={{ width: 64 }} />
                    {weekDates.map((d, i) => {
                      const isToday = todayDow === i + 1;
                      return (
                        <th key={i} className="text-center px-1 py-1 text-xs font-bold"
                          style={{ color: isToday ? "#f0c040" : "rgba(255,255,255,0.4)", minWidth: 90 }}>
                          <div>{DAY_LABELS[i]}</div>
                          <div className="text-xs font-normal" style={{ color: "rgba(255,255,255,0.25)" }}>
                            {d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {activePeriods.map((period) => (
                    <tr key={period}>
                      <td className="text-right pr-2 py-1">
                        <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.25)" }}>
                          {PERIOD_LABELS[period - 1]}
                        </span>
                      </td>
                      {weekDates.map((d, dayIdx) => {
                        const dow = dayIdx + 1; // 1=Mon
                        const slot = slotMap[`${dow}:${period}`];
                        const isToday = todayDow === dow;
                        if (!slot) {
                          return (
                            <td key={dayIdx} className="px-1 py-1">
                              <div className="h-14 rounded-xl"
                                style={{
                                  background: isToday ? "rgba(240,192,64,0.04)" : "rgba(255,255,255,0.02)",
                                  border: `1px solid ${isToday ? "rgba(240,192,64,0.1)" : "rgba(255,255,255,0.05)"}`,
                                }} />
                            </td>
                          );
                        }
                        return (
                          <td key={dayIdx} className="px-1 py-1">
                            <button
                              onClick={() => openChamada(slot, dayIdx)}
                              className="w-full h-14 rounded-xl flex flex-col items-start justify-center px-2 text-left transition-all duration-150 hover:scale-105"
                              style={{
                                background: `${slot.subject_color}18`,
                                border: `1px solid ${slot.subject_color}40`,
                              }}>
                              <span className="text-xs font-bold leading-tight truncate w-full"
                                style={{ color: slot.subject_color }}>
                                {slot.subject_icon} {slot.subject_name}
                              </span>
                              <span className="text-xs leading-tight truncate w-full"
                                style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>
                                {slot.class_name.split("|").pop()?.trim()}
                              </span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Legend: today's classes list */}
          {!weekLoading && todayDow >= 1 && todayDow <= 6 && (
            (() => {
              const todayClasses = activePeriods
                .map((p) => slotMap[`${todayDow}:${p}`])
                .filter(Boolean);
              if (!todayClasses.length) return null;
              return (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-3"
                    style={{ color: "rgba(255,255,255,0.3)" }}>
                    Suas Aulas Hoje
                  </h3>
                  <div className="space-y-2">
                    {todayClasses.map((slot, i) => (
                      <button key={i}
                        onClick={() => openChamada(slot, todayDow - 1)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-150 hover:scale-[1.01]"
                        style={{ background: `${slot.subject_color}12`, border: `1px solid ${slot.subject_color}30` }}>
                        <span className="text-lg">{slot.subject_icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate" style={{ color: slot.subject_color }}>
                            {slot.subject_name}
                          </p>
                          <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
                            {slot.class_name} · {PERIOD_LABELS[activePeriods.indexOf(activePeriods.find((p) => slotMap[`${todayDow}:${p}`] === slot)!) ?? 0]}
                          </p>
                        </div>
                        <span className="text-xs px-3 py-1.5 rounded-lg font-semibold shrink-0"
                          style={{ background: `${slot.subject_color}20`, color: slot.subject_color }}>
                          📋 Chamada →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()
          )}
        </>
      )}

      {/* ── TURMAS LIST TAB ──────────────────────────────────── */}
      {tab === "turmas" && (
        <>
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>🔍</span>
            <input type="text" placeholder="Buscar turma..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-3">
                <div className="text-3xl animate-spin inline-block">🔄</div>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Carregando turmas...</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="text-3xl mb-3">🚀</div>
              <p className="text-sm text-white">Nenhuma turma encontrada.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((tc) => {
                const segColor = SEGMENT_COLOR[tc.segment] ?? "#60a5fa";
                return (
                  <div key={tc.id} className="rounded-2xl overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="px-5 py-4 flex items-center gap-4"
                      style={{ background: `linear-gradient(135deg, ${segColor}18, ${segColor}08)`, borderBottom: `1px solid ${segColor}20` }}>
                      <span className="text-3xl">🚀</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white">{tc.full_name}</h3>
                        <p className="text-xs" style={{ color: segColor }}>
                          {SHIFT_LABEL[tc.shift] ?? tc.shift} · {tc.student_count} alunos
                        </p>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: `${segColor}20`, color: segColor }}>
                        {tc.grade_level_name}
                      </span>
                    </div>
                    <div className="px-5 py-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { href: `/dashboard/piloto/turmas/${tc.id}`,        icon: "📊", label: "Visão Geral", color: "#60a5fa", bg: "rgba(59,130,246,0.12)" },
                          { href: `/dashboard/piloto/turmas/${tc.id}/chamada`, icon: "📋", label: "Chamada",     color: "#f0c040", bg: "rgba(240,192,64,0.12)" },
                          { href: `/dashboard/piloto/turmas/${tc.id}/notas`,   icon: "⭐", label: "Notas",       color: "#34d399", bg: "rgba(52,211,153,0.12)" },
                          { href: `/dashboard/piloto/turmas/${tc.id}/diario`,  icon: "📔", label: "Diário",      color: "#a78bfa", bg: "rgba(139,92,246,0.12)" },
                        ].map((btn) => (
                          <Link key={btn.href} href={btn.href}
                            className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-semibold transition-all duration-150"
                            style={{ background: btn.bg, color: btn.color }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
                            <span className="text-lg">{btn.icon}</span>
                            {btn.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
