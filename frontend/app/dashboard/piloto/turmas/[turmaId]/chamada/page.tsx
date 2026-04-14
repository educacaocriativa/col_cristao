"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { turmasApi } from "../../../../../_lib/api";
import { useQuery } from "../../../../../_lib/useQuery";
import { getInitials } from "../../../../_lib/dashboardUtils";

type AttendanceStatus = "presente" | "falta" | "justificada";

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string; bg: string; icon: string }> = {
  presente:    { label: "Presente",    color: "#34d399", bg: "rgba(52,211,153,0.15)",  icon: "✅" },
  falta:       { label: "Falta",       color: "#f87171", bg: "rgba(248,113,113,0.15)", icon: "❌" },
  justificada: { label: "Justificada", color: "#fbbf24", bg: "rgba(251,191,36,0.15)",  icon: "📝" },
};

interface Subject { id: string; subject_id: string; name: string; color: string; }
interface TurmaBase { full_name: string; subjects: Subject[]; }

interface AttendanceRecord { student_id: string; student_name: string; status: string | null; note?: string; }
interface AttendanceData { attendanceId?: string; date: string; records: AttendanceRecord[]; }

export default function ChamadaPage({ params }: { params: Promise<{ turmaId: string }> }) {
  const { turmaId } = use(params);
  const router = useRouter();

  const today = new Date().toISOString().split("T")[0];
  const [date, setDate]               = useState(today);
  const [subjectId, setSubjectId]     = useState<string>("");
  const [records, setRecords]         = useState<Record<string, AttendanceStatus>>({});
  const [notes, setNotes]             = useState<Record<string, string>>({});
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [filterStatus, setFilterStatus]   = useState<AttendanceStatus | "all">("all");
  const [showDiaryPrompt, setShowDiaryPrompt] = useState(false);

  // Load turma (for subjects list and name)
  const { data: turma } = useQuery<TurmaBase>(
    () => turmasApi.get(turmaId) as Promise<TurmaBase>,
    [turmaId]
  );

  // Auto-select first subject
  useEffect(() => {
    if (turma?.subjects.length && !subjectId) {
      setSubjectId(turma.subjects[0].subject_id);
    }
  }, [turma, subjectId]);

  // Load chamada whenever date or subjectId changes
  const { data: chamada, loading: chamadaLoading } = useQuery<AttendanceData>(
    subjectId
      ? () => turmasApi.getChamada(turmaId, { date, subject_id: subjectId }) as Promise<AttendanceData>
      : null,
    [turmaId, date, subjectId]
  );

  // Sync records from API response
  useEffect(() => {
    if (!chamada?.records) return;
    const init: Record<string, AttendanceStatus> = {};
    const initNotes: Record<string, string> = {};
    chamada.records.forEach((r) => {
      init[r.student_id] = (r.status as AttendanceStatus) || "presente";
      if (r.note) initNotes[r.student_id] = r.note;
    });
    setRecords(init);
    setNotes(initNotes);
    setSaved(false);
  }, [chamada]);

  const students = chamada?.records ?? [];

  const counts = useMemo(() => ({
    presente:    Object.values(records).filter((v) => v === "presente").length,
    falta:       Object.values(records).filter((v) => v === "falta").length,
    justificada: Object.values(records).filter((v) => v === "justificada").length,
  }), [records]);

  const filtered = useMemo(() =>
    filterStatus === "all"
      ? students
      : students.filter((s) => records[s.student_id] === filterStatus),
    [students, records, filterStatus]);

  function setStatus(studentId: string, status: AttendanceStatus) {
    setRecords((prev) => ({ ...prev, [studentId]: status }));
    setSaved(false);
  }

  function markAll(status: AttendanceStatus) {
    const next: Record<string, AttendanceStatus> = {};
    students.forEach((s) => { next[s.student_id] = status; });
    setRecords(next);
    setSaved(false);
  }

  async function handleSave() {
    if (!subjectId) return;
    setSaving(true);
    try {
      const payload = {
        date,
        subject_id: subjectId,
        records: students.map((s) => ({
          student_id: s.student_id,
          status: records[s.student_id] || "presente",
          note: notes[s.student_id] || null,
        })),
      };
      await turmasApi.saveChamada(turmaId, payload);
      setSaved(true);
      setShowDiaryPrompt(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar chamada.");
    } finally {
      setSaving(false);
    }
  }

  const activeSubject = turma?.subjects.find((s) => s.subject_id === subjectId);
  const subjectColor = activeSubject?.color || "#f0c040";

  return (
    <div className="p-6 space-y-5">
      {/* Back + header */}
      <div>
        <button onClick={() => router.back()} className="text-xs mb-3 flex items-center gap-1"
          style={{ color: "rgba(255,255,255,0.4)" }}>
          ← {turma?.full_name ?? "Turma"}
        </button>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: `${subjectColor}20` }}>
              📋
            </div>
            <div>
              <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                Chamada
              </h1>
              <p className="text-xs" style={{ color: subjectColor }}>{turma?.full_name}</p>
            </div>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setSaved(false); }}
            className="px-4 py-2 rounded-xl text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
          />
        </div>
      </div>

      {/* Subject selector */}
      {turma?.subjects && turma.subjects.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {turma.subjects.map((sub) => (
            <button key={sub.subject_id}
              onClick={() => { setSubjectId(sub.subject_id); setSaved(false); }}
              className="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 shrink-0"
              style={{
                background: subjectId === sub.subject_id ? `${sub.color}25` : "rgba(255,255,255,0.05)",
                color: subjectId === sub.subject_id ? sub.color : "rgba(255,255,255,0.45)",
                border: `1px solid ${subjectId === sub.subject_id ? sub.color + "50" : "rgba(255,255,255,0.08)"}`,
              }}>
              {sub.name}
            </button>
          ))}
        </div>
      )}

      {/* Stats + mark all */}
      <div className="flex flex-wrap items-center gap-3">
        {(["presente", "falta", "justificada"] as AttendanceStatus[]).map((st) => {
          const cfg = STATUS_CONFIG[st];
          return (
            <button key={st}
              onClick={() => setFilterStatus((prev) => prev === st ? "all" : st)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
              style={{
                background: filterStatus === st ? cfg.bg : "rgba(255,255,255,0.04)",
                color: filterStatus === st ? cfg.color : "rgba(255,255,255,0.5)",
                border: `1px solid ${filterStatus === st ? cfg.color + "40" : "rgba(255,255,255,0.08)"}`,
              }}>
              {cfg.icon} {counts[st]} {cfg.label}
            </button>
          );
        })}
        <div className="ml-auto">
          <button onClick={() => markAll("presente")}
            className="text-xs px-3 py-2 rounded-lg font-semibold"
            style={{ background: "rgba(52,211,153,0.12)", color: "#34d399", border: "1px solid rgba(52,211,153,0.25)" }}>
            Todos Presentes
          </button>
        </div>
      </div>

      {/* Loading state */}
      {chamadaLoading && (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto"
            style={{ borderColor: "#f0c040", borderTopColor: "transparent" }} />
        </div>
      )}

      {/* Students list */}
      {!chamadaLoading && (
        <div className="space-y-2">
          {filtered.map((st) => {
            const status = records[st.student_id] || "presente";
            const cfg    = STATUS_CONFIG[status];
            return (
              <div key={st.student_id} className="rounded-xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${cfg.color}20` }}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: cfg.bg, color: cfg.color }}>
                    {getInitials(st.student_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{st.student_name}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {(["presente", "falta", "justificada"] as AttendanceStatus[]).map((opt) => {
                      const c = STATUS_CONFIG[opt];
                      const active = status === opt;
                      return (
                        <button key={opt} onClick={() => setStatus(st.student_id, opt)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150"
                          style={{
                            background: active ? c.bg : "rgba(255,255,255,0.04)",
                            color: active ? c.color : "rgba(255,255,255,0.3)",
                            border: `1px solid ${active ? c.color + "40" : "rgba(255,255,255,0.08)"}`,
                            transform: active ? "scale(1.05)" : "scale(1)",
                          }}>
                          {c.icon}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {status !== "presente" && (
                  <div className="px-4 pb-3">
                    <input
                      type="text"
                      placeholder="Observação (opcional)…"
                      value={notes[st.student_id] ?? ""}
                      onChange={(e) => { setNotes((prev) => ({ ...prev, [st.student_id]: e.target.value })); setSaved(false); }}
                      className="w-full px-3 py-2 rounded-lg text-xs text-white placeholder-white/30 outline-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${cfg.color}25` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Diary prompt banner */}
      {showDiaryPrompt && (
        <div className="rounded-2xl px-5 py-4 flex flex-wrap items-center gap-3"
          style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.35)" }}>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">✅ Chamada salva!</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
              Deseja registrar o diário desta aula agora?
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setShowDiaryPrompt(false)}
              className="px-3 py-2 rounded-xl text-xs font-semibold"
              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}>
              Agora não
            </button>
            <button onClick={() => {
              router.push(
                `/dashboard/piloto/turmas/${turmaId}/diario?date=${date}&subject_id=${subjectId}`
              );
            }}
              className="px-4 py-2 rounded-xl text-xs font-bold"
              style={{ background: "rgba(139,92,246,0.25)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.4)" }}>
              📔 Registrar Diário →
            </button>
          </div>
        </div>
      )}

      {/* Save */}
      <div className="sticky bottom-4 flex justify-end pt-2">
        <button onClick={handleSave} disabled={saving || !subjectId}
          className="px-8 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 disabled:opacity-50"
          style={{
            background: saved
              ? "rgba(52,211,153,0.2)"
              : "linear-gradient(135deg,#f0c040,#eab308)",
            color: saved ? "#34d399" : "#0a1638",
            fontFamily: "'Space Grotesk',sans-serif",
            boxShadow: saved ? "none" : "0 4px 20px rgba(240,192,64,0.35)",
          }}>
          {saving ? "Salvando…" : saved ? "✅ Chamada Salva!" : "💾 Salvar Chamada"}
        </button>
      </div>
    </div>
  );
}
