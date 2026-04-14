"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { diarioApi, turmasApi } from "../../../../../_lib/api";
import { useQuery } from "../../../../../_lib/useQuery";

interface Subject { id: string; subject_id: string; name: string; color: string; }
interface TurmaBase { full_name: string; subjects: Subject[]; }

interface DiaryEntry {
  id: string;
  date: string;
  content: string;
  objectives: string | null;
  methodology: string | null;
  resources: string | null;
  subject_name: string;
  subject_color: string;
  teacher_name: string;
}

interface EditState {
  id?: string;
  date: string;
  subject_id: string;
  content: string;
  objectives: string;
  methodology: string;
  resources: string;
}

export default function DiarioPage({ params }: { params: Promise<{ turmaId: string }> }) {
  const { turmaId } = use(params);
  const router = useRouter();

  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  const { data: turma } = useQuery<TurmaBase>(
    () => turmasApi.get(turmaId) as Promise<TurmaBase>,
    [turmaId]
  );

  // Auto-open from chamada redirect (reads ?date=&subject_id= on client)
  useEffect(() => {
    if (typeof window === "undefined" || editing) return;
    const sp = new URLSearchParams(window.location.search);
    const preDate = sp.get("date");
    const preSubjectId = sp.get("subject_id");
    if (preDate && preSubjectId) {
      setEditing({
        date: preDate,
        subject_id: preSubjectId,
        content: "",
        objectives: "",
        methodology: "",
        resources: "",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: entries, loading, refetch } = useQuery<DiaryEntry[]>(
    () => diarioApi.list({ class_id: turmaId }) as Promise<DiaryEntry[]>,
    [turmaId]
  );

  function openNew() {
    const firstSubject = turma?.subjects[0];
    setEditing({
      date: new Date().toISOString().split("T")[0],
      subject_id: firstSubject?.subject_id ?? "",
      content: "",
      objectives: "",
      methodology: "",
      resources: "",
    });
    setSaved(false);
  }

  function openEdit(e: DiaryEntry) {
    const sub = turma?.subjects.find((s) => s.name === e.subject_name);
    setEditing({
      id: e.id,
      date: e.date,
      subject_id: sub?.subject_id ?? "",
      content: e.content,
      objectives: e.objectives ?? "",
      methodology: e.methodology ?? "",
      resources: e.resources ?? "",
    });
    setSaved(false);
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.id) {
        await diarioApi.update(editing.id, {
          content: editing.content,
          objectives: editing.objectives || null,
          methodology: editing.methodology || null,
          resources: editing.resources || null,
        });
      } else {
        await diarioApi.create({
          class_id: turmaId,
          subject_id: editing.subject_id,
          date: editing.date,
          content: editing.content,
          objectives: editing.objectives || null,
          methodology: editing.methodology || null,
          resources: editing.resources || null,
        });
      }
      setSaved(true);
      refetch();
      setTimeout(() => { setSaved(false); setEditing(null); }, 1200);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta entrada do diário?")) return;
    await diarioApi.delete(id);
    refetch();
  }

  const activeSubject = turma?.subjects.find((s) => s.subject_id === editing?.subject_id);

  // ── EDIT FORM ────────────────────────────────────────────
  if (editing) {
    return (
      <div className="p-6 space-y-5">
        <div>
          <button onClick={() => setEditing(null)} className="text-xs mb-3 flex items-center gap-1"
            style={{ color: "rgba(255,255,255,0.4)" }}>
            ← Diário
          </button>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            {editing.id ? "Editar Entrada" : "Nova Entrada"}
          </h1>
          <p className="text-xs" style={{ color: "#a78bfa" }}>{turma?.full_name}</p>
        </div>

        <div className="space-y-4">
          {/* Date + Subject row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Data da Aula</label>
              <input type="date" value={editing.date}
                onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Disciplina</label>
              <select value={editing.subject_id}
                onChange={(e) => setEditing({ ...editing, subject_id: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
                {turma?.subjects.map((s) => (
                  <option key={s.subject_id} value={s.subject_id} style={{ background: "#0a1638" }}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Relato da Aula *</label>
            <textarea rows={4} placeholder="Descreva o que aconteceu na aula…"
              value={editing.content}
              onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${activeSubject?.color || "#a78bfa"}40` }}
            />
          </div>

          {/* Objectives */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Objetivos da Aula</label>
            <input type="text" placeholder="Quais objetivos foram trabalhados?"
              value={editing.objectives}
              onChange={(e) => setEditing({ ...editing, objectives: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30 outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
          </div>

          {/* Methodology */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Metodologia Utilizada</label>
            <input type="text" placeholder="Ex: Exposição dialogada, trabalho em grupos…"
              value={editing.methodology}
              onChange={(e) => setEditing({ ...editing, methodology: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30 outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
          </div>

          {/* Resources */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Recursos Utilizados</label>
            <input type="text" placeholder="Ex: Livro pág. 45, projetor, material concreto…"
              value={editing.resources}
              onChange={(e) => setEditing({ ...editing, resources: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30 outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={() => setEditing(null)}
            className="flex-1 py-3.5 rounded-2xl font-semibold text-sm"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={!editing.content.trim() || saving}
            className="flex-1 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 disabled:opacity-50"
            style={{
              background: saved ? "rgba(52,211,153,0.2)" : "linear-gradient(135deg,#f0c040,#eab308)",
              color: saved ? "#34d399" : "#0a1638",
              fontFamily: "'Space Grotesk',sans-serif",
              boxShadow: saved ? "none" : "0 4px 20px rgba(240,192,64,0.35)",
            }}>
            {saving ? "Salvando…" : saved ? "✅ Salvo!" : "💾 Salvar Entrada"}
          </button>
        </div>
      </div>
    );
  }

  // ── LIST VIEW ────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5">
      <div>
        <button onClick={() => router.back()} className="text-xs mb-3 flex items-center gap-1"
          style={{ color: "rgba(255,255,255,0.4)" }}>
          ← {turma?.full_name ?? "Turma"}
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: "rgba(139,92,246,0.15)" }}>
              📔
            </div>
            <div>
              <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                Diário de Bordo
              </h1>
              <p className="text-xs" style={{ color: "#a78bfa" }}>{turma?.full_name}</p>
            </div>
          </div>
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "rgba(240,192,64,0.15)", color: "#f0c040", border: "1px solid rgba(240,192,64,0.3)" }}>
            + Nova Entrada
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto"
            style={{ borderColor: "#a78bfa", borderTopColor: "transparent" }} />
        </div>
      )}

      {!loading && (!entries || entries.length === 0) && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="text-4xl">📔</span>
          <p className="text-sm font-semibold text-white">Nenhuma entrada ainda.</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Registre o que aconteceu em suas aulas.</p>
          <button onClick={openNew} className="mt-2 px-6 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "rgba(240,192,64,0.15)", color: "#f0c040" }}>
            Criar Primeira Entrada
          </button>
        </div>
      )}

      {!loading && entries && entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="rounded-2xl overflow-hidden"
              style={{ background: `${entry.subject_color || "#a78bfa"}0d`, border: `1px solid ${entry.subject_color || "#a78bfa"}35` }}>
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-xs font-bold" style={{ color: entry.subject_color || "#a78bfa" }}>
                      {new Date(entry.date + "T12:00:00").toLocaleDateString("pt-BR", {
                        weekday: "long", day: "2-digit", month: "long", year: "numeric"
                      })}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{entry.subject_name}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => openEdit(entry)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                      style={{ background: "rgba(240,192,64,0.1)", color: "#f0c040" }}>
                      ✏️
                    </button>
                    <button onClick={() => handleDelete(entry.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                      style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>
                      🗑
                    </button>
                  </div>
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
          ))}
        </div>
      )}
    </div>
  );
}
