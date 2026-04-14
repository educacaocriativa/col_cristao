"use client";

import { useState } from "react";
import { useQuery } from "../../../_lib/useQuery";
import { subjectsApi } from "../../../_lib/api";

interface Subject {
  id: string; name: string; code: string | null; color: string;
  icon: string; active: boolean; created_at: string; school_name: string;
}

const PALETTE = [
  "#6366f1","#8b5cf6","#a78bfa","#ec4899","#f43f5e",
  "#f97316","#f0c040","#eab308","#84cc16","#22c55e",
  "#10b981","#14b8a6","#06b6d4","#3b82f6","#60a5fa",
];

const EMOJI_OPTIONS = [
  "📚","📖","✏️","🔬","🧪","🧬","🔭","🧮","📐","📏",
  "🌍","🗺️","🎨","🎭","🎵","🎼","⚽","🏊","🤸","💻",
  "📱","🖥️","🔧","⚙️","🌱","🌿","🐾","🏛️","✝️","🕊️",
];

const EMPTY = { name: "", code: "", color: "#6366f1", icon: "📚" };

export default function DisciplinasPage() {
  const [showModal,      setShowModal]      = useState(false);
  const [editing,        setEditing]        = useState<Subject | null>(null);
  const [form,           setForm]           = useState({ ...EMPTY });
  const [saving,         setSaving]         = useState(false);
  const [search,         setSearch]         = useState("");
  const [deleting,       setDeleting]       = useState<string | null>(null);
  const [reactivating,   setReactivating]   = useState<string | null>(null);
  const [showInactive,   setShowInactive]   = useState(false);

  const { data: allSubjects, loading, refetch } = useQuery<Subject[]>(
    () => subjectsApi.listAll() as Promise<Subject[]>, []
  );

  const active   = (allSubjects ?? []).filter(s => s.active);
  const inactive = (allSubjects ?? []).filter(s => !s.active);

  const list = active.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.code ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const inactiveList = inactive.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.code ?? "").toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY });
    setShowModal(true);
  }

  function openEdit(s: Subject) {
    setEditing(s);
    setForm({ name: s.name, code: s.code ?? "", color: s.color, icon: s.icon });
    setShowModal(true);
  }

  function closeModal() { setShowModal(false); setEditing(null); }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await subjectsApi.update(editing.id, {
          name: form.name.trim(),
          code: form.code.trim() || null,
          color: form.color,
          icon: form.icon,
        });
      } else {
        await subjectsApi.create({
          name: form.name.trim(),
          code: form.code.trim() || null,
          color: form.color,
          icon: form.icon,
        });
      }
      closeModal();
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar disciplina.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Desativar esta disciplina?")) return;
    setDeleting(id);
    try {
      await subjectsApi.delete(id);
      refetch();
    } catch {
      alert("Erro ao desativar disciplina.");
    } finally {
      setDeleting(null);
    }
  }

  async function handleReactivate(id: string) {
    setReactivating(id);
    try {
      await subjectsApi.reactivate(id);
      refetch();
    } catch {
      alert("Erro ao reativar disciplina.");
    } finally {
      setReactivating(null);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            Disciplinas
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            {loading ? "Carregando…" : `${active.length} ativa${active.length !== 1 ? "s" : ""}${inactive.length > 0 ? ` · ${inactive.length} desativada${inactive.length !== 1 ? "s" : ""}` : ""}`}
          </p>
        </div>
        <button onClick={openCreate}
          className="px-5 py-3 rounded-xl font-bold text-sm"
          style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif", boxShadow: "0 4px 20px rgba(240,192,64,0.3)" }}>
          + Nova Disciplina
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>🔍</span>
        <input type="text" placeholder="Buscar disciplina…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "#f0c040", borderTopColor: "transparent" }} />
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-14 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-4xl mb-3">📚</div>
          <p className="text-sm font-semibold text-white">Nenhuma disciplina encontrada.</p>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            Clique em &quot;+ Nova Disciplina&quot; para criar a primeira.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {list.map(s => (
            <div key={s.id} className="flex items-center gap-4 px-4 py-4 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              {/* Icon badge */}
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                style={{ background: `${s.color}20`, border: `1px solid ${s.color}40` }}>
                {s.icon}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm">{s.name}</p>
                {s.code && (
                  <span className="inline-block text-xs px-2 py-0.5 rounded-full mt-0.5 font-mono"
                    style={{ background: `${s.color}18`, color: s.color }}>
                    {s.code}
                  </span>
                )}
              </div>
              {/* Color dot */}
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
              {/* Actions */}
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEdit(s)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
                  style={{ background: "rgba(240,192,64,0.1)", color: "#f0c040", border: "1px solid rgba(240,192,64,0.2)" }}
                  title="Editar">
                  ✏️
                </button>
                <button onClick={() => handleDelete(s.id)}
                  disabled={deleting === s.id}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-sm disabled:opacity-40"
                  style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}
                  title="Desativar">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── DESATIVADAS ── */}
      {!loading && inactive.length > 0 && (
        <div className="space-y-3">
          <button onClick={() => setShowInactive(p => !p)}
            className="flex items-center gap-2 text-sm font-semibold"
            style={{ color: "rgba(255,255,255,0.4)" }}>
            <span>{showInactive ? "▲" : "▼"}</span>
            {inactive.length} disciplina{inactive.length !== 1 ? "s" : ""} desativada{inactive.length !== 1 ? "s" : ""}
          </button>
          {showInactive && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {inactiveList.map(s => (
                <div key={s.id} className="flex items-center gap-4 px-4 py-4 rounded-2xl opacity-60"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 grayscale"
                    style={{ background: "rgba(255,255,255,0.06)" }}>
                    {s.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm line-through">{s.name}</p>
                    {s.code && <p className="text-xs font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{s.code}</p>}
                  </div>
                  <button onClick={() => handleReactivate(s.id)}
                    disabled={reactivating === s.id}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold disabled:opacity-40"
                    style={{ background: "rgba(52,211,153,0.12)", color: "#34d399", border: "1px solid rgba(52,211,153,0.25)" }}>
                    {reactivating === s.id ? "…" : "↩ Reativar"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)" }}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="w-full max-w-md rounded-3xl p-6 space-y-5 overflow-y-auto"
            style={{ background: "#0d1a3a", border: "1px solid rgba(240,192,64,0.2)", maxHeight: "92vh" }}>

            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                {editing ? "Editar Disciplina" : "Nova Disciplina"}
              </h2>
              <button onClick={closeModal}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>✕</button>
            </div>

            {/* Preview */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{ background: `${form.color}12`, border: `1px solid ${form.color}30` }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: `${form.color}20` }}>
                {form.icon}
              </div>
              <div>
                <p className="font-bold text-white text-sm">{form.name || "Nome da disciplina"}</p>
                {form.code && <p className="text-xs font-mono mt-0.5" style={{ color: form.color }}>{form.code}</p>}
              </div>
            </div>

            {/* Nome */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Nome *</label>
              <input type="text" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Matemática, Língua Portuguesa…"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>

            {/* Código */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Código / Sigla</label>
              <input type="text" value={form.code}
                onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                placeholder="Ex: MAT, PORT, CIEN…"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>

            {/* Ícone */}
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: "rgba(255,255,255,0.5)" }}>Ícone</label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map(emoji => (
                  <button key={emoji} type="button" onClick={() => setForm(p => ({ ...p, icon: emoji }))}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{
                      background: form.icon === emoji ? `${form.color}25` : "rgba(255,255,255,0.05)",
                      border: `1px solid ${form.icon === emoji ? form.color + "60" : "rgba(255,255,255,0.08)"}`,
                    }}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Cor */}
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: "rgba(255,255,255,0.5)" }}>Cor</label>
              <div className="flex flex-wrap gap-2">
                {PALETTE.map(color => (
                  <button key={color} type="button" onClick={() => setForm(p => ({ ...p, color }))}
                    className="w-8 h-8 rounded-xl transition-transform"
                    style={{
                      background: color,
                      transform: form.color === color ? "scale(1.2)" : "scale(1)",
                      boxShadow: form.color === color ? `0 0 0 2px #0d1a3a, 0 0 0 4px ${color}` : "none",
                    }} />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button onClick={closeModal}
                className="flex-1 py-3.5 rounded-2xl font-semibold text-sm"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                Cancelar
              </button>
              <button onClick={handleSave}
                disabled={!form.name.trim() || saving}
                className="flex-1 py-3.5 rounded-2xl font-bold text-sm disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif" }}>
                {saving ? "Salvando…" : editing ? "Salvar →" : "Criar Disciplina →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
