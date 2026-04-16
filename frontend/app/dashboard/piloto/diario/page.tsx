"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getStoredUser, isDemoUser, type AuthUser } from "../../../_lib/auth";
import { TEACHER_CLASSES, DIARY_ENTRIES } from "../../_components/teacherMockData";
import NonDemoPlaceholder from "../../_components/NonDemoPlaceholder";

export default function DiarioGlobalPage() {
  const [filterClass, setFilterClass] = useState<string>("all");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    setHydrated(true);
  }, []);

  const filtered = useMemo(() =>
    filterClass === "all"
      ? DIARY_ENTRIES
      : DIARY_ENTRIES.filter((e) => e.classId === filterClass),
    [filterClass]);

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => b.date.localeCompare(a.date)),
    [filtered]);

  if (!hydrated) return null;
  if (!isDemoUser(user)) return <NonDemoPlaceholder role="professor" />;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
          Diário de Bordo
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
          Todas as entradas pedagógicas
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterClass("all")}
          className="px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150"
          style={{
            background: filterClass === "all" ? "rgba(240,192,64,0.2)" : "rgba(255,255,255,0.05)",
            color: filterClass === "all" ? "#f0c040" : "rgba(255,255,255,0.45)",
            border: `1px solid ${filterClass === "all" ? "rgba(240,192,64,0.4)" : "rgba(255,255,255,0.08)"}`,
          }}>
          Todas ({DIARY_ENTRIES.length})
        </button>
        {TEACHER_CLASSES.map((tc) => {
          const count = DIARY_ENTRIES.filter((e) => e.classId === tc.id).length;
          return (
            <button key={tc.id} onClick={() => setFilterClass(tc.id)}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150"
              style={{
                background: filterClass === tc.id ? `${tc.subjectColor}20` : "rgba(255,255,255,0.05)",
                color: filterClass === tc.id ? tc.subjectColor : "rgba(255,255,255,0.45)",
                border: `1px solid ${filterClass === tc.id ? tc.subjectColor + "40" : "rgba(255,255,255,0.08)"}`,
              }}>
              {tc.className} ({count})
            </button>
          );
        })}
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="text-4xl">📔</span>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Nenhuma entrada para esta turma.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((entry) => {
            const tc = TEACHER_CLASSES.find((c) => c.id === entry.classId);
            return (
              <div key={entry.id} className="rounded-2xl overflow-hidden"
                style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)" }}>
                <div className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {tc && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                        style={{ background: `${tc.subjectColor}15`, color: tc.subjectColor }}>
                        {tc.subjectIcon} {tc.name}
                      </span>
                    )}
                    <span className="text-xs font-bold" style={{ color: "#a78bfa" }}>
                      {new Date(entry.date + "T12:00:00").toLocaleDateString("pt-BR", {
                        weekday: "short", day: "2-digit", month: "short", year: "numeric"
                      })}
                    </span>
                    {tc && (
                      <Link href={`/dashboard/piloto/turmas/${tc.id}/diario`}
                        className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                        Editar →
                      </Link>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.8)" }}>
                    {entry.content}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {entry.objectives && (
                      <span className="text-xs px-2.5 py-1 rounded-full"
                        style={{ background: "rgba(96,165,250,0.1)", color: "#60a5fa" }}>
                        🎯 {entry.objectives}
                      </span>
                    )}
                    {entry.methodology && (
                      <span className="text-xs px-2.5 py-1 rounded-full"
                        style={{ background: "rgba(52,211,153,0.1)", color: "#34d399" }}>
                        🔬 {entry.methodology}
                      </span>
                    )}
                    {entry.resources && (
                      <span className="text-xs px-2.5 py-1 rounded-full"
                        style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24" }}>
                        📚 {entry.resources}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
