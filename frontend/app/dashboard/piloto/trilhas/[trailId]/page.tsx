"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { trilhasApi, atividadesApi } from "../../../../_lib/api";
import { useQuery } from "../../../../_lib/useQuery";

type StepType = "video" | "pdf" | "activity" | "text";

interface TrailStep {
  id: string; step_order: number; step_type: StepType;
  title: string; description: string | null; vimeo_id: string | null;
  file_url: string | null; content: string | null; activity_id: string | null;
  coins_reward: number; required: boolean; completed?: boolean;
}

interface Trail {
  id: string; title: string; bimester: number | null; published: boolean;
  subject_name: string; subject_color: string; subject_icon: string;
  class_name: string; steps: TrailStep[];
}

interface Activity {
  id: string; title: string; activity_type: string;
  subject_name: string; subject_color: string; question_count: number;
}

const TYPE_CONFIG: Record<StepType, { icon: string; label: string; color: string }> = {
  video:    { icon: "🎬", label: "Videoaula",   color: "#60a5fa" },
  pdf:      { icon: "📄", label: "PDF/Leitura", color: "#f0c040" },
  activity: { icon: "✏️",  label: "Atividade",   color: "#34d399" },
  text:     { icon: "📖", label: "Conteúdo",    color: "#a78bfa" },
};

const BLANK_STEP = {
  step_type: "video" as StepType,
  title: "", description: "",
  vimeo_id: "", file_url: "", content: "", activity_id: "",
  coins_reward: 10, required: true,
};

export default function TrailEditorPage({ params }: { params: Promise<{ trailId: string }> }) {
  const { trailId } = use(params);
  const router = useRouter();

  const [showAddStep, setShowAddStep]     = useState(false);
  const [editingStep, setEditingStep]     = useState<TrailStep | null>(null);
  const [stepForm, setStepForm]           = useState<typeof BLANK_STEP>({ ...BLANK_STEP });
  const [saving, setSaving]               = useState(false);

  const { data: trail, loading, error, refetch } = useQuery<Trail>(
    () => trilhasApi.get(trailId) as Promise<Trail>,
    [trailId]
  );

  const { data: activities } = useQuery<Activity[]>(
    () => atividadesApi.list() as Promise<Activity[]>,
    []
  );

  async function handleAddStep() {
    if (!stepForm.title.trim()) return;
    setSaving(true);
    try {
      await trilhasApi.addStep(trailId, {
        step_type: stepForm.step_type,
        title: stepForm.title,
        description: stepForm.description || null,
        vimeo_id: stepForm.step_type === "video" ? stepForm.vimeo_id || null : null,
        file_url: stepForm.step_type === "pdf" ? stepForm.file_url || null : null,
        content: stepForm.step_type === "text" ? stepForm.content || null : null,
        activity_id: stepForm.step_type === "activity" ? stepForm.activity_id || null : null,
        coins_reward: Number(stepForm.coins_reward) || 10,
        required: stepForm.required,
      });
      setShowAddStep(false);
      setStepForm({ ...BLANK_STEP });
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao adicionar etapa.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateStep() {
    if (!editingStep) return;
    setSaving(true);
    try {
      await trilhasApi.updateStep(trailId, editingStep.id, {
        title: stepForm.title,
        description: stepForm.description || null,
        vimeo_id: stepForm.step_type === "video" ? stepForm.vimeo_id || null : null,
        file_url: stepForm.step_type === "pdf" ? stepForm.file_url || null : null,
        content: stepForm.step_type === "text" ? stepForm.content || null : null,
        activity_id: stepForm.step_type === "activity" ? stepForm.activity_id || null : null,
        coins_reward: Number(stepForm.coins_reward) || 10,
        required: stepForm.required,
      });
      setEditingStep(null);
      setStepForm({ ...BLANK_STEP });
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao atualizar etapa.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteStep(stepId: string) {
    if (!confirm("Remover esta etapa?")) return;
    await trilhasApi.deleteStep(trailId, stepId);
    refetch();
  }

  async function togglePublish() {
    if (!trail) return;
    await trilhasApi.update(trailId, {
      title: trail.title,
      description: null,
      bimester: trail.bimester,
      published: !trail.published,
    });
    refetch();
  }

  function openEdit(step: TrailStep) {
    setEditingStep(step);
    setStepForm({
      step_type: step.step_type,
      title: step.title,
      description: step.description ?? "",
      vimeo_id: step.vimeo_id ?? "",
      file_url: step.file_url ?? "",
      content: step.content ?? "",
      activity_id: step.activity_id ?? "",
      coins_reward: step.coins_reward,
      required: step.required,
    });
  }

  function closeModal() {
    setShowAddStep(false);
    setEditingStep(null);
    setStepForm({ ...BLANK_STEP });
  }

  const color = trail?.subject_color || "#f0c040";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "#f0c040", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (error || !trail) {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <span className="text-5xl">🌌</span>
        <p className="text-white">{error || "Trilha não encontrada."}</p>
        <button onClick={() => router.back()} className="text-sm px-4 py-2 rounded-xl"
          style={{ background: "rgba(240,192,64,0.15)", color: "#f0c040" }}>← Voltar</button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <button onClick={() => router.back()} className="text-xs mb-3 flex items-center gap-1"
          style={{ color: "rgba(255,255,255,0.4)" }}>← Trilhas</button>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: `${color}20` }}>
            {trail.subject_icon}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
              {trail.title}
            </h1>
            <p className="text-xs" style={{ color }}>
              {trail.subject_name} · {trail.class_name}
              {trail.bimester ? ` · ${trail.bimester}º Bim.` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={togglePublish}
              className="px-4 py-2 rounded-xl text-xs font-bold"
              style={{
                background: trail.published ? "rgba(248,113,113,0.1)" : "rgba(52,211,153,0.12)",
                color: trail.published ? "#f87171" : "#34d399",
                border: `1px solid ${trail.published ? "rgba(248,113,113,0.25)" : "rgba(52,211,153,0.25)"}`,
              }}>
              {trail.published ? "Ocultar dos Alunos" : "✓ Publicar Trilha"}
            </button>
            <button onClick={() => { setShowAddStep(true); setEditingStep(null); setStepForm({ ...BLANK_STEP }); }}
              className="px-4 py-2 rounded-xl text-xs font-bold"
              style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638" }}>
              + Etapa
            </button>
          </div>
        </div>
      </div>

      {/* Steps list */}
      {trail.steps.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="text-5xl">🛤️</span>
          <p className="text-base font-bold text-white">Trilha vazia</p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Adicione vídeos, PDFs, atividades e textos para criar o percurso.
          </p>
          <button onClick={() => setShowAddStep(true)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "rgba(240,192,64,0.15)", color: "#f0c040" }}>
            + Adicionar Primeira Etapa
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            {trail.steps.length} etapa{trail.steps.length !== 1 ? "s" : ""} — os alunos seguem esta ordem
          </p>
          {trail.steps.map((step, idx) => {
            const cfg = TYPE_CONFIG[step.step_type];
            const linkedActivity = activities?.find((a) => a.id === step.activity_id);
            return (
              <div key={step.id} className="flex items-center gap-4 px-4 py-4 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${cfg.color}25` }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: `${cfg.color}20`, color: cfg.color }}>
                  {idx + 1}
                </div>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ background: `${cfg.color}15` }}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white">{step.title}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: `${cfg.color}12`, color: cfg.color }}>{cfg.label}</span>
                    {!step.required && (
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>Opcional</span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                    🌟 +{step.coins_reward} Estelares
                    {linkedActivity ? ` · 📋 ${linkedActivity.title}` : ""}
                    {step.description ? ` · ${step.description}` : ""}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEdit(step)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-xs"
                    style={{ background: "rgba(240,192,64,0.1)", color: "#f0c040" }}>✏️</button>
                  <button onClick={() => handleDeleteStep(step.id)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-xs"
                    style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Step Modal */}
      {(showAddStep || editingStep) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="w-full max-w-lg rounded-3xl p-6 space-y-5 overflow-y-auto max-h-[92vh]"
            style={{ background: "#0d1a3a", border: "1px solid rgba(240,192,64,0.2)" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                {editingStep ? "Editar Etapa" : "Nova Etapa"}
              </h2>
              <button onClick={closeModal}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>✕</button>
            </div>

            {/* Type selector — only for new steps */}
            {!editingStep && (
              <div className="grid grid-cols-4 gap-2">
                {(Object.entries(TYPE_CONFIG) as [StepType, typeof TYPE_CONFIG[StepType]][]).map(([key, cfg]) => (
                  <button key={key} onClick={() => setStepForm((p) => ({ ...p, step_type: key }))}
                    className="flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-bold transition-all duration-150"
                    style={{
                      background: stepForm.step_type === key ? `${cfg.color}20` : "rgba(255,255,255,0.05)",
                      color: stepForm.step_type === key ? cfg.color : "rgba(255,255,255,0.4)",
                      border: `1px solid ${stepForm.step_type === key ? cfg.color + "40" : "rgba(255,255,255,0.08)"}`,
                    }}>
                    <span className="text-xl">{cfg.icon}</span>
                    {cfg.label}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Título *</label>
                <input type="text" placeholder="Título da etapa…"
                  value={stepForm.title} onChange={(e) => setStepForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Instruções / Descrição</label>
                <textarea rows={2} placeholder="Instruções para o aluno…"
                  value={stepForm.description} onChange={(e) => setStepForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>

              {/* Type-specific fields */}
              {stepForm.step_type === "video" && (
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#60a5fa" }}>🎬 ID do Vimeo</label>
                  <input type="text" placeholder="Ex: 824637892"
                    value={stepForm.vimeo_id} onChange={(e) => setStepForm((p) => ({ ...p, vimeo_id: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none font-mono"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(96,165,250,0.25)" }}
                  />
                  <p className="text-xs mt-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Cole o ID numérico do vídeo no Vimeo (não a URL completa).
                  </p>
                </div>
              )}

              {stepForm.step_type === "pdf" && (
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#f0c040" }}>📄 URL do PDF</label>
                  <input type="text" placeholder="https://…/documento.pdf"
                    value={stepForm.file_url} onChange={(e) => setStepForm((p) => ({ ...p, file_url: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none font-mono"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(240,192,64,0.25)" }}
                  />
                </div>
              )}

              {stepForm.step_type === "text" && (
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#a78bfa" }}>📖 Conteúdo</label>
                  <textarea rows={5} placeholder="Texto explicativo, resumo, teoria…"
                    value={stepForm.content} onChange={(e) => setStepForm((p) => ({ ...p, content: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none resize-none"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(139,92,246,0.25)" }}
                  />
                </div>
              )}

              {stepForm.step_type === "activity" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold" style={{ color: "#34d399" }}>✏️ Atividade Vinculada *</label>
                    <button
                      onClick={() => window.open("/dashboard/piloto/atividades/nova", "_blank")}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                      style={{ background: "rgba(52,211,153,0.12)", color: "#34d399", border: "1px solid rgba(52,211,153,0.25)" }}>
                      + Criar Nova Atividade ↗
                    </button>
                  </div>
                  {(!activities || activities.length === 0) ? (
                    <div className="px-4 py-6 rounded-xl text-center"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <p className="text-sm text-white">Nenhuma atividade encontrada.</p>
                      <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                        Crie uma atividade primeiro em Expedições, depois vincule aqui.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {activities.map((act) => (
                        <button key={act.id}
                          onClick={() => setStepForm((p) => ({ ...p, activity_id: act.id }))}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-150"
                          style={{
                            background: stepForm.activity_id === act.id ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.03)",
                            border: `1px solid ${stepForm.activity_id === act.id ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.07)"}`,
                          }}>
                          <span className="text-lg shrink-0">📋</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{act.title}</p>
                            <p className="text-xs" style={{ color: act.subject_color || "rgba(255,255,255,0.35)" }}>
                              {act.subject_name} · {act.question_count} questões
                            </p>
                          </div>
                          {stepForm.activity_id === act.id && (
                            <span className="text-xs font-bold shrink-0" style={{ color: "#34d399" }}>✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Coins + Required */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>🌟 Estelares ao Concluir</label>
                  <input type="number" min="0" max="500"
                    value={stepForm.coins_reward}
                    onChange={(e) => setStepForm((p) => ({ ...p, coins_reward: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(240,192,64,0.2)" }}
                  />
                </div>
                <div className="flex flex-col justify-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={stepForm.required}
                      onChange={(e) => setStepForm((p) => ({ ...p, required: e.target.checked }))}
                      className="w-4 h-4 accent-yellow-400"
                    />
                    <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>
                      Etapa obrigatória para avançar
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button onClick={closeModal}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                Cancelar
              </button>
              <button
                onClick={editingStep ? handleUpdateStep : handleAddStep}
                disabled={
                  !stepForm.title.trim() || saving ||
                  (stepForm.step_type === "activity" && !stepForm.activity_id)
                }
                className="flex-1 py-3 rounded-2xl font-bold text-sm disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif" }}>
                {saving ? "Salvando…" : editingStep ? "💾 Salvar" : "✅ Adicionar Etapa →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
