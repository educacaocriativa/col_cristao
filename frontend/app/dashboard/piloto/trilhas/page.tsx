"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trilhasApi, turmasApi } from "../../../_lib/api";
import { useQuery } from "../../../_lib/useQuery";

interface Trail {
  id: string;
  title: string;
  description: string | null;
  bimester: number | null;
  published: boolean;
  subject_name: string;
  subject_color: string;
  subject_icon: string;
  class_name: string | null;
  step_count: number;
}

interface Turma {
  id: string;
  full_name: string;
  subjects: { id: string; subject_id: string; name: string; color: string; }[];
}

export default function TrilhasPage() {
  const router = useRouter();
  const [showNew, setShowNew]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", subject_id: "", class_id: "", bimester: "",
  });

  const { data: trails, loading, refetch } = useQuery<Trail[]>(
    () => trilhasApi.list() as Promise<Trail[]>,
    []
  );

  const { data: turmas } = useQuery<Turma[]>(
    () => turmasApi.list() as Promise<Turma[]>,
    []
  );

  const allSubjects = turmas?.flatMap((t) =>
    t.subjects.map((s) => ({ ...s, class_id: t.id, class_name: t.full_name }))
  ) ?? [];

  async function handleCreate() {
    if (!form.title.trim() || !form.subject_id) return;
    setSaving(true);
    try {
      const created = await trilhasApi.create({
        title: form.title,
        description: form.description || null,
        subject_id: form.subject_id,
        class_id: form.class_id || null,
        bimester: form.bimester ? Number(form.bimester) : null,
      }) as { id: string };
      setShowNew(false);
      setForm({ title: "", description: "", subject_id: "", class_id: "", bimester: "" });
      router.push(`/dashboard/piloto/trilhas/${created.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao criar trilha.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(trail: Trail) {
    await trilhasApi.update(trail.id, {
      title: trail.title,
      description: trail.description,
      bimester: trail.bimester,
      published: !trail.published,
    });
    refetch();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta trilha? Todos os passos e progressos serão perdidos.")) return;
    await trilhasApi.delete(id);
    refetch();
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            Trilhas de Aprendizagem
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            Crie percursos estilo Duolingo para seus alunos
          </p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm"
          style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif", boxShadow: "0 4px 20px rgba(240,192,64,0.3)" }}>
          + Nova Trilha
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: "🛤️", label: "Trilhas",      value: trails?.length ?? 0,                          color: "#f0c040" },
          { icon: "✅", label: "Publicadas",   value: trails?.filter((t) => t.published).length ?? 0, color: "#34d399" },
          { icon: "📝", label: "Rascunhos",    value: trails?.filter((t) => !t.published).length ?? 0, color: "#a78bfa" },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center py-3 rounded-xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <span className="text-xl mb-1">{s.icon}</span>
            <p className="text-xl font-bold" style={{ color: s.color, fontFamily: "'Space Grotesk',sans-serif" }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto"
            style={{ borderColor: "#f0c040", borderTopColor: "transparent" }} />
        </div>
      )}

      {/* Trail list */}
      {!loading && (!trails || trails.length === 0) && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="text-6xl">🌌</span>
          <p className="text-lg font-bold text-white">Nenhuma trilha ainda</p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Crie sua primeira trilha de aprendizagem!
          </p>
          <button onClick={() => setShowNew(true)}
            className="px-6 py-3 rounded-xl font-bold text-sm"
            style={{ background: "rgba(240,192,64,0.15)", color: "#f0c040" }}>
            + Criar Trilha
          </button>
        </div>
      )}

      {!loading && trails && trails.length > 0 && (
        <div className="space-y-3">
          {trails.map((trail) => (
            <div key={trail.id} className="flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-150"
              style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${trail.subject_color}20` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ background: `${trail.subject_color}20` }}>
                {trail.subject_icon || "🛤️"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-white">{trail.title}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: trail.published ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.06)",
                      color: trail.published ? "#34d399" : "rgba(255,255,255,0.4)",
                    }}>
                    {trail.published ? "✓ Publicada" : "Rascunho"}
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {trail.subject_name} · {trail.class_name ?? "—"} · {trail.step_count ?? 0} etapas
                  {trail.bimester ? ` · ${trail.bimester}º Bim.` : ""}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link href={`/dashboard/piloto/trilhas/${trail.id}`}
                  className="px-3 py-2 rounded-xl text-xs font-semibold"
                  style={{ background: `${trail.subject_color}15`, color: trail.subject_color }}>
                  ✏️ Editar
                </Link>
                <button onClick={() => togglePublish(trail)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold"
                  style={{
                    background: trail.published ? "rgba(248,113,113,0.1)" : "rgba(52,211,153,0.1)",
                    color: trail.published ? "#f87171" : "#34d399",
                  }}>
                  {trail.published ? "Ocultar" : "Publicar"}
                </button>
                <button onClick={() => handleDelete(trail.id)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-xs"
                  style={{ background: "rgba(248,113,113,0.08)", color: "#f87171" }}>
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Trail Modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowNew(false); }}>
          <div className="w-full max-w-md rounded-3xl p-6 space-y-5"
            style={{ background: "#0d1a3a", border: "1px solid rgba(240,192,64,0.2)" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                Nova Trilha
              </h2>
              <button onClick={() => setShowNew(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Título *</label>
                <input type="text" placeholder="Ex: Frações — Do básico ao avançado"
                  value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Descrição</label>
                <textarea rows={2} placeholder="Sobre o que é esta trilha?"
                  value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Disciplina *</label>
                  <select value={form.subject_id}
                    onChange={(e) => {
                      const sub = allSubjects.find((s) => s.subject_id === e.target.value);
                      setForm((p) => ({ ...p, subject_id: e.target.value, class_id: sub?.class_id ?? "" }));
                    }}
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <option value="" style={{ background: "#0a1638" }}>Selecione…</option>
                    {allSubjects.map((s) => (
                      <option key={`${s.subject_id}-${s.class_id}`} value={s.subject_id} style={{ background: "#0a1638" }}>
                        {s.name} ({s.class_name})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Bimestre</label>
                  <select value={form.bimester} onChange={(e) => setForm((p) => ({ ...p, bimester: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <option value="" style={{ background: "#0a1638" }}>—</option>
                    {[1, 2, 3, 4].map((b) => (
                      <option key={b} value={b} style={{ background: "#0a1638" }}>{b}º Bimestre</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowNew(false)}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                Cancelar
              </button>
              <button onClick={handleCreate} disabled={!form.title.trim() || !form.subject_id || saving}
                className="flex-1 py-3 rounded-2xl font-bold text-sm disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif" }}>
                {saving ? "Criando…" : "Criar Trilha →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
