"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { turmasApi, gradeItemsApi } from "../../../../../_lib/api";
import { useQuery } from "../../../../../_lib/useQuery";
import { getInitials, getScoreColor } from "../../../../_lib/dashboardUtils";

const BIMESTERS = [1, 2, 3, 4];

interface Subject { id: string; subject_id: string; name: string; color: string; }
interface Student { id: string; name: string; }
interface TurmaBase {
  full_name: string; subjects: Subject[]; students: Student[];
  academic_year_id: string; academic_year: number;
}

interface GradeItem {
  id: string; item_type: "sala" | "expedicao"; name: string; date: string | null;
  content: string | null; max_score: number; max_coins: number; bimester: number;
  subject_id: string; subject_name: string; subject_color: string;
  activity_id: string | null; activity_title: string | null;
  activity_max_score: number | null; completed_count: number;
}
interface ItemScore {
  item_id: string; student_id: string; student_name: string;
  score: number | null; activity_status?: string; finished_at?: string;
}
interface GradeData { items: GradeItem[]; scores: ItemScore[]; autoScores: ItemScore[]; }

interface ActivityOption {
  id: string; title: string; activity_type: string; bimester: number | null;
  max_score: number; published: boolean; subject_name: string; subject_color: string;
  question_count: number; completed_count: number;
}

const BLANK_ITEM = {
  item_type: "sala" as "sala" | "expedicao",
  name: "", date: "", content: "", max_score: 10, max_coins: 0, activity_id: "",
};

export default function NotasPage({ params }: { params: Promise<{ turmaId: string }> }) {
  const { turmaId } = use(params);
  const router = useRouter();

  const [activeBimester, setActiveBimester] = useState(1);
  const [subjectId, setSubjectId]           = useState<string>("");
  const [showAddItem, setShowAddItem]       = useState(false);
  const [editingItem, setEditingItem]       = useState<GradeItem | null>(null);
  const [itemForm, setItemForm]             = useState<typeof BLANK_ITEM>({ ...BLANK_ITEM });
  const [savingItem, setSavingItem]         = useState(false);
  const [scoreEdits, setScoreEdits]         = useState<Record<string, Record<string, string>>>({});
  const [savingScores, setSavingScores]     = useState<string | null>(null);
  const [expandedItem, setExpandedItem]     = useState<string | null>(null);

  const { data: turma } = useQuery<TurmaBase>(
    () => turmasApi.get(turmaId) as Promise<TurmaBase>,
    [turmaId]
  );

  useEffect(() => {
    if (turma?.subjects.length && !subjectId) {
      setSubjectId(turma.subjects[0].subject_id);
    }
  }, [turma, subjectId]);

  const { data: gradeData, loading, refetch } = useQuery<GradeData>(
    subjectId
      ? () => gradeItemsApi.list(turmaId, { subject_id: subjectId, bimester: String(activeBimester) }) as Promise<GradeData>
      : null,
    [turmaId, subjectId, activeBimester]
  );

  // Activities available for linking (expedition type)
  const { data: availableActivities } = useQuery<ActivityOption[]>(
    subjectId && showAddItem && itemForm.item_type === "expedicao"
      ? () => gradeItemsApi.activitiesForGrading(turmaId, { subject_id: subjectId }) as Promise<ActivityOption[]>
      : null,
    [turmaId, subjectId, showAddItem, itemForm.item_type]
  );

  // Sync manual score edits
  useEffect(() => {
    if (!gradeData) return;
    const edits: Record<string, Record<string, string>> = {};
    gradeData.items
      .filter((i) => i.item_type === "sala")
      .forEach((item) => {
        edits[item.id] = {};
        gradeData.scores
          .filter((s) => s.item_id === item.id)
          .forEach((s) => { edits[item.id][s.student_id] = s.score !== null ? String(s.score) : ""; });
      });
    setScoreEdits(edits);
  }, [gradeData]);

  const students = turma?.students ?? [];
  const items = gradeData?.items ?? [];
  const activeSubject = turma?.subjects.find((s) => s.subject_id === subjectId);
  const subjectColor = activeSubject?.color || "#f0c040";

  // Per-student totals across items in this bimester
  function studentTotal(studentId: string) {
    let total = 0;
    items.forEach((item) => {
      if (item.item_type === "sala") {
        const v = scoreEdits[item.id]?.[studentId];
        if (v !== undefined && v !== "") total += Number(v);
      } else {
        const auto = gradeData?.autoScores.find(
          (s) => s.item_id === item.id && s.student_id === studentId
        );
        if (auto?.score != null) {
          // Scale activity score to item max_score
          const actMax = item.activity_max_score ?? 100;
          total += (auto.score / actMax) * item.max_score;
        }
      }
    });
    return total;
  }

  const maxTotal = items.reduce((s, i) => s + i.max_score, 0);

  async function handleSaveItem() {
    if (!itemForm.name.trim() || !itemForm.max_score) return;
    if (itemForm.item_type === "expedicao" && !itemForm.activity_id) return;
    setSavingItem(true);
    try {
      const payload = {
        ...itemForm,
        subject_id: subjectId,
        bimester: activeBimester,
        academic_year_id: turma?.academic_year_id,
        activity_id: itemForm.item_type === "expedicao" ? itemForm.activity_id : null,
      };
      if (editingItem) {
        await gradeItemsApi.update(turmaId, editingItem.id, payload);
      } else {
        await gradeItemsApi.create(turmaId, payload);
      }
      setShowAddItem(false);
      setEditingItem(null);
      setItemForm({ ...BLANK_ITEM });
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar avaliação.");
    } finally {
      setSavingItem(false);
    }
  }

  async function handleDeleteItem(id: string) {
    if (!confirm("Remover esta avaliação e todas as notas?")) return;
    await gradeItemsApi.delete(turmaId, id);
    refetch();
  }

  async function handleSaveScores(itemId: string) {
    setSavingScores(itemId);
    try {
      const scores = students.map((s) => ({
        student_id: s.id,
        score: scoreEdits[itemId]?.[s.id] !== undefined && scoreEdits[itemId][s.id] !== ""
          ? Number(scoreEdits[itemId][s.id])
          : null,
      }));
      await gradeItemsApi.saveScores(turmaId, itemId, scores);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar notas.");
    } finally {
      setSavingScores(null);
    }
  }

  function openEditItem(item: GradeItem) {
    setEditingItem(item);
    setItemForm({
      item_type: item.item_type,
      name: item.name,
      date: item.date ?? "",
      content: item.content ?? "",
      max_score: item.max_score,
      max_coins: item.max_coins ?? 0,
      activity_id: item.activity_id ?? "",
    });
    setShowAddItem(true);
  }

  function closeModal() {
    setShowAddItem(false);
    setEditingItem(null);
    setItemForm({ ...BLANK_ITEM });
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <button onClick={() => router.back()} className="text-xs mb-3 flex items-center gap-1"
          style={{ color: "rgba(255,255,255,0.4)" }}>
          ← {turma?.full_name ?? "Turma"}
        </button>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: `${subjectColor}20` }}>⭐</div>
            <div>
              <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                Notas
              </h1>
              <p className="text-xs" style={{ color: subjectColor }}>
                {turma?.full_name}{activeSubject ? ` — ${activeSubject.name}` : ""}
              </p>
            </div>
          </div>
          <button onClick={() => { setShowAddItem(true); setEditingItem(null); setItemForm({ ...BLANK_ITEM }); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "rgba(240,192,64,0.15)", color: "#f0c040", border: "1px solid rgba(240,192,64,0.3)" }}>
            + Nova Avaliação
          </button>
        </div>
      </div>

      {/* Subject tabs */}
      {turma?.subjects && turma.subjects.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {turma.subjects.map((sub) => (
            <button key={sub.subject_id}
              onClick={() => setSubjectId(sub.subject_id)}
              className="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0"
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

      {/* Bimester tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {BIMESTERS.map((b) => (
          <button key={b} onClick={() => setActiveBimester(b)}
            className="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0"
            style={{
              background: activeBimester === b ? "rgba(240,192,64,0.2)" : "rgba(255,255,255,0.05)",
              color: activeBimester === b ? "#f0c040" : "rgba(255,255,255,0.45)",
              border: `1px solid ${activeBimester === b ? "rgba(240,192,64,0.4)" : "rgba(255,255,255,0.08)"}`,
            }}>
            {b}º Bimestre
          </button>
        ))}
      </div>

      {/* Total max pts warning */}
      {items.length > 0 && (
        <div className="flex gap-3 flex-wrap items-center">
          <div className="px-4 py-2 rounded-xl text-xs"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <span style={{ color: "rgba(255,255,255,0.4)" }}>Avaliações: </span>
            <span className="font-bold text-white">{items.length}</span>
          </div>
          <div className="px-4 py-2 rounded-xl text-xs"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <span style={{ color: "rgba(255,255,255,0.4)" }}>Peso total: </span>
            <span className="font-bold" style={{ color: maxTotal > 100 ? "#f87171" : "#f0c040" }}>{maxTotal} pts</span>
            {maxTotal > 100 && <span className="ml-1" style={{ color: "#f87171" }}>⚠ Excede 100</span>}
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto"
            style={{ borderColor: "#f0c040", borderTopColor: "transparent" }} />
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center rounded-2xl"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="text-4xl">📝</span>
          <p className="text-sm font-bold text-white">Nenhuma avaliação neste bimestre.</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            Crie avaliações em sala ou vincule expedições para registrar notas.
          </p>
          <button onClick={() => { setShowAddItem(true); setEditingItem(null); setItemForm({ ...BLANK_ITEM }); }}
            className="px-5 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "rgba(240,192,64,0.15)", color: "#f0c040" }}>
            + Nova Avaliação
          </button>
        </div>
      )}

      {/* Items */}
      {!loading && items.map((item) => {
        const isExpedicao = item.item_type === "expedicao";
        const isOpen = expandedItem === item.id;
        const itemColor = isExpedicao ? "#a78bfa" : "#60a5fa";

        // For expedição: scores from autoScores
        const autoScoresForItem = (gradeData?.autoScores ?? []).filter((s) => s.item_id === item.id);
        const completedStudents = autoScoresForItem.filter((s) => s.activity_status === "completed").length;
        const scoredCount = isExpedicao
          ? completedStudents
          : students.filter((s) => scoreEdits[item.id]?.[s.id] !== undefined && scoreEdits[item.id]?.[s.id] !== "").length;

        return (
          <div key={item.id} className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${itemColor}25` }}>
            {/* Item header */}
            <div className="flex items-center gap-3 px-5 py-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0"
                style={{ background: `${itemColor}20`, color: itemColor }}>
                {isExpedicao ? "🚀" : "📝"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-white">{item.name}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: `${itemColor}15`, color: itemColor }}>
                    {isExpedicao ? "Expedição" : "Em Sala"}
                  </span>
                  {isExpedicao && item.activity_title && (
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)" }}>
                      📋 {item.activity_title}
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {item.max_score} pts
                  {item.date ? ` · ${new Date(item.date + "T12:00:00").toLocaleDateString("pt-BR")}` : ""}
                  {item.content ? ` · ${item.content}` : ""}
                  {isExpedicao
                    ? ` · ${completedStudents}/${students.length} concluíram`
                    : ` · ${scoredCount}/${students.length} lançados`}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEditItem(item)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-xs"
                  style={{ background: "rgba(240,192,64,0.1)", color: "#f0c040" }}>✏️</button>
                <button onClick={() => handleDeleteItem(item.id)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-xs"
                  style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>🗑</button>
                <button onClick={() => setExpandedItem(isOpen ? null : item.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                  style={{ background: `${itemColor}15`, color: itemColor }}>
                  {isOpen ? "Fechar" : "Ver Notas"}
                </button>
              </div>
            </div>

            {/* Score panel */}
            {isOpen && (
              <div className="border-t px-5 py-4 space-y-2"
                style={{ borderColor: `${itemColor}20` }}>

                {/* EXPEDIÇÃO — auto scores, read-only */}
                {isExpedicao && (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs px-3 py-1 rounded-full font-semibold"
                        style={{ background: "rgba(139,92,246,0.12)", color: "#a78bfa" }}>
                        🤖 Notas automáticas — importadas das respostas dos alunos
                      </span>
                    </div>
                    {students.length === 0 && (
                      <p className="text-xs text-center py-4" style={{ color: "rgba(255,255,255,0.3)" }}>
                        Nenhum aluno na turma.
                      </p>
                    )}
                    {students.map((st) => {
                      const autoScore = autoScoresForItem.find((s) => s.student_id === st.id);
                      const score = autoScore?.score ?? null;
                      const actMax = item.activity_max_score ?? 100;
                      const scaledScore = score !== null ? (score / actMax) * item.max_score : null;
                      const pct = scaledScore !== null ? (scaledScore / item.max_score) * 100 : null;
                      const status = autoScore?.activity_status;
                      return (
                        <div key={st.id} className="flex items-center gap-3 py-2 px-3 rounded-xl"
                          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: `${itemColor}15`, color: itemColor }}>
                            {getInitials(st.name)}
                          </div>
                          <p className="flex-1 text-sm text-white truncate">{st.name}</p>
                          <div className="flex items-center gap-2 shrink-0">
                            {!status || status === "pending" ? (
                              <span className="text-xs px-2 py-1 rounded-lg"
                                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }}>
                                Não realizado
                              </span>
                            ) : status === "in_progress" ? (
                              <span className="text-xs px-2 py-1 rounded-lg"
                                style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24" }}>
                                Em andamento
                              </span>
                            ) : (
                              <>
                                <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                                  Bruto: {score?.toFixed(1)}
                                </span>
                                <span className="text-sm font-bold px-3 py-1 rounded-lg"
                                  style={{
                                    background: pct !== null ? `${getScoreColor(pct)}15` : "rgba(255,255,255,0.06)",
                                    color: pct !== null ? getScoreColor(pct) : "rgba(255,255,255,0.4)",
                                  }}>
                                  {scaledScore !== null ? scaledScore.toFixed(1) : "—"}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-xs pt-2 text-center" style={{ color: "rgba(255,255,255,0.2)" }}>
                      As notas são atualizadas automaticamente conforme os alunos realizam a expedição.
                    </p>
                  </>
                )}

                {/* SALA — manual score entry */}
                {!isExpedicao && (
                  <>
                    <p className="text-xs font-semibold mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Nota máx: {item.max_score} pts
                    </p>
                    {students.map((st) => {
                      const val = scoreEdits[item.id]?.[st.id] ?? "";
                      const numVal = val !== "" ? Number(val) : undefined;
                      const pct = numVal !== undefined ? (numVal / item.max_score) * 100 : undefined;
                      return (
                        <div key={st.id} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: `${itemColor}15`, color: itemColor }}>
                            {getInitials(st.name)}
                          </div>
                          <p className="flex-1 text-sm text-white truncate">{st.name}</p>
                          <input
                            type="number" min="0" max={item.max_score} placeholder="—"
                            value={val}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const clamped = raw === "" ? "" : String(Math.min(item.max_score, Math.max(0, Number(raw))));
                              setScoreEdits((prev) => ({
                                ...prev,
                                [item.id]: { ...(prev[item.id] ?? {}), [st.id]: clamped },
                              }));
                            }}
                            className="w-16 text-center py-1.5 rounded-lg text-sm font-bold text-white outline-none shrink-0"
                            style={{
                              background: "rgba(255,255,255,0.08)",
                              border: `1px solid ${pct !== undefined ? getScoreColor(pct) + "60" : "rgba(255,255,255,0.12)"}`,
                              color: pct !== undefined ? getScoreColor(pct) : "rgba(255,255,255,0.5)",
                            }}
                          />
                        </div>
                      );
                    })}
                    <button onClick={() => handleSaveScores(item.id)}
                      disabled={savingScores === item.id}
                      className="w-full mt-3 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
                      style={{ background: `linear-gradient(135deg,${itemColor},${itemColor}cc)`, color: "#fff" }}>
                      {savingScores === item.id ? "Salvando…" : "💾 Salvar Notas"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Summary table */}
      {!loading && items.length > 0 && students.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "rgba(255,255,255,0.3)" }}>
            Resumo — {activeBimester}º Bimestre
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ borderCollapse: "separate", borderSpacing: "0 4px" }}>
              <thead>
                <tr>
                  <th className="text-left px-3 py-2 font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>Aluno</th>
                  {items.map((item) => (
                    <th key={item.id} className="text-center px-2 py-2 font-semibold"
                      style={{ color: item.item_type === "expedicao" ? "#a78bfa" : "rgba(255,255,255,0.35)" }}
                      title={item.name}>
                      <div className="truncate" style={{ maxWidth: 70 }}>
                        {item.item_type === "expedicao" ? "🚀 " : ""}{item.name.split(" ").slice(0, 2).join(" ")}
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 10 }}>/{item.max_score}</div>
                    </th>
                  ))}
                  <th className="text-center px-2 py-2 font-semibold" style={{ color: "#f0c040" }}>
                    Total<div style={{ fontSize: 10 }}>/{maxTotal}</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map((st) => {
                  const total = studentTotal(st.id);
                  const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
                  return (
                    <tr key={st.id}>
                      <td className="px-3 py-2 text-white rounded-l-lg truncate max-w-28"
                        style={{ background: "rgba(255,255,255,0.03)" }}>
                        {st.name.split(" ").slice(0, 2).join(" ")}
                      </td>
                      {items.map((item) => {
                        let scoreVal: number | null = null;
                        if (item.item_type === "sala") {
                          const v = scoreEdits[item.id]?.[st.id];
                          scoreVal = v !== undefined && v !== "" ? Number(v) : null;
                        } else {
                          const auto = gradeData?.autoScores.find((s) => s.item_id === item.id && s.student_id === st.id);
                          if (auto?.score != null && auto.activity_status === "completed") {
                            const actMax = item.activity_max_score ?? 100;
                            scoreVal = (auto.score / actMax) * item.max_score;
                          }
                        }
                        const p = scoreVal !== null ? (scoreVal / item.max_score) * 100 : null;
                        return (
                          <td key={item.id} className="text-center px-2 py-2"
                            style={{ background: "rgba(255,255,255,0.03)", color: p !== null ? getScoreColor(p) : "rgba(255,255,255,0.2)" }}>
                            {scoreVal !== null ? scoreVal.toFixed(1) : "—"}
                          </td>
                        );
                      })}
                      <td className="text-center px-2 py-2 font-bold rounded-r-lg"
                        style={{ background: "rgba(255,255,255,0.03)", color: maxTotal > 0 ? getScoreColor(pct) : "rgba(255,255,255,0.2)" }}>
                        {maxTotal > 0 ? total.toFixed(1) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Add/Edit Item Modal */}
      {showAddItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="w-full max-w-md rounded-3xl p-6 space-y-5 overflow-y-auto max-h-[92vh]"
            style={{ background: "#0d1a3a", border: "1px solid rgba(240,192,64,0.2)" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                {editingItem ? "Editar Avaliação" : "Nova Avaliação"}
              </h2>
              <button onClick={closeModal}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>✕</button>
            </div>

            {/* Type toggle */}
            <div className="grid grid-cols-2 gap-3">
              {([
                ["sala",      "📝 Em Sala",   "#60a5fa", "Lançamento manual de nota"],
                ["expedicao", "🚀 Expedição", "#a78bfa", "Nota automática da atividade"],
              ] as const).map(([t, label, color, hint]) => (
                <button key={t} onClick={() => setItemForm((p) => ({ ...p, item_type: t, activity_id: "" }))}
                  className="flex flex-col items-start px-4 py-3 rounded-xl text-sm font-bold transition-all text-left"
                  style={{
                    background: itemForm.item_type === t ? `${color}20` : "rgba(255,255,255,0.05)",
                    color: itemForm.item_type === t ? color : "rgba(255,255,255,0.4)",
                    border: `1px solid ${itemForm.item_type === t ? color + "50" : "rgba(255,255,255,0.08)"}`,
                  }}>
                  {label}
                  <span className="text-xs font-normal mt-0.5 opacity-70">{hint}</span>
                </button>
              ))}
            </div>

            {/* Common fields */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Nome *</label>
                <input type="text" placeholder="Ex: Prova 1, Trabalho de Grupo…"
                  value={itemForm.name}
                  onChange={(e) => setItemForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>

              {/* SALA: date + max_score + content */}
              {itemForm.item_type === "sala" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Data</label>
                      <input type="date" value={itemForm.date}
                        onChange={(e) => setItemForm((p) => ({ ...p, date: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Pontuação Máx *</label>
                      <input type="number" min="1" max="100" value={itemForm.max_score}
                        onChange={(e) => setItemForm((p) => ({ ...p, max_score: Number(e.target.value) }))}
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#f0c040" }}>
                      ⭐ Moedas Estelares (proporcional à nota)
                    </label>
                    <input type="number" min="0" max="9999" value={itemForm.max_coins}
                      onChange={(e) => setItemForm((p) => ({ ...p, max_coins: Number(e.target.value) }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                      style={{ background: "rgba(240,192,64,0.07)", border: "1px solid rgba(240,192,64,0.2)" }}
                      placeholder="0 = sem moedas"
                    />
                    <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Aluno com nota máxima recebe {itemForm.max_coins} moedas. Notas menores recebem proporcional.
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Conteúdo Avaliado</label>
                    <input type="text" placeholder="Ex: Frações, Cap. 3 e 4…"
                      value={itemForm.content}
                      onChange={(e) => setItemForm((p) => ({ ...p, content: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                      style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                  </div>
                </>
              )}

              {/* EXPEDIÇÃO: activity picker + weight */}
              {itemForm.item_type === "expedicao" && (
                <>
                  <div>
                    <label className="text-xs font-semibold mb-2 block" style={{ color: "#a78bfa" }}>
                      🚀 Selecione a Expedição *
                    </label>
                    {(!availableActivities || availableActivities.length === 0) ? (
                      <div className="px-4 py-5 rounded-xl text-center"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <p className="text-sm text-white">Nenhuma expedição encontrada para esta disciplina.</p>
                        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                          Crie uma atividade em Expedições primeiro.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {availableActivities.map((act) => (
                          <button key={act.id}
                            onClick={() => setItemForm((p) => ({
                              ...p,
                              activity_id: act.id,
                              max_score: p.max_score || 10,
                              name: p.name || act.title,
                            }))}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-150"
                            style={{
                              background: itemForm.activity_id === act.id ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.03)",
                              border: `1px solid ${itemForm.activity_id === act.id ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.07)"}`,
                            }}>
                            <span className="text-xl shrink-0">🚀</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{act.title}</p>
                              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                                {act.question_count} questões · {act.completed_count} alunos já concluíram
                                {act.bimester ? ` · ${act.bimester}º Bim.` : ""}
                                {!act.published ? " · ⚠ não publicada" : ""}
                              </p>
                            </div>
                            {itemForm.activity_id === act.id && (
                              <span className="text-xs font-bold shrink-0" style={{ color: "#a78bfa" }}>✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                      Peso desta expedição na nota (pts) *
                    </label>
                    <input type="number" min="1" max="100" value={itemForm.max_score}
                      onChange={(e) => setItemForm((p) => ({ ...p, max_score: Number(e.target.value) }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                      style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(139,92,246,0.25)" }}
                    />
                    <p className="text-xs mt-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                      A pontuação bruta da atividade será convertida proporcionalmente para este peso.
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={closeModal}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                Cancelar
              </button>
              <button onClick={handleSaveItem}
                disabled={
                  !itemForm.name.trim() || !itemForm.max_score || savingItem ||
                  (itemForm.item_type === "expedicao" && !itemForm.activity_id)
                }
                className="flex-1 py-3 rounded-2xl font-bold text-sm disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif" }}>
                {savingItem ? "Salvando…" : editingItem ? "Salvar" : "Criar Avaliação →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
