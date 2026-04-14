"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "../../../_lib/useQuery";
import { turmasApi, scheduleApi } from "../../../_lib/api";

// ── Constantes ────────────────────────────────────────────────
const DAYS = [
  { n: 1, label: "Seg" }, { n: 2, label: "Ter" }, { n: 3, label: "Qua" },
  { n: 4, label: "Qui" }, { n: 5, label: "Sex" }, { n: 6, label: "Sáb" },
];
const PERIODS = [1, 2, 3, 4, 5, 6];
const PERIOD_LABEL: Record<number, string> = {
  1: "1ª Aula", 2: "2ª Aula", 3: "3ª Aula",
  4: "4ª Aula", 5: "5ª Aula", 6: "6ª Aula",
};
const BIMESTERS = [
  { n: 1, label: "1º Bimestre", range: "03/Fev – 30/Abr" },
  { n: 2, label: "2º Bimestre", range: "05/Mai – 11/Jul" },
  { n: 3, label: "3º Bimestre", range: "28/Jul – 30/Set" },
  { n: 4, label: "4º Bimestre", range: "06/Out – 12/Dez" },
];

// ── Tipos ─────────────────────────────────────────────────────
interface Turma {
  id: string; full_name: string; shift: string;
  grade_level_name: string; school_name: string;
}
interface ClassDetail {
  id: string; shift: string; academic_year_id: string;
  subjects: { subject_id: string; name: string; color: string; icon: string; teacher_id: string; teacher_name: string }[];
}
interface SlotCell {
  subjectId: string; teacherId: string;
  subjectName: string; subjectColor: string; subjectIcon: string;
}
interface SubjectConfig {
  subjectId: string; teacherId: string;
  subjectName: string; color: string; icon: string;
  weeklyCount: number; availableDays: number[];
}
interface FreqSubject {
  subject_id: string; subject_name: string; subject_color: string; subject_icon: string;
  teacher_name: string; classes_held: number;
  total_presences: number; total_absences: number; total_justified: number;
}
interface FreqStudentRow {
  student_id: string; student_name: string;
  presences: number; absences: number; justified: number; total: number;
}
interface FreqStudentSubject extends FreqStudentRow { subject_id: string; }
interface FreqData {
  bimester: number; dateRange: { start: string; end: string };
  bySubject: FreqSubject[];
  byStudent: FreqStudentSubject[];
  totals: FreqStudentRow[];
}

// ── Algoritmo de geração do horário ──────────────────────────
function autoGenerate(configs: SubjectConfig[]): Record<string, SlotCell> {
  const grid: Record<string, SlotCell> = {};
  const occupied = new Set<string>();

  // Ordenar por contagem decrescente para distribuir os mais frequentes primeiro
  const sorted = [...configs].filter(c => c.weeklyCount > 0 && c.availableDays.length > 0)
    .sort((a, b) => b.weeklyCount - a.weeklyCount);

  for (const cfg of sorted) {
    let placed = 0;
    // Distribui os slots espalhados pelos períodos e dias disponíveis
    for (let period = 1; period <= 6 && placed < cfg.weeklyCount; period++) {
      for (const day of [...cfg.availableDays].sort()) {
        if (placed >= cfg.weeklyCount) break;
        const key = `${day}-${period}`;
        if (!occupied.has(key)) {
          grid[key] = {
            subjectId: cfg.subjectId, teacherId: cfg.teacherId,
            subjectName: cfg.subjectName, subjectColor: cfg.color, subjectIcon: cfg.icon,
          };
          occupied.add(key);
          placed++;
        }
      }
    }
  }
  return grid;
}

// ── Helpers de cor ────────────────────────────────────────────
function pctColor(pct: number) {
  return pct >= 75 ? "#34d399" : pct >= 60 ? "#fbbf24" : "#f87171";
}

// ── Componente principal ──────────────────────────────────────
export default function CronogramaPage() {
  const [tab, setTab] = useState<"horario" | "frequencia">("horario");
  const [classId, setClassId]   = useState("");
  const [bimester, setBimester] = useState(1);

  // Schedule builder state
  const [configs, setConfigs]           = useState<SubjectConfig[]>([]);
  const [grid, setGrid]                 = useState<Record<string, SlotCell>>({});
  const [editingCell, setEditingCell]   = useState<string | null>(null);
  const [scheduleLoaded, setScheduleLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  // Data
  const { data: turmas } = useQuery<Turma[]>(
    () => turmasApi.list() as Promise<Turma[]>, []
  );
  const { data: classDetail, loading: loadingDetail } = useQuery<ClassDetail>(
    classId ? () => turmasApi.get(classId) as Promise<ClassDetail> : null,
    [classId]
  );
  const { data: existingSlots } = useQuery<SlotCell & { day_of_week: number; period: number }[]>(
    classId ? () => scheduleApi.get(classId) as Promise<any> : null,
    [classId]
  );
  const { data: freqData, loading: loadingFreq } = useQuery<FreqData>(
    classId && tab === "frequencia"
      ? () => scheduleApi.frequencia(classId, bimester) as Promise<FreqData>
      : null,
    [classId, bimester, tab]
  );

  // When class changes: reset configs and grid
  useEffect(() => {
    if (!classDetail) return;
    const subs = classDetail.subjects ?? [];
    setConfigs(subs.map(s => ({
      subjectId: s.subject_id, teacherId: s.teacher_id,
      subjectName: s.name, color: s.color, icon: s.icon,
      weeklyCount: 0, availableDays: [],
    })));
    setGrid({});
    setScheduleLoaded(false);
  }, [classDetail]);

  // Load existing schedule when slots arrive
  useEffect(() => {
    if (!existingSlots || scheduleLoaded) return;
    if (existingSlots.length === 0) return;
    const g: Record<string, SlotCell> = {};
    for (const s of existingSlots) {
      g[`${s.day_of_week}-${s.period}`] = {
        subjectId: (s as any).subject_id,
        teacherId: (s as any).teacher_id ?? "",
        subjectName: (s as any).subject_name,
        subjectColor: (s as any).subject_color,
        subjectIcon: (s as any).subject_icon,
      };
    }
    setGrid(g);
    setScheduleLoaded(true);
  }, [existingSlots, scheduleLoaded]);

  function updateConfig(subjectId: string, field: "weeklyCount" | "availableDays", value: number | number[]) {
    setConfigs(prev => prev.map(c => c.subjectId === subjectId ? { ...c, [field]: value } : c));
  }

  function toggleDay(subjectId: string, day: number) {
    setConfigs(prev => prev.map(c => {
      if (c.subjectId !== subjectId) return c;
      const days = c.availableDays.includes(day)
        ? c.availableDays.filter(d => d !== day)
        : [...c.availableDays, day];
      return { ...c, availableDays: days };
    }));
  }

  function handleGenerate() {
    setGrid(autoGenerate(configs));
    setEditingCell(null);
  }

  function assignCell(key: string, sub: SubjectConfig | null) {
    if (!sub) {
      setGrid(prev => { const next = { ...prev }; delete next[key]; return next; });
    } else {
      setGrid(prev => ({ ...prev, [key]: {
        subjectId: sub.subjectId, teacherId: sub.teacherId,
        subjectName: sub.subjectName, subjectColor: sub.color, subjectIcon: sub.icon,
      }}));
    }
    setEditingCell(null);
  }

  async function handleSave() {
    if (!classId) return;
    setSaving(true);
    try {
      const slots = Object.entries(grid).map(([key, cell]) => {
        const [day, period] = key.split("-").map(Number);
        return { subject_id: cell.subjectId, teacher_id: cell.teacherId, day_of_week: day, period };
      });
      await scheduleApi.save(classId, classDetail?.academic_year_id ?? null, slots);
      alert("Cronograma salvo com sucesso! ✅");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  // Contagem de aulas por disciplina no grid atual
  const slotCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(grid).forEach(v => { counts[v.subjectId] = (counts[v.subjectId] ?? 0) + 1; });
    return counts;
  }, [grid]);

  // Alunos (para tabela de frequência)
  const students = useMemo(() => {
    if (!freqData) return [];
    const seen = new Set<string>();
    return freqData.totals.filter(r => { if (seen.has(r.student_id)) return false; seen.add(r.student_id); return true; });
  }, [freqData]);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
          Cronograma de Aulas
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
          Monte o horário semanal e acompanhe a frequência por bimestre
        </p>
      </div>

      {/* Class selector */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold shrink-0" style={{ color: "rgba(255,255,255,0.5)" }}>Turma:</label>
        <select value={classId} onChange={e => setClassId(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl text-sm text-white outline-none max-w-sm"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
          <option value="" style={{ background: "#0a1638" }}>Selecione a turma…</option>
          {(turmas ?? []).map(t => (
            <option key={t.id} value={t.id} style={{ background: "#0a1638" }}>{t.full_name}</option>
          ))}
        </select>
      </div>

      {!classId && (
        <div className="text-center py-16 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-4xl mb-3">📅</div>
          <p className="text-sm text-white font-semibold">Selecione uma turma para começar</p>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
            Monte o horário e veja a frequência por bimestre
          </p>
        </div>
      )}

      {classId && (
        <>
          {/* Tabs */}
          <div className="flex gap-2">
            {[
              { key: "horario",    label: "📅 Horário Semanal" },
              { key: "frequencia", label: "📋 Frequência por Bimestre" },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key as "horario" | "frequencia")}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{
                  background: tab === t.key ? "rgba(240,192,64,0.15)" : "rgba(255,255,255,0.05)",
                  color: tab === t.key ? "#f0c040" : "rgba(255,255,255,0.45)",
                  border: `1px solid ${tab === t.key ? "rgba(240,192,64,0.4)" : "rgba(255,255,255,0.08)"}`,
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── TAB: HORÁRIO SEMANAL ── */}
          {tab === "horario" && (
            <div className="space-y-6">

              {/* Configuração de disciplinas */}
              {loadingDetail ? (
                <div className="text-center py-10">
                  <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto"
                    style={{ borderColor: "#f0c040", borderTopColor: "transparent" }} />
                </div>
              ) : configs.length === 0 ? (
                <p className="text-sm py-6 text-center" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Esta turma não tem disciplinas vinculadas.
                </p>
              ) : (
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="px-5 py-4 flex items-center justify-between"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <h2 className="text-sm font-bold text-white">⚙️ Configurar Disciplinas</h2>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                      Defina quantas aulas por semana e os dias disponíveis do professor
                    </p>
                  </div>

                  <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                    {configs.map(cfg => (
                      <div key={cfg.subjectId} className="px-5 py-4">
                        <div className="flex items-start gap-4 flex-wrap">
                          {/* Subject badge */}
                          <div className="flex items-center gap-2 min-w-[180px]">
                            <span className="text-xl">{cfg.icon}</span>
                            <div>
                              <p className="text-sm font-semibold text-white">{cfg.subjectName}</p>
                              <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                                {slotCounts[cfg.subjectId] ?? 0}/{cfg.weeklyCount} aulas/sem
                              </p>
                            </div>
                          </div>

                          {/* Aulas por semana */}
                          <div className="flex items-center gap-2">
                            <label className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                              Aulas/semana:
                            </label>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5, 6].map(n => (
                                <button key={n} onClick={() => updateConfig(cfg.subjectId, "weeklyCount", n)}
                                  className="w-7 h-7 rounded-lg text-xs font-bold"
                                  style={{
                                    background: cfg.weeklyCount === n ? cfg.color + "30" : "rgba(255,255,255,0.06)",
                                    color: cfg.weeklyCount === n ? cfg.color : "rgba(255,255,255,0.45)",
                                    border: `1px solid ${cfg.weeklyCount === n ? cfg.color + "60" : "rgba(255,255,255,0.08)"}`,
                                  }}>
                                  {n}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Dias disponíveis */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <label className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                              Dias disponíveis:
                            </label>
                            <div className="flex gap-1">
                              {DAYS.map(d => {
                                const on = cfg.availableDays.includes(d.n);
                                return (
                                  <button key={d.n} onClick={() => toggleDay(cfg.subjectId, d.n)}
                                    className="w-8 h-7 rounded-lg text-xs font-semibold"
                                    style={{
                                      background: on ? cfg.color + "25" : "rgba(255,255,255,0.05)",
                                      color: on ? cfg.color : "rgba(255,255,255,0.35)",
                                      border: `1px solid ${on ? cfg.color + "50" : "rgba(255,255,255,0.08)"}`,
                                    }}>
                                    {d.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="px-5 py-4 flex gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <button onClick={handleGenerate}
                      className="px-6 py-3 rounded-xl font-bold text-sm"
                      style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638" }}>
                      ✨ Gerar Horário Automaticamente
                    </button>
                    <button onClick={() => setGrid({})}
                      className="px-5 py-3 rounded-xl text-sm font-semibold"
                      style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
                      🗑 Limpar Grade
                    </button>
                  </div>
                </div>
              )}

              {/* Grade semanal */}
              <div className="rounded-2xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="px-5 py-4 flex items-center justify-between"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <h2 className="text-sm font-bold text-white">🗓 Grade Semanal</h2>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Clique em qualquer célula para editar
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <th className="px-4 py-3 text-left text-xs font-semibold w-24"
                          style={{ color: "rgba(255,255,255,0.35)" }}>Período</th>
                        {DAYS.map(d => (
                          <th key={d.n} className="px-2 py-3 text-center text-xs font-semibold"
                            style={{ color: "rgba(255,255,255,0.5)", minWidth: "100px" }}>
                            {d.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PERIODS.map(period => (
                        <tr key={period} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <td className="px-4 py-2.5">
                            <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>
                              {PERIOD_LABEL[period]}
                            </span>
                          </td>
                          {DAYS.map(d => {
                            const key = `${d.n}-${period}`;
                            const cell = grid[key];
                            const isEditing = editingCell === key;
                            return (
                              <td key={d.n} className="px-2 py-2 relative">
                                <button
                                  onClick={() => setEditingCell(isEditing ? null : key)}
                                  className="w-full min-h-[40px] rounded-xl flex items-center justify-center gap-1 text-xs font-semibold transition-all"
                                  style={{
                                    background: cell ? cell.subjectColor + "22" : "rgba(255,255,255,0.04)",
                                    color: cell ? cell.subjectColor : "rgba(255,255,255,0.2)",
                                    border: `1px solid ${cell ? cell.subjectColor + "40" : "rgba(255,255,255,0.08)"}`,
                                  }}>
                                  {cell ? (
                                    <><span>{cell.subjectIcon}</span><span className="truncate">{cell.subjectName.split(" ")[0]}</span></>
                                  ) : (
                                    <span className="opacity-40">+</span>
                                  )}
                                </button>

                                {/* Mini dropdown para editar célula */}
                                {isEditing && (
                                  <div className="absolute z-30 top-full left-0 mt-1 w-44 rounded-xl shadow-2xl overflow-hidden"
                                    style={{ background: "#0d1a3a", border: "1px solid rgba(240,192,64,0.25)" }}>
                                    <button onClick={() => assignCell(key, null)}
                                      className="w-full px-3 py-2 text-left text-xs font-semibold"
                                      style={{ color: "#f87171", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                      🗑 Limpar
                                    </button>
                                    {configs.map(sub => (
                                      <button key={sub.subjectId} onClick={() => assignCell(key, sub)}
                                        className="w-full px-3 py-2 text-left text-xs flex items-center gap-2"
                                        style={{ color: sub.color, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                        <span>{sub.icon}</span>
                                        <span className="truncate">{sub.subjectName}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Legenda */}
                <div className="px-5 py-4 flex flex-wrap gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  {configs.map(cfg => (
                    <div key={cfg.subjectId} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                      style={{ background: cfg.color + "18", color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                      <span>{cfg.icon}</span>
                      <span>{cfg.subjectName}</span>
                      <span className="opacity-60">({slotCounts[cfg.subjectId] ?? 0})</span>
                    </div>
                  ))}
                </div>

                {/* Salvar */}
                <div className="px-5 py-4 flex justify-end" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <button onClick={handleSave} disabled={saving || Object.keys(grid).length === 0}
                    className="px-8 py-3 rounded-xl font-bold text-sm disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638" }}>
                    {saving ? "Salvando…" : "💾 Salvar Cronograma"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: FREQUÊNCIA POR BIMESTRE ── */}
          {tab === "frequencia" && (
            <div className="space-y-5">
              {/* Bimestre selector */}
              <div className="flex gap-2 flex-wrap">
                {BIMESTERS.map(b => (
                  <button key={b.n} onClick={() => setBimester(b.n)}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold"
                    style={{
                      background: bimester === b.n ? "rgba(240,192,64,0.15)" : "rgba(255,255,255,0.05)",
                      color: bimester === b.n ? "#f0c040" : "rgba(255,255,255,0.4)",
                      border: `1px solid ${bimester === b.n ? "rgba(240,192,64,0.4)" : "rgba(255,255,255,0.08)"}`,
                    }}>
                    <span className="block font-bold">{b.label}</span>
                    <span className="block text-xs opacity-60">{b.range}</span>
                  </button>
                ))}
              </div>

              {loadingFreq && (
                <div className="text-center py-12">
                  <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin mx-auto"
                    style={{ borderColor: "#f0c040", borderTopColor: "transparent" }} />
                  <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.35)" }}>Carregando dados…</p>
                </div>
              )}

              {!loadingFreq && freqData && (
                <>
                  {/* Cards por disciplina */}
                  {freqData.bySubject.length === 0 ? (
                    <div className="text-center py-12 rounded-2xl"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="text-3xl mb-3">📭</div>
                      <p className="text-sm text-white">Sem chamadas registradas neste bimestre.</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {freqData.bySubject.map(sub => {
                          const total = Number(sub.total_presences) + Number(sub.total_absences) + Number(sub.total_justified);
                          const pct = total > 0 ? Math.round((Number(sub.total_presences) / total) * 100) : 0;
                          return (
                            <div key={sub.subject_id} className="rounded-2xl p-4"
                              style={{ background: sub.subject_color + "12", border: `1px solid ${sub.subject_color}30` }}>
                              <div className="flex items-center gap-3 mb-3">
                                <span className="text-2xl">{sub.subject_icon}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-white truncate">{sub.subject_name}</p>
                                  <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
                                    {sub.teacher_name ?? "—"}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold leading-none" style={{ color: pctColor(pct) }}>{pct}%</p>
                                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>presença</p>
                                </div>
                              </div>
                              <div className="h-1.5 rounded-full mb-3" style={{ background: "rgba(255,255,255,0.08)" }}>
                                <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: pctColor(pct) }} />
                              </div>
                              <div className="flex gap-3 text-xs">
                                <span style={{ color: "rgba(255,255,255,0.5)" }}>
                                  🏫 <strong className="text-white">{sub.classes_held}</strong> aulas
                                </span>
                                <span style={{ color: "#34d399" }}>
                                  ✅ <strong>{sub.total_presences}</strong>
                                </span>
                                <span style={{ color: "#f87171" }}>
                                  ❌ <strong>{sub.total_absences}</strong>
                                </span>
                                {Number(sub.total_justified) > 0 && (
                                  <span style={{ color: "#fbbf24" }}>
                                    📄 <strong>{sub.total_justified}</strong>
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Tabela geral: alunos × disciplinas */}
                      {students.length > 0 && (
                        <div className="rounded-2xl overflow-hidden"
                          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                          <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <h3 className="text-sm font-bold text-white">📊 Frequência Detalhada por Aluno</h3>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                  <th className="px-4 py-3 text-left font-semibold sticky left-0"
                                    style={{ color: "rgba(255,255,255,0.5)", background: "#080e28", minWidth: "140px" }}>
                                    Aluno
                                  </th>
                                  {freqData.bySubject.map(sub => (
                                    <th key={sub.subject_id} className="px-3 py-3 text-center font-semibold"
                                      style={{ color: sub.subject_color, minWidth: "80px" }}>
                                      {sub.subject_icon} {sub.subject_name.split(" ")[0]}
                                    </th>
                                  ))}
                                  <th className="px-3 py-3 text-center font-bold"
                                    style={{ color: "#f0c040", minWidth: "70px" }}>Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {students.map(student => {
                                  const totalPres = Number(student.presences);
                                  const totalAll  = Number(student.total);
                                  const totalPct  = totalAll > 0 ? Math.round((totalPres / totalAll) * 100) : 0;
                                  return (
                                    <tr key={student.student_id}
                                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                      <td className="px-4 py-3 font-semibold text-white sticky left-0"
                                        style={{ background: "#080e28" }}>
                                        {student.student_name}
                                      </td>
                                      {freqData.bySubject.map(sub => {
                                        const rec = freqData.byStudent.find(
                                          r => r.student_id === student.student_id && r.subject_id === sub.subject_id
                                        );
                                        if (!rec) return (
                                          <td key={sub.subject_id} className="px-3 py-3 text-center"
                                            style={{ color: "rgba(255,255,255,0.2)" }}>—</td>
                                        );
                                        const p = Number(rec.presences);
                                        const t = Number(rec.total);
                                        const pct2 = t > 0 ? Math.round((p / t) * 100) : 0;
                                        return (
                                          <td key={sub.subject_id} className="px-3 py-3 text-center font-semibold"
                                            style={{ color: pctColor(pct2) }}>
                                            {p}/{t}
                                          </td>
                                        );
                                      })}
                                      <td className="px-3 py-3 text-center font-bold"
                                        style={{ color: pctColor(totalPct) }}>
                                        {totalPct}%
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          <div className="px-5 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                              Formato: presença/total de aulas &nbsp;·&nbsp;
                              <span style={{ color: "#34d399" }}>■</span> ≥75% &nbsp;
                              <span style={{ color: "#fbbf24" }}>■</span> 60–74% &nbsp;
                              <span style={{ color: "#f87171" }}>■</span> &lt;60%
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Fechar dropdown ao clicar fora */}
      {editingCell && (
        <div className="fixed inset-0 z-20" onClick={() => setEditingCell(null)} />
      )}
    </div>
  );
}
