"use client";

import { useState } from "react";
import { subjectsApi, schoolsApi } from "../../../_lib/api";
import { useQuery } from "../../../_lib/useQuery";

interface Subject {
  id: string; name: string; code: string | null; color: string | null;
  icon: string | null; active: boolean; school_name: string; school_id: string;
}
interface School { id: string; name: string; city: string; state: string; }

// ── Sub-components OUTSIDE to avoid remount ───────────────────
function Field({ label, value, onChange, placeholder = "", type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</label>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30 outline-none"
        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }} />
    </div>
  );
}

function Toggle({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 rounded-xl"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{desc}</p>
      </div>
      <button onClick={onChange}
        className="w-12 h-6 rounded-full relative transition-all duration-300 shrink-0"
        style={{ background: value ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.1)", border: `1px solid ${value ? "#34d399" : "rgba(255,255,255,0.15)"}` }}>
        <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300"
          style={{ background: value ? "#34d399" : "rgba(255,255,255,0.4)", left: value ? "calc(100% - 1.375rem)" : "0.125rem" }} />
      </button>
    </div>
  );
}

const EMPTY_SUBJECT = { name: "", code: "", color: "#6366f1", icon: "📚", school_id: "" };

const PRESET_COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#f43f5e","#f0c040","#f97316",
  "#22c55e","#14b8a6","#06b6d4","#3b82f6","#a78bfa","#94a3b8",
];

const PRESET_ICONS = ["📚","🔢","✏️","🔬","🌍","🎨","🏃","🎵","💻","⚗️","📐","🗺","🌱","🏛","📖","🧩"];

export default function ConfigPage() {
  // General config
  const [networkName, setNetworkName] = useState("Rede Colégio Cristão");
  const [aiEnabled,   setAiEnabled]   = useState(true);
  const [triEnabled,  setTriEnabled]  = useState(true);
  const [socialEnabled, setSocial]    = useState(true);
  const [saved,       setSaved]       = useState(false);

  // Subjects
  const [selectedSchool, setSelectedSchool] = useState("");
  const [subjectModal,   setSubjectModal]   = useState<"add" | "edit" | null>(null);
  const [subjectForm,    setSubjectForm]    = useState({ ...EMPTY_SUBJECT });
  const [editSubjectId,  setEditSubjectId]  = useState<string | null>(null);
  const [savingSub,      setSavingSub]      = useState(false);

  const { data: schools } = useQuery<School[]>(
    () => schoolsApi.list() as Promise<School[]>, []
  );
  const { data: subjects, loading: loadSub, refetch: refetchSub } = useQuery<Subject[]>(
    () => subjectsApi.list(selectedSchool ? { school_id: selectedSchool } : undefined) as Promise<Subject[]>,
    [selectedSchool]
  );

  function openAddSubject() {
    setSubjectForm({ ...EMPTY_SUBJECT, school_id: selectedSchool });
    setEditSubjectId(null);
    setSubjectModal("add");
  }
  function openEditSubject(s: Subject) {
    setSubjectForm({ name: s.name, code: s.code ?? "", color: s.color ?? "#6366f1", icon: s.icon ?? "📚", school_id: s.school_id });
    setEditSubjectId(s.id);
    setSubjectModal("edit");
  }

  async function handleSaveSubject() {
    if (!subjectForm.name.trim()) return;
    setSavingSub(true);
    try {
      if (subjectModal === "edit" && editSubjectId) {
        await subjectsApi.update(editSubjectId, subjectForm);
      } else {
        await subjectsApi.create(subjectForm);
      }
      setSubjectModal(null);
      refetchSub();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar disciplina.");
    } finally { setSavingSub(false); }
  }

  async function handleDeleteSubject(s: Subject) {
    if (!confirm(`Desativar "${s.name}"?`)) return;
    await subjectsApi.delete(s.id);
    refetchSub();
  }

  function save() { setSaved(true); setTimeout(() => setSaved(false), 2500); }

  return (
    <div className="p-6 space-y-6 max-w-2xl">

      {/* ── Disciplinas por escola ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">🎯 Disciplinas</h2>
          <button onClick={openAddSubject}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold"
            style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif" }}>
            + Nova Disciplina
          </button>
        </div>

        {/* School filter */}
        <div className="mb-3">
          <select value={selectedSchool} onChange={(e) => setSelectedSchool(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <option value="" style={{ background: "#0d1a3a" }}>Todas as unidades</option>
            {(schools ?? []).map((s) => (
              <option key={s.id} value={s.id} style={{ background: "#0d1a3a" }}>{s.name}</option>
            ))}
          </select>
        </div>

        {loadSub && (
          <div className="text-center py-8">
            <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto"
              style={{ borderColor: "#f0c040", borderTopColor: "transparent" }} />
          </div>
        )}

        {!loadSub && (!subjects || subjects.length === 0) && (
          <div className="text-center py-8 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)" }}>
            <p className="text-sm font-semibold text-white">Nenhuma disciplina cadastrada</p>
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
              {selectedSchool ? "Nenhuma disciplina para esta unidade." : "Selecione uma unidade ou crie a primeira disciplina."}
            </p>
          </div>
        )}

        {!loadSub && subjects && subjects.length > 0 && (
          <div className="space-y-2">
            {subjects.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ background: `${s.color ?? "#6366f1"}20`, border: `1px solid ${s.color ?? "#6366f1"}40` }}>
                  {s.icon ?? "📚"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{s.name}</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {s.code ? `${s.code} · ` : ""}{s.school_name}
                  </p>
                </div>
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color ?? "#6366f1" }} />
                <div className="flex gap-1.5">
                  <button onClick={() => openEditSubject(s)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                    style={{ background: "rgba(240,192,64,0.1)", color: "#f0c040" }}>✏️</button>
                  <button onClick={() => handleDeleteSubject(s)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                    style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="h-px" style={{ background: "rgba(255,255,255,0.07)" }} />

      {/* ── Identidade da Rede ── */}
      <section>
        <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">🏫 Identidade da Rede</h2>
        <Field label="Nome da Rede" value={networkName} onChange={setNetworkName} placeholder="Rede Colégio Cristão" />
      </section>

      {/* ── Funcionalidades ── */}
      <section>
        <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">⚙️ Funcionalidades</h2>
        <div className="space-y-2">
          <Toggle label="IA — Geração de Questões (Gemini)"
            desc="Permite que professores usem IA para gerar questões com Bloom's e TRI"
            value={aiEnabled} onChange={() => setAiEnabled((v) => !v)} />
          <Toggle label="TRI — Teoria de Resposta ao Item"
            desc="Habilita pontuação parcial e parâmetros TRI nas atividades"
            value={triEnabled} onChange={() => setTriEnabled((v) => !v)} />
          <Toggle label="Canal de Comunicação Social"
            desc="Ativa o canal de posts e comentários entre alunos e professores"
            value={socialEnabled} onChange={() => setSocial((v) => !v)} />
        </div>
      </section>

      {/* ── Gemini API ── */}
      <section>
        <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">🤖 Gemini API</h2>
        <div>
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
            API Key (criptografada)
          </label>
          <div className="flex gap-2">
            <input type="password" value="••••••••••••••••••••••••••••" readOnly
              className="flex-1 px-4 py-3 rounded-xl text-sm text-white outline-none font-mono"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(139,92,246,0.25)" }} />
            <button className="px-4 py-3 rounded-xl text-xs font-semibold"
              style={{ background: "rgba(139,92,246,0.12)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.25)" }}>
              Alterar
            </button>
          </div>
        </div>
      </section>

      <button onClick={save}
        className="w-full py-4 rounded-2xl font-bold text-sm transition-all duration-200"
        style={{
          background: saved ? "rgba(52,211,153,0.2)" : "linear-gradient(135deg,#f0c040,#eab308)",
          color: saved ? "#34d399" : "#0a1638",
          fontFamily: "'Space Grotesk',sans-serif",
          boxShadow: saved ? "none" : "0 4px 20px rgba(240,192,64,0.35)",
        }}>
        {saved ? "✅ Configurações Salvas!" : "💾 Salvar Configurações"}
      </button>

      {/* ── Subject Modal ── */}
      {subjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setSubjectModal(null); }}>
          <div className="w-full max-w-md rounded-3xl p-6 space-y-4"
            style={{ background: "#0d1a3a", border: "1px solid rgba(240,192,64,0.2)" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                {subjectModal === "edit" ? "Editar Disciplina" : "Nova Disciplina"}
              </h2>
              <button onClick={() => setSubjectModal(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>✕</button>
            </div>

            {/* School selector (only on add) */}
            {subjectModal === "add" && (
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Unidade *</label>
                <select value={subjectForm.school_id} onChange={(e) => setSubjectForm((p) => ({ ...p, school_id: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <option value="" style={{ background: "#0d1a3a" }}>Selecionar unidade…</option>
                  {(schools ?? []).map((s) => (
                    <option key={s.id} value={s.id} style={{ background: "#0d1a3a" }}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            <Field label="Nome da Disciplina *" value={subjectForm.name}
              placeholder="Ex: Matemática" onChange={(v) => setSubjectForm((p) => ({ ...p, name: v }))} />
            <Field label="Código" value={subjectForm.code}
              placeholder="Ex: MAT" onChange={(v) => setSubjectForm((p) => ({ ...p, code: v }))} />

            {/* Icon picker */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Ícone</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_ICONS.map((ic) => (
                  <button key={ic} type="button" onClick={() => setSubjectForm((p) => ({ ...p, icon: ic }))}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                    style={{ background: subjectForm.icon === ic ? "rgba(240,192,64,0.2)" : "rgba(255,255,255,0.05)", border: `1px solid ${subjectForm.icon === ic ? "rgba(240,192,64,0.4)" : "rgba(255,255,255,0.08)"}` }}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Cor</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setSubjectForm((p) => ({ ...p, color: c }))}
                    className="w-7 h-7 rounded-lg"
                    style={{ background: c, border: subjectForm.color === c ? "3px solid white" : "2px solid transparent", outline: subjectForm.color === c ? `2px solid ${c}` : "none" }} />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                style={{ background: `${subjectForm.color}20`, border: `1px solid ${subjectForm.color}40` }}>
                {subjectForm.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{subjectForm.name || "Nome da Disciplina"}</p>
                {subjectForm.code && <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{subjectForm.code}</p>}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setSubjectModal(null)}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                Cancelar
              </button>
              <button onClick={handleSaveSubject}
                disabled={!subjectForm.name.trim() || (subjectModal === "add" && !subjectForm.school_id) || savingSub}
                className="flex-1 py-3 rounded-2xl font-bold text-sm disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif" }}>
                {savingSub ? "Salvando…" : subjectModal === "edit" ? "Salvar →" : "Criar →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
