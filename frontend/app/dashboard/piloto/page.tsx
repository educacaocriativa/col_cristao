"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getStoredUser, isDemoUser, type AuthUser } from "../../_lib/auth";
import CalendarWidget from "../_components/CalendarWidget";
import NonDemoPlaceholder from "../_components/NonDemoPlaceholder";
import { TEACHER_CLASSES, DIARY_ENTRIES } from "../_components/teacherMockData";
import { MOCK_EVENTS } from "../_components/mockData";

// Key: JS getDay() index → schedule key used in TeacherClass.schedule
const WEEKDAY_INDEX: Record<number, string> = {
  0: "domingo", 1: "segunda", 2: "terça", 3: "quarta",
  4: "quinta",  5: "sexta",   6: "sábado",
};

// Abbreviated display labels for schedule keys
const WEEKDAY_SHORT: Record<string, string> = {
  segunda: "Seg", terça: "Ter", quarta: "Qua",
  quinta: "Qui",  sexta: "Sex", sábado: "Sáb",
};

export default function PilotoPage() {
  const [userName, setUserName] = useState("Professor");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const u = getStoredUser();
    setUser(u);
    if (u) setUserName(u.name.split(" ")[0]);
    setHydrated(true);
  }, []);

  const todayKey     = WEEKDAY_INDEX[new Date().getDay()];
  const todayClasses = useMemo(() => TEACHER_CLASSES.filter((tc) => tc.schedule[todayKey]), [todayKey]);
  const totalStudents = useMemo(() => TEACHER_CLASSES.reduce((s, tc) => s + tc.studentCount, 0), []);
  const totalPending  = useMemo(() => TEACHER_CLASSES.reduce((s, tc) => s + tc.pendingGrades, 0), []);

  if (!hydrated) return null;
  if (!isDemoUser(user)) return <NonDemoPlaceholder role="professor" />;

  return (
    <div className="p-6 space-y-6">

      <div
        className="relative rounded-2xl px-6 py-5 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1b3a8f 0%, #0a1638 100%)",
          border: "1px solid rgba(240,192,64,0.2)",
        }}
      >
        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10 text-9xl pointer-events-none select-none" aria-hidden>👨‍🚀</div>
        <p className="text-sm" style={{ color: "rgba(240,192,64,0.7)" }}>
          Bem-vindo ao cockpit, Piloto
        </p>
        <h2 className="text-2xl font-bold text-white mt-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Prof. {userName}
        </h2>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>

        <div className="flex gap-3 mt-4 flex-wrap">
          {[
            { icon: "🚀", value: TEACHER_CLASSES.length, label: "Módulos Ativos",   color: "#60a5fa" },
            { icon: "👨‍🚀", value: totalStudents,          label: "Cosmonautas",      color: "#f0c040" },
            { icon: "⭐", value: totalPending,            label: "Notas Pendentes",  color: "#f87171" },
            { icon: "📔", value: DIARY_ENTRIES.length,   label: "Entradas no Diário",color: "#34d399" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.08)" }}>
              <span className="text-lg">{s.icon}</span>
              <div>
                <p className="text-base font-bold leading-none" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)", fontSize: "10px" }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>


      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Esquerda */}
        <div className="xl:col-span-2 space-y-6">

          {/* Aulas de hoje */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">📅</span>
              <h3 className="text-sm font-bold text-white">Aulas de Hoje</h3>
              <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: "rgba(240,192,64,0.2)", color: "#f0c040" }}>
                {todayClasses.length}
              </span>
            </div>

            {todayClasses.length === 0 ? (
              <div className="flex items-center gap-3 px-4 py-4 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-2xl">🌙</span>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Sem aulas programadas para hoje. Aproveite para planejar!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {todayClasses.map((tc) => (
                  <Link key={tc.id} href={`/dashboard/piloto/turmas/${tc.id}`}
                    className="flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-200"
                    style={{ background: `${tc.subjectColor}10`, border: `1px solid ${tc.subjectColor}25` }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${tc.subjectColor}20`; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = `${tc.subjectColor}10`; }}
                  >
                    <span className="text-3xl">{tc.subjectIcon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">{tc.name}</p>
                      <p className="text-xs" style={{ color: tc.subjectColor }}>{tc.subjectName}</p>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {tc.schedule[todayKey]} • {tc.studentCount} alunos
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Link href={`/dashboard/piloto/turmas/${tc.id}/chamada`}
                        className="text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all duration-150"
                        style={{ background: "#f0c040", color: "#0a1638" }}
                        onClick={(e) => e.stopPropagation()}>
                        Chamada
                      </Link>
                      <Link href={`/dashboard/piloto/turmas/${tc.id}/diario`}
                        className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all duration-150"
                        style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
                        onClick={(e) => e.stopPropagation()}>
                        Diário
                      </Link>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Todos os módulos */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🚀</span>
                <h3 className="text-sm font-bold text-white">Todos os Módulos</h3>
              </div>
              <Link href="/dashboard/piloto/turmas" className="text-xs font-medium"
                style={{ color: "rgba(255,255,255,0.4)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#f0c040"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}>
                Ver todos →
              </Link>
            </div>

            <div className="space-y-2">
              {TEACHER_CLASSES.map((tc) => (
                <div key={tc.id}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl transition-colors duration-150"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
                >
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ background: `${tc.subjectColor}15` }}>
                    {tc.subjectIcon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{tc.name}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {tc.studentCount} cosmonautas
                      {tc.lastActivity && ` • Última: ${tc.lastActivity}`}
                    </p>
                  </div>
                  {/* Horários */}
                  <div className="hidden sm:flex gap-1 flex-wrap justify-end max-w-36">
                    {Object.entries(tc.schedule).map(([day, time]) => (
                      <span key={day} className="text-xs px-1.5 py-0.5 rounded-md"
                        style={{ background: `${tc.subjectColor}15`, color: tc.subjectColor }}>
                        {WEEKDAY_SHORT[day]} {time.split("–")[0]}
                      </span>
                    ))}
                  </div>
                  {/* Pending grades badge */}
                  {tc.pendingGrades > 0 && (
                    <span className="text-xs font-bold px-2 py-1 rounded-full shrink-0"
                      style={{ background: "rgba(248,113,113,0.2)", color: "#f87171" }}>
                      {tc.pendingGrades} notas
                    </span>
                  )}
                  {/* Quick actions */}
                  <div className="flex gap-1.5 shrink-0">
                    {[
                      { href: `/dashboard/piloto/turmas/${tc.id}/chamada`, label: "📋" },
                      { href: `/dashboard/piloto/turmas/${tc.id}/notas`,   label: "⭐" },
                      { href: `/dashboard/piloto/turmas/${tc.id}/diario`,  label: "📔" },
                    ].map((btn) => (
                      <Link key={btn.href} href={btn.href}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all duration-150"
                        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(240,192,64,0.15)"; (e.currentTarget as HTMLElement).style.color = "#f0c040"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)"; }}
                        title={btn.label}>
                        {btn.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Ações rápidas */}
          <section>
            <h3 className="text-sm font-bold text-white mb-3">Ações Rápidas</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { href: "/dashboard/piloto/atividades/nova",    icon: "✏️", label: "Nova Expedição",  color: "#f0c040", bg: "rgba(240,192,64,0.12)" },
                { href: "/dashboard/piloto/turmas?tab=semana",  icon: "📋", label: "Fazer Chamada",   color: "#60a5fa", bg: "rgba(59,130,246,0.12)" },
                { href: "/dashboard/piloto/turmas?tab=turmas",  icon: "⭐", label: "Lançar Notas",    color: "#34d399", bg: "rgba(16,185,129,0.12)" },
                { href: "/dashboard/piloto/diario",             icon: "📔", label: "Diário de Bordo", color: "#a78bfa", bg: "rgba(139,92,246,0.12)" },
              ].map((action) => (
                <Link key={action.label} href={action.href}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-200 text-center"
                  style={{ background: action.bg, border: `1px solid ${action.color}25` }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 20px ${action.color}20`; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
                  <span className="text-2xl">{action.icon}</span>
                  <span className="text-xs font-semibold" style={{ color: action.color }}>{action.label}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Direita */}
        <div className="space-y-5">
          <div style={{ height: "420px" }}>
            <CalendarWidget events={MOCK_EVENTS} />
          </div>

          {/* Últimas entradas do diário */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">📔</span>
                <h3 className="text-sm font-bold text-white">Diário de Bordo</h3>
              </div>
              <Link href="/dashboard/piloto/diario" className="text-xs"
                style={{ color: "rgba(255,255,255,0.4)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#f0c040"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}>
                Ver tudo →
              </Link>
            </div>
            <div className="space-y-2">
              {DIARY_ENTRIES.slice(0, 2).map((entry) => (
                <div key={entry.id} className="px-4 py-3 rounded-xl"
                  style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold" style={{ color: "#a78bfa" }}>
                      {TEACHER_CLASSES.find((tc) => tc.id === entry.classId)?.name}
                    </span>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {new Date(entry.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                  <p className="text-xs line-clamp-2" style={{ color: "rgba(255,255,255,0.55)" }}>{entry.content}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
