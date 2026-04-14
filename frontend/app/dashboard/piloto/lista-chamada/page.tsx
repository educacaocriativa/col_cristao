"use client";

import { useMemo, useState } from "react";
import { turmasApi } from "../../../_lib/api";
import { useQuery } from "../../../_lib/useQuery";

interface Turma {
  id: string; full_name: string; segment: string;
  subjects: { id: string; subject_id: string; name: string; color: string; }[];
}

interface Student { id: string; name: string; }
interface Session {
  attendance_id: string; date: string;
  subject_id: string; subject_name: string; subject_color: string;
}
interface AttRec { attendance_id: string; student_id: string; status: string; note?: string; }

interface Historico { students: Student[]; sessions: Session[]; records: AttRec[]; }

const STATUS_COLOR: Record<string, string> = {
  presente:    "#34d399",
  falta:       "#f87171",
  justificada: "#fbbf24",
};
const STATUS_CHAR: Record<string, string> = {
  presente:    "P",
  falta:       "F",
  justificada: "J",
};

function fmt(date: string) {
  // date is "YYYY-MM-DD"
  return new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
function fmtFull(date: string) {
  return new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

export default function ListaChamadaPage() {
  const [selectedTurma, setSelectedTurma] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");

  const { data: turmas, loading: turmasLoading } = useQuery<Turma[]>(
    () => turmasApi.list() as Promise<Turma[]>,
    []
  );

  const turma = turmas?.find((t) => t.id === selectedTurma);

  const { data: historico, loading: histLoading } = useQuery<Historico>(
    selectedTurma
      ? () => (turmasApi as unknown as {
          getChamadaHistorico: (id: string, params?: Record<string,string>) => Promise<Historico>
        }).getChamadaHistorico(
            selectedTurma,
            selectedSubject ? { subject_id: selectedSubject } : undefined
          )
      : null,
    [selectedTurma, selectedSubject]
  );

  // Build lookup: attendance_id + student_id → status
  const statusMap = useMemo(() => {
    const m: Record<string, string> = {};
    (historico?.records ?? []).forEach((r) => {
      m[`${r.attendance_id}:${r.student_id}`] = r.status;
    });
    return m;
  }, [historico]);

  const students = historico?.students ?? [];
  const sessions = historico?.sessions ?? [];

  // Per-student stats
  const studentStats = useMemo(() => {
    return students.map((st) => {
      let presencas = 0, faltas = 0, justificadas = 0, total = 0;
      sessions.forEach((sess) => {
        const status = statusMap[`${sess.attendance_id}:${st.id}`];
        if (!status) return;
        total++;
        if (status === "presente")    presencas++;
        else if (status === "falta")  faltas++;
        else if (status === "justificada") justificadas++;
      });
      const pct = total > 0 ? Math.round((presencas / total) * 100) : null;
      return { ...st, presencas, faltas, justificadas, total, pct };
    });
  }, [students, sessions, statusMap]);

  // Group sessions by date for column headers
  const dateGroups = useMemo(() => {
    const map = new Map<string, Session[]>();
    sessions.forEach((s) => {
      const arr = map.get(s.date) ?? [];
      arr.push(s);
      map.set(s.date, arr);
    });
    return Array.from(map.entries()).map(([date, ss]) => ({ date, sessions: ss }));
  }, [sessions]);

  const isLoading = histLoading;
  const hasData = students.length > 0 && sessions.length > 0;

  return (
    <div className="p-6 space-y-5">

      {/* Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Turma */}
        <div>
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
            Turma
          </label>
          <select
            value={selectedTurma}
            onChange={(e) => { setSelectedTurma(e.target.value); setSelectedSubject(""); }}
            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <option value="" style={{ background: "#0a1638" }}>Selecione uma turma…</option>
            {(turmas ?? []).map((t) => (
              <option key={t.id} value={t.id} style={{ background: "#0a1638" }}>{t.full_name}</option>
            ))}
          </select>
        </div>

        {/* Disciplina filter */}
        <div>
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
            Disciplina (opcional)
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            disabled={!selectedTurma}
            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <option value="" style={{ background: "#0a1638" }}>Todas as disciplinas</option>
            {(turma?.subjects ?? []).map((s) => (
              <option key={s.subject_id} value={s.subject_id} style={{ background: "#0a1638" }}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty / loading states */}
      {!selectedTurma && (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <span className="text-5xl">📊</span>
          <p className="text-base font-bold text-white">Selecione uma turma</p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
            Escolha a turma acima para visualizar o histórico completo de chamadas.
          </p>
        </div>
      )}

      {selectedTurma && isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "#f0c040", borderTopColor: "transparent" }} />
        </div>
      )}

      {selectedTurma && !isLoading && sessions.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-20 text-center rounded-2xl"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <span className="text-4xl">📋</span>
          <p className="text-sm font-bold text-white">Nenhuma chamada registrada ainda.</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            As chamadas aparecerão aqui conforme forem lançadas.
          </p>
        </div>
      )}

      {/* Summary cards */}
      {!isLoading && hasData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: "👨‍🚀", label: "Alunos",     value: students.length,  color: "#60a5fa" },
            { icon: "📋", label: "Aulas",      value: sessions.length,  color: "#f0c040" },
            { icon: "✅", label: "Média Pres.", value: (() => {
                const tots = studentStats.filter((s) => s.pct !== null);
                return tots.length ? Math.round(tots.reduce((a, s) => a + (s.pct ?? 0), 0) / tots.length) + "%" : "—";
              })(), color: "#34d399" },
            { icon: "❌", label: "Críticos",   value: studentStats.filter((s) => s.pct !== null && s.pct < 75).length, color: "#f87171" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <span className="text-xl">{s.icon}</span>
              <div>
                <p className="text-lg font-bold leading-none" style={{ color: s.color, fontFamily: "'Space Grotesk',sans-serif" }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legenda */}
      {!isLoading && hasData && (
        <div className="flex items-center gap-4 flex-wrap">
          {[["P", "#34d399", "Presente"], ["F", "#f87171", "Falta"], ["J", "#fbbf24", "Justificada"], ["—", "rgba(255,255,255,0.2)", "Sem registro"]].map(([ch, color, label]) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold"
                style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>{ch}</span>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Spreadsheet */}
      {!isLoading && hasData && (
        <div className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ borderCollapse: "collapse", minWidth: 600 }}>

              {/* Header */}
              <thead>
                {/* Date row */}
                <tr style={{ background: "rgba(255,255,255,0.05)" }}>
                  <th className="text-left px-4 py-3 font-semibold sticky left-0 z-10 min-w-40"
                    style={{ background: "#0d1a3a", color: "rgba(255,255,255,0.5)", borderBottom: "1px solid rgba(255,255,255,0.08)", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
                    Aluno
                  </th>
                  {dateGroups.map(({ date, sessions: ss }) => (
                    <th key={date}
                      colSpan={ss.length}
                      className="text-center px-1 py-2 font-bold"
                      style={{
                        color: "rgba(255,255,255,0.7)",
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                        borderLeft: "1px solid rgba(255,255,255,0.06)",
                        minWidth: ss.length * 36,
                      }}>
                      {fmtFull(date)}
                    </th>
                  ))}
                  {/* Stats columns */}
                  {["P", "F", "J", "%"].map((h) => (
                    <th key={h} className="text-center px-3 py-3 font-bold"
                      style={{
                        color: h === "P" ? "#34d399" : h === "F" ? "#f87171" : h === "J" ? "#fbbf24" : "#f0c040",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        borderLeft: "2px solid rgba(255,255,255,0.12)",
                        minWidth: 40,
                        background: "rgba(255,255,255,0.03)",
                      }}>
                      {h}
                    </th>
                  ))}
                </tr>

                {/* Subject sub-header */}
                {!selectedSubject && (
                  <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                    <th className="sticky left-0 z-10 px-4 py-1"
                      style={{ background: "#0d1a3a", borderRight: "1px solid rgba(255,255,255,0.08)" }} />
                    {sessions.map((sess) => (
                      <th key={sess.attendance_id}
                        className="text-center px-0.5 py-1"
                        style={{ borderLeft: "1px solid rgba(255,255,255,0.05)", minWidth: 36 }}
                        title={sess.subject_name}>
                        <div className="w-5 h-5 rounded mx-auto text-xs font-bold flex items-center justify-center"
                          style={{ background: `${sess.subject_color}25`, color: sess.subject_color }}>
                          {sess.subject_name.charAt(0)}
                        </div>
                      </th>
                    ))}
                    {[1, 2, 3, 4].map((i) => (
                      <th key={i} style={{ borderLeft: i === 1 ? "2px solid rgba(255,255,255,0.12)" : undefined }} />
                    ))}
                  </tr>
                )}
              </thead>

              {/* Body */}
              <tbody>
                {studentStats.map((st, rowIdx) => {
                  const pctColor = st.pct === null ? "rgba(255,255,255,0.3)"
                    : st.pct >= 75 ? "#34d399"
                    : st.pct >= 60 ? "#fbbf24"
                    : "#f87171";

                  return (
                    <tr key={st.id}
                      style={{ background: rowIdx % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>

                      {/* Student name — sticky */}
                      <td className="sticky left-0 z-10 px-4 py-2.5 font-semibold text-white"
                        style={{
                          background: rowIdx % 2 === 0 ? "#0f1e42" : "#0d1a3a",
                          borderRight: "1px solid rgba(255,255,255,0.08)",
                          whiteSpace: "nowrap",
                        }}>
                        {st.name}
                      </td>

                      {/* Cells per session */}
                      {sessions.map((sess) => {
                        const status = statusMap[`${sess.attendance_id}:${st.id}`] ?? null;
                        const color = status ? STATUS_COLOR[status] : "rgba(255,255,255,0.15)";
                        return (
                          <td key={sess.attendance_id}
                            className="text-center py-2"
                            style={{ borderLeft: "1px solid rgba(255,255,255,0.05)", minWidth: 36 }}>
                            <span
                              className="w-7 h-7 rounded-lg flex items-center justify-center mx-auto font-bold text-xs"
                              style={{
                                background: status ? `${color}20` : "transparent",
                                color,
                                border: `1px solid ${status ? color + "40" : "rgba(255,255,255,0.06)"}`,
                              }}>
                              {status ? STATUS_CHAR[status] : "·"}
                            </span>
                          </td>
                        );
                      })}

                      {/* Stats */}
                      <td className="text-center py-2 font-bold"
                        style={{ color: "#34d399", borderLeft: "2px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.02)" }}>
                        {st.presencas}
                      </td>
                      <td className="text-center py-2 font-bold"
                        style={{ color: "#f87171", background: "rgba(255,255,255,0.02)" }}>
                        {st.faltas}
                      </td>
                      <td className="text-center py-2 font-bold"
                        style={{ color: "#fbbf24", background: "rgba(255,255,255,0.02)" }}>
                        {st.justificadas}
                      </td>
                      <td className="text-center py-2 font-bold"
                        style={{ color: pctColor, background: "rgba(255,255,255,0.02)" }}>
                        {st.pct !== null ? `${st.pct}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Footer totals */}
              <tfoot>
                <tr style={{ background: "rgba(255,255,255,0.05)", borderTop: "2px solid rgba(255,255,255,0.1)" }}>
                  <td className="sticky left-0 z-10 px-4 py-2.5 font-bold text-white text-xs uppercase tracking-wide"
                    style={{ background: "#0d1a3a", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
                    Total da Turma
                  </td>
                  {sessions.map((sess) => {
                    const total = students.length;
                    const presentes = students.filter((st) => statusMap[`${sess.attendance_id}:${st.id}`] === "presente").length;
                    return (
                      <td key={sess.attendance_id} className="text-center py-2"
                        style={{ borderLeft: "1px solid rgba(255,255,255,0.05)" }}>
                        <span className="text-xs font-bold" style={{ color: "#34d399" }}>{presentes}</span>
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>/{total}</span>
                      </td>
                    );
                  })}
                  {/* Empty stat cells */}
                  {[1, 2, 3].map((i) => (
                    <td key={i} style={{ borderLeft: i === 1 ? "2px solid rgba(255,255,255,0.12)" : undefined }} />
                  ))}
                  <td className="text-center py-2 font-bold text-xs"
                    style={{ color: "#f0c040" }}>
                    {(() => {
                      const tots = studentStats.filter((s) => s.pct !== null);
                      return tots.length ? Math.round(tots.reduce((a, s) => a + (s.pct ?? 0), 0) / tots.length) + "%" : "—";
                    })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Alert: below 75% */}
      {!isLoading && hasData && studentStats.some((s) => s.pct !== null && s.pct < 75) && (
        <div className="rounded-2xl px-5 py-4"
          style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)" }}>
          <p className="text-sm font-bold text-white mb-2">⚠️ Alunos com frequência crítica (&lt;75%)</p>
          <div className="space-y-1.5">
            {studentStats.filter((s) => s.pct !== null && s.pct < 75).map((s) => (
              <div key={s.id} className="flex items-center justify-between">
                <span className="text-sm text-white">{s.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {s.faltas + s.justificadas} ausências de {s.total} aulas
                  </span>
                  <span className="text-sm font-bold px-2.5 py-0.5 rounded-lg"
                    style={{ background: "rgba(248,113,113,0.15)", color: "#f87171" }}>
                    {s.pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
