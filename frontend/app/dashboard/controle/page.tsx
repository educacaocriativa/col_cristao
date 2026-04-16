"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getStoredUser, isDemoUser, type AuthUser } from "../../_lib/auth";
import { MOCK_GRADES, MOCK_ANNOUNCEMENTS, MOCK_SUBJECTS } from "../_components/mockData";
import { CLASS_GRADES, CLASS_STUDENTS } from "../_components/teacherMockData";
import NonDemoPlaceholder from "../_components/NonDemoPlaceholder";

// Simulate "my child" — Alice Fernandes (s1, turma t1)
const MY_CHILD = CLASS_STUDENTS["t1"]?.[0] ?? { name: "Alice Fernandes", enrollment: "2026001", initials: "AF" };
const MY_GRADES = CLASS_GRADES["t1"]?.find((g) => g.studentId === "s1");
const MY_ABSENCES = MY_GRADES?.absences ?? 2;

function scoreColor(v: number) {
  return v >= 85 ? "#34d399" : v >= 70 ? "#fbbf24" : "#f87171";
}

export default function ControlePage() {
  const [parentName, setParentName] = useState("Responsável");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const u = getStoredUser();
    setUser(u);
    if (u) setParentName(u.name.split(" ")[0]);
    setHydrated(true);
  }, []);

  const avgGrade = useMemo(() => {
    const vals = [MY_GRADES?.bimester1, MY_GRADES?.bimester2].filter((v): v is number => v !== undefined);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }, []);

  const subjectsWithGrades = useMemo(() =>
    MOCK_GRADES.map((g) => ({
      ...g,
      avg: [g.bimester1, g.bimester2, g.bimester3, g.bimester4]
        .filter((v): v is number => v !== undefined)
        .reduce((a, b, _, arr) => a + b / arr.length, 0),
    })), []);

  const unread = MOCK_ANNOUNCEMENTS.filter((a) => !a.read).length;

  if (!hydrated) return null;
  if (!isDemoUser(user)) return <NonDemoPlaceholder role="pais" />;

  return (
    <div className="p-6 space-y-6">
      {/* Hero card */}
      <div className="relative rounded-2xl px-6 py-5 overflow-hidden"
        style={{ background: "linear-gradient(135deg,#1b3a8f 0%,#0a1638 100%)", border: "1px solid rgba(240,192,64,0.2)" }}>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10 text-9xl pointer-events-none select-none">🌍</div>
        <p className="text-sm" style={{ color: "rgba(240,192,64,0.7)" }}>Bem-vindo, {parentName}</p>
        <h2 className="text-2xl font-bold text-white mt-0.5" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
          Controle de Missão
        </h2>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
          Cosmonauta: <strong className="text-white">{MY_CHILD.name}</strong> · Mat. {MY_CHILD.enrollment}
        </p>
        <div className="flex gap-3 mt-4 flex-wrap">
          {[
            { icon: "📊", label: "Média Geral",   value: avgGrade.toFixed(1),      color: scoreColor(avgGrade) },
            { icon: "📅", label: "Faltas",        value: `${MY_ABSENCES} dias`,    color: MY_ABSENCES > 6 ? "#f87171" : "#34d399" },
            { icon: "📢", label: "Não lidos",     value: `${unread} avisos`,       color: unread > 0 ? "#f0c040" : "#34d399" },
            { icon: "📚", label: "Disciplinas",   value: `${MOCK_GRADES.length}`,  color: "#60a5fa" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.08)" }}>
              <span>{s.icon}</span>
              <div>
                <p className="text-base font-bold leading-none" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)", fontSize: "10px" }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-5">
          {/* Grades summary */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">📊 Boletim Rápido</h3>
              <Link href="/dashboard/controle/notas" className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                Ver completo →
              </Link>
            </div>
            <div className="space-y-2">
              {subjectsWithGrades.map((g) => (
                <div key={g.subjectId} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                    style={{ background: `${g.subjectColor}15` }}>
                    {MOCK_SUBJECTS.find((s) => s.id === g.subjectId)?.icon ?? "📚"}
                  </div>
                  <span className="flex-1 text-sm text-white">{g.subjectName}</span>
                  {[g.bimester1, g.bimester2, g.bimester3, g.bimester4].map((v, i) => (
                    <span key={i} className="text-xs font-bold w-8 text-center"
                      style={{ color: v !== undefined ? scoreColor(v) : "rgba(255,255,255,0.15)" }}>
                      {v !== undefined ? v : "—"}
                    </span>
                  ))}
                  <span className="text-sm font-bold shrink-0 w-10 text-right"
                    style={{ color: g.avg > 0 ? scoreColor(g.avg) : "rgba(255,255,255,0.2)" }}>
                    {g.avg > 0 ? g.avg.toFixed(1) : "—"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Attendance */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">📅 Frequência</h3>
              <Link href="/dashboard/controle/frequencia" className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                Ver detalhes →
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Presenças",   value: 48 - MY_ABSENCES, color: "#34d399", bg: "rgba(52,211,153,0.1)"  },
                { label: "Faltas",      value: MY_ABSENCES,      color: MY_ABSENCES > 6 ? "#f87171" : "#fbbf24", bg: MY_ABSENCES > 6 ? "rgba(248,113,113,0.1)" : "rgba(251,191,36,0.1)" },
                { label: "Frequência", value: `${((48 - MY_ABSENCES) / 48 * 100).toFixed(0)}%`, color: "#60a5fa", bg: "rgba(96,165,250,0.1)" },
              ].map((s) => (
                <div key={s.label} className="flex flex-col items-center py-4 rounded-2xl"
                  style={{ background: s.bg }}>
                  <p className="text-2xl font-bold" style={{ color: s.color, fontFamily: "'Space Grotesk',sans-serif" }}>{s.value}</p>
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>{s.label}</p>
                </div>
              ))}
            </div>
            {MY_ABSENCES > 6 && (
              <div className="mt-3 px-4 py-3 rounded-xl flex items-center gap-2"
                style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}>
                <span>⚠️</span>
                <p className="text-sm" style={{ color: "#f87171" }}>
                  Atenção: {MY_CHILD.name} ultrapassou 25% de faltas. Contate a escola.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Right: announcements + contact */}
        <div className="space-y-5">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                📢 Comunicados
                {unread > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: "rgba(240,192,64,0.2)", color: "#f0c040" }}>
                    {unread}
                  </span>
                )}
              </h3>
              <Link href="/dashboard/controle/comunicados" className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                Ver todos →
              </Link>
            </div>
            <div className="space-y-2">
              {MOCK_ANNOUNCEMENTS.slice(0, 3).map((a) => {
                const pc = a.priority === "urgente" ? "#f87171" : a.priority === "informativo" ? "#60a5fa" : "rgba(255,255,255,0.5)";
                return (
                  <div key={a.id} className="px-4 py-3 rounded-xl"
                    style={{ background: `${pc}08`, border: `1px solid ${pc}20` }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold" style={{ color: pc }}>{a.priority.toUpperCase()}</span>
                      {!a.read && <span className="w-2 h-2 rounded-full" style={{ background: "#f0c040" }} />}
                    </div>
                    <p className="text-sm font-semibold text-white">{a.title}</p>
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "rgba(255,255,255,0.5)" }}>{a.content}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Contact school */}
          <section>
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">📞 Contato Rápido</h3>
            <div className="space-y-2">
              {[
                { label: "Secretaria",      phone: "(44) 3333-0001", icon: "🏫" },
                { label: "Coordenação",     phone: "(44) 3333-0002", icon: "📋" },
                { label: "Prof. Roberto",   phone: "(44) 99999-1234", icon: "👨‍🏫" },
              ].map((c) => (
                <div key={c.label} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="text-xl">{c.icon}</span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-white">{c.label}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{c.phone}</p>
                  </div>
                  <a href={`https://wa.me/55${c.phone.replace(/\D/g, "")}`}
                    target="_blank" rel="noreferrer"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                    style={{ background: "rgba(52,211,153,0.12)", color: "#34d399" }}>
                    💬
                  </a>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
