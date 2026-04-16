"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getStoredUser, isDemoUser, type AuthUser } from "../../_lib/auth";
import { getGreeting } from "../_lib/dashboardUtils";
import CalendarWidget from "../_components/CalendarWidget";
import ActivityCard from "../_components/ActivityCard";
import NonDemoPlaceholder from "../_components/NonDemoPlaceholder";
import {
  MOCK_SUBJECTS, MOCK_ACTIVITIES, MOCK_EVENTS, MOCK_ANNOUNCEMENTS,
  type Announcement,
} from "../_components/mockData";

const PRIORITY_CONFIG = {
  urgente:      { label: "Urgente",     color: "#f87171", bg: "rgba(239,68,68,0.15)"   },
  informativo:  { label: "Info",        color: "#60a5fa", bg: "rgba(59,130,246,0.15)"  },
  normal:       { label: "Normal",      color: "#a3a3a3", bg: "rgba(163,163,163,0.1)"  },
};

function AnnouncementItem({ ann }: { ann: Announcement }) {
  const conf = PRIORITY_CONFIG[ann.priority];
  return (
    <div
      className="flex gap-3 px-4 py-3 rounded-xl transition-all duration-150 cursor-pointer"
      style={{
        background: ann.read ? "rgba(255,255,255,0.02)" : "rgba(240,192,64,0.06)",
        border: `1px solid ${ann.read ? "rgba(255,255,255,0.05)" : "rgba(240,192,64,0.15)"}`,
      }}
    >
      {!ann.read && (
        <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
          style={{ background: "#f0c040" }} />
      )}
      <div className={`flex-1 min-w-0 ${ann.read ? "pl-4" : ""}`}>
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span
            className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: conf.bg, color: conf.color }}
          >
            {conf.label}
          </span>
          <p className="text-xs font-semibold text-white truncate">{ann.title}</p>
        </div>
        <p className="text-xs line-clamp-2" style={{ color: "rgba(255,255,255,0.5)" }}>
          {ann.content}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            {ann.author}
          </span>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>•</span>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            {new Date(ann.date).toLocaleDateString("pt-BR")}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function CosmonaulaPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    setUser(getStoredUser());
    setHydrated(true);
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const pendingActivities = useMemo(
    () => MOCK_ACTIVITIES.filter((a) => a.status === "pending" || a.status === "in_progress"),
    []
  );
  const totalPending   = pendingActivities.length;
  const unreadAnnounc  = useMemo(() => MOCK_ANNOUNCEMENTS.filter((a) => !a.read).length, []);

  const greeting   = useMemo(() => getGreeting(), [currentTime]);
  const firstName  = user?.name?.split(" ")[0] ?? "Cosmonauta";

  if (!hydrated) return null;
  if (!isDemoUser(user)) return <NonDemoPlaceholder role="aluno" />;

  return (
    <div className="p-6 space-y-6">
      {/* ── HERO CARD ── */}
      <div
        className="relative rounded-2xl px-6 py-5 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1b3a8f 0%, #0a1638 100%)",
          border: "1px solid rgba(240,192,64,0.2)",
        }}
      >
        {/* Decoração orbital */}
        <div
          className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none select-none"
          style={{ fontSize: "120px", lineHeight: 1 }}
          aria-hidden="true"
        >
          🛸
        </div>
        <div>
          <p className="text-sm" style={{ color: "rgba(240,192,64,0.7)" }}>
            {greeting}, Cosmonauta
          </p>
          <h2
            className="text-2xl font-bold text-white mt-0.5"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {firstName}!
          </h2>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
            {currentTime.toLocaleDateString("pt-BR", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
            })}
          </p>
        </div>

        {/* Stats da missão */}
        <div className="flex gap-3 mt-4 flex-wrap">
          {[
            { icon: "📋", value: totalPending,     label: "Expedições Pendentes", color: "#fbbf24" },
            { icon: "🚀", value: MOCK_SUBJECTS.length, label: "Missões Ativas",      color: "#60a5fa" },
            { icon: "📢", value: unreadAnnounc,    label: "Comunicados Novos",    color: "#f0c040" },
            { icon: "⭐", value: "87",             label: "Média Geral",           color: "#34d399" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <span className="text-lg">{stat.icon}</span>
              <div>
                <p className="text-base font-bold leading-none" style={{ color: stat.color }}>
                  {stat.value}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)", fontSize: "10px" }}>
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── COLUNA ESQUERDA (2/3) ── */}
        <div className="xl:col-span-2 space-y-6">

          {/* Expedições Pendentes */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">📋</span>
                <h3 className="text-sm font-bold text-white">Expedições Pendentes</h3>
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(240,192,64,0.2)", color: "#f0c040" }}
                >
                  {totalPending}
                </span>
              </div>
              <Link
                href="/dashboard/cosmonauta/expedicoes"
                className="text-xs font-medium transition-colors duration-150"
                style={{ color: "rgba(255,255,255,0.4)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#f0c040"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}
              >
                Ver todas →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pendingActivities.slice(0, 4).map((act) => (
                <ActivityCard key={act.id} activity={act} />
              ))}
            </div>
          </section>

          {/* Minhas Missões (Disciplinas) */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🚀</span>
                <h3 className="text-sm font-bold text-white">Minhas Missões</h3>
              </div>
              <Link
                href="/dashboard/cosmonauta/missoes"
                className="text-xs font-medium transition-colors duration-150"
                style={{ color: "rgba(255,255,255,0.4)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#f0c040"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}
              >
                Ver todas →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {MOCK_SUBJECTS.map((subj) => (
                <Link
                  key={subj.id}
                  href={`/dashboard/cosmonauta/missoes/${subj.id}`}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-200 relative group"
                  style={{
                    background: `${subj.color}10`,
                    border: `1px solid ${subj.color}25`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = `${subj.color}20`;
                    (e.currentTarget as HTMLElement).style.borderColor = `${subj.color}50`;
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = `${subj.color}10`;
                    (e.currentTarget as HTMLElement).style.borderColor = `${subj.color}25`;
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  }}
                >
                  {subj.pendingActivities > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: "#f0c040", color: "#0a1638" }}
                    >
                      {subj.pendingActivities}
                    </span>
                  )}
                  <span className="text-2xl">{subj.icon}</span>
                  <p className="text-xs font-semibold text-center text-white leading-tight">
                    {subj.name}
                  </p>
                  <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.35)", fontSize: "10px" }}>
                    {subj.teacher}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* ── COLUNA DIREITA (1/3) ── */}
        <div className="space-y-5">

          {/* Calendário */}
          <div style={{ height: "420px" }}>
            <CalendarWidget events={MOCK_EVENTS} />
          </div>

          {/* Comunicados */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">📢</span>
                <h3 className="text-sm font-bold text-white">Comunicados</h3>
                {unreadAnnounc > 0 && (
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(240,192,64,0.2)", color: "#f0c040" }}
                  >
                    {unreadAnnounc} novos
                  </span>
                )}
              </div>
              <Link
                href="/dashboard/cosmonauta/comunicados"
                className="text-xs font-medium"
                style={{ color: "rgba(255,255,255,0.4)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#f0c040"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}
              >
                Ver todos →
              </Link>
            </div>
            <div className="space-y-2">
              {MOCK_ANNOUNCEMENTS.slice(0, 3).map((ann) => (
                <AnnouncementItem key={ann.id} ann={ann} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
