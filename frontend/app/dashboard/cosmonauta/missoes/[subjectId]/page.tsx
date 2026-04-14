"use client";

import { use, useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import { trilhasApi, coinsApi } from "../../../../_lib/api";
import { useQuery } from "../../../../_lib/useQuery";

interface TrailStep {
  id: string; step_order: number;
  step_type: "video" | "pdf" | "activity" | "text";
  title: string; description: string | null;
  vimeo_id: string | null; file_url: string | null; content: string | null;
  coins_reward: number; required: boolean;
  completed: boolean; completed_at: string | null;
}
interface Trail {
  id: string; title: string; description: string | null; bimester: number | null;
  subject_id: string; subject_name: string; subject_color: string; subject_icon: string;
  class_name: string; steps: TrailStep[];
  step_count: number; completed_steps: number;
}
interface CoinsData { balance: number; totalEarned: number; }

const STEP_CONFIG = {
  video:    { icon: "🎬", label: "Vídeo",     color: "#60a5fa" },
  pdf:      { icon: "📄", label: "Leitura",   color: "#f0c040" },
  activity: { icon: "✏️",  label: "Atividade", color: "#34d399" },
  text:     { icon: "📖", label: "Conteúdo",  color: "#a78bfa" },
};

// ── Group steps: consecutive activities merge into one node ──
interface StepNode {
  kind: "single" | "group";
  steps: TrailStep[];       // 1 step for single, N for group
  unlocked: boolean;
  completed: boolean;       // all steps done
}

function buildNodes(steps: TrailStep[]): StepNode[] {
  const nodes: StepNode[] = [];
  let i = 0;
  while (i < steps.length) {
    const s = steps[i];
    if (s.step_type === "activity") {
      // collect consecutive activities
      const group: TrailStep[] = [];
      while (i < steps.length && steps[i].step_type === "activity") {
        group.push(steps[i]);
        i++;
      }
      nodes.push({ kind: "group", steps: group, unlocked: false, completed: false });
    } else {
      nodes.push({ kind: "single", steps: [s], unlocked: false, completed: false });
      i++;
    }
  }
  // compute unlock/complete state
  for (let n = 0; n < nodes.length; n++) {
    const node = nodes[n];
    node.completed = node.steps.every((s) => s.completed);
    if (n === 0) { node.unlocked = true; continue; }
    const prev = nodes[n - 1];
    const prevRequired = prev.steps.some((s) => s.required);
    node.unlocked = prevRequired ? prev.completed : true;
  }
  return nodes;
}

// ── Step modal ──────────────────────────────────────────────
function StepModal({ step, trailId, color, onComplete, onClose }: {
  step: TrailStep; trailId: string; color: string;
  onComplete: (coins: number) => void; onClose: () => void;
}) {
  const [completing, setCompleting] = useState(false);
  const cfg = STEP_CONFIG[step.step_type];

  async function handleComplete() {
    if (step.completed) { onClose(); return; }
    setCompleting(true);
    try {
      const res = await trilhasApi.completarStep(trailId, step.id) as { coinsAwarded: number };
      onComplete(res.coinsAwarded ?? 0);
    } catch { onClose(); }
    finally { setCompleting(false); }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{ background: "#0d1f4a", border: `1px solid ${color}40` }}>
        <div className="px-6 py-4 flex items-center gap-4"
          style={{ background: `${color}18`, borderBottom: `1px solid ${color}20` }}>
          <span className="text-3xl">{cfg.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color }}>{cfg.label}</p>
            <h2 className="text-base font-bold text-white leading-tight">{step.title}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>✕</button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {step.description && <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>{step.description}</p>}

          {step.step_type === "video" && step.vimeo_id && (
            <div className="rounded-2xl overflow-hidden" style={{ paddingTop: "56.25%", position: "relative" }}>
              <iframe className="absolute inset-0 w-full h-full"
                src={`https://player.vimeo.com/video/${step.vimeo_id}?autoplay=0`}
                allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={step.title} />
            </div>
          )}
          {step.step_type === "pdf" && step.file_url && (
            <a href={step.file_url} target="_blank" rel="noreferrer"
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: "rgba(240,192,64,0.08)", border: "1px solid rgba(240,192,64,0.2)", color: "#f0c040" }}>
              <span className="text-xl">📄</span>
              <span className="text-sm font-semibold">Abrir documento</span>
              <span className="ml-auto text-xs opacity-60">↗</span>
            </a>
          )}
          {step.step_type === "text" && step.content && (
            <div className="px-4 py-4 rounded-xl text-sm leading-relaxed whitespace-pre-line"
              style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", color: "rgba(255,255,255,0.85)" }}>
              {step.content}
            </div>
          )}
          {step.step_type === "activity" && (
            <div className="px-4 py-3 rounded-xl flex items-center gap-3"
              style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)" }}>
              <span className="text-xl">✏️</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#34d399" }}>Atividade disponível</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Acesse em Expedições para realizar</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl"
            style={{ background: "rgba(240,192,64,0.06)", border: "1px solid rgba(240,192,64,0.12)" }}>
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
              {step.completed ? "Concluída" : "Recompensa ao concluir"}
            </span>
            <span className="text-sm font-bold" style={{ color: "#f0c040" }}>🌟 +{step.coins_reward}</span>
          </div>
        </div>

        <div className="px-6 pb-6">
          <button onClick={handleComplete} disabled={completing}
            className="w-full py-4 rounded-2xl font-bold text-sm disabled:opacity-60"
            style={{
              background: step.completed ? "rgba(52,211,153,0.15)" : `linear-gradient(135deg,${color},${color}cc)`,
              color: step.completed ? "#34d399" : "#0a1638",
              fontFamily: "'Space Grotesk',sans-serif",
            }}>
            {completing ? "Salvando…" : step.completed ? "✅ Concluída!" : "Marcar como Concluída →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Group modal (shows all activities in the group) ─────────
function GroupModal({ node, trailId, color, onComplete, onClose }: {
  node: StepNode; trailId: string; color: string;
  onComplete: (coins: number) => void; onClose: () => void;
}) {
  const [completing, setCompleting] = useState<string | null>(null);
  const [localDone, setLocalDone] = useState<Set<string>>(
    new Set(node.steps.filter((s) => s.completed).map((s) => s.id))
  );

  async function handleComplete(step: TrailStep) {
    if (localDone.has(step.id)) return;
    setCompleting(step.id);
    try {
      const res = await trilhasApi.completarStep(trailId, step.id) as { coinsAwarded: number };
      setLocalDone((prev) => new Set([...prev, step.id]));
      onComplete(res.coinsAwarded ?? 0);
    } catch { /* noop */ }
    finally { setCompleting(null); }
  }

  const allDone = node.steps.every((s) => localDone.has(s.id));

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{ background: "#0d1f4a", border: `1px solid ${color}40` }}>
        <div className="px-6 py-4 flex items-center gap-3"
          style={{ background: "rgba(52,211,153,0.12)", borderBottom: "1px solid rgba(52,211,153,0.2)" }}>
          <span className="text-3xl">✏️</span>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#34d399" }}>Atividades</p>
            <p className="text-base font-bold text-white">{node.steps.length} atividade{node.steps.length !== 1 ? "s" : ""} neste nó</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>✕</button>
        </div>

        <div className="px-6 py-4 space-y-3 max-h-96 overflow-y-auto">
          {node.steps.map((step) => {
            const done = localDone.has(step.id);
            const loading = completing === step.id;
            return (
              <div key={step.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: done ? "rgba(52,211,153,0.08)" : "rgba(255,255,255,0.04)", border: `1px solid ${done ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.08)"}` }}>
                <span className="text-xl shrink-0">{done ? "✅" : "✏️"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{step.title}</p>
                  <p className="text-xs" style={{ color: "#f0c040" }}>🌟 +{step.coins_reward}</p>
                </div>
                {!done && (
                  <button onClick={() => handleComplete(step)} disabled={loading}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold disabled:opacity-50"
                    style={{ background: "rgba(52,211,153,0.15)", color: "#34d399" }}>
                    {loading ? "…" : "Concluir"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-6 pb-6 pt-2">
          {allDone ? (
            <div className="w-full py-3.5 rounded-2xl text-center font-bold text-sm"
              style={{ background: "rgba(52,211,153,0.15)", color: "#34d399" }}>
              ✅ Todas as atividades concluídas!
            </div>
          ) : (
            <button onClick={onClose}
              className="w-full py-3.5 rounded-2xl font-bold text-sm"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CoinsToast({ amount, onDone }: { amount: number; onDone: () => void }) {
  setTimeout(onDone, 2500);
  return (
    <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl"
      style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", boxShadow: "0 8px 32px rgba(240,192,64,0.5)", animation: "bounce 0.5s ease infinite alternate" }}>
      <span className="text-2xl">🌟</span>
      <div>
        <p className="text-sm font-bold">+{amount} Estelares!</p>
        <p className="text-xs opacity-70">Etapa concluída!</p>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────
export default function SubjectMissoesPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = use(params);
  const router = useRouter();

  const [activeTrail, setActiveTrail]   = useState<string | null>(null);
  const [openNode,    setOpenNode]      = useState<StepNode | null>(null);
  const [openSingle,  setOpenSingle]    = useState<TrailStep | null>(null);
  const [toast,       setToast]         = useState<number | null>(null);

  const { data: trails, loading } = useQuery<Trail[]>(
    () => trilhasApi.list() as Promise<Trail[]>, []
  );
  const { data: coinsData, refetch: refetchCoins } = useQuery<CoinsData>(
    () => coinsApi.getBalance() as Promise<CoinsData>, []
  );
  const { data: trailDetail, refetch: refetchDetail } = useQuery<Trail>(
    activeTrail ? () => trilhasApi.get(activeTrail) as Promise<Trail> : null,
    [activeTrail]
  );

  const subjectTrails = (trails ?? []).filter((t) => t.subject_id === subjectId);
  const firstTrail    = subjectTrails[0];
  const color = firstTrail?.subject_color || "#f0c040";

  function onComplete(coins: number) {
    if (coins > 0) setToast(coins);
    refetchDetail();
    refetchCoins();
    setTimeout(() => setToast(null), 2600);
  }

  const steps  = trailDetail?.steps ?? [];
  const nodes  = buildNodes(steps);
  const doneCount   = steps.filter((s) => s.completed).length;
  const progressPct = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;

  // index of first uncompleted unlocked node
  const currentNodeIdx = nodes.findIndex((n) => n.unlocked && !n.completed);

  if (loading) return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: "#f0c040", borderTopColor: "transparent" }} />
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {toast !== null && <CoinsToast amount={toast} onDone={() => setToast(null)} />}

      {/* Modals */}
      {openSingle && activeTrail && (
        <StepModal step={openSingle} trailId={activeTrail} color={color}
          onComplete={(c) => { onComplete(c); setOpenSingle(null); }}
          onClose={() => setOpenSingle(null)} />
      )}
      {openNode && activeTrail && (
        <GroupModal node={openNode} trailId={activeTrail} color={color}
          onComplete={onComplete} onClose={() => setOpenNode(null)} />
      )}

      {/* ── Header strip ── */}
      <div className="shrink-0 px-5 py-4"
        style={{ background: `linear-gradient(135deg, ${color}22, ${color}10)`, borderBottom: `2px solid ${color}30` }}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => activeTrail ? setActiveTrail(null) : router.back()}
            className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg"
            style={{ color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.08)" }}>
            ← {activeTrail ? "Trilhas" : "Missões"}
          </button>
          <div className="flex-1" />
          {coinsData && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
              style={{ background: "rgba(240,192,64,0.15)", border: "1px solid rgba(240,192,64,0.3)" }}>
              <span className="text-sm">🌟</span>
              <span className="text-sm font-bold" style={{ color: "#f0c040", fontFamily: "'Space Grotesk',sans-serif" }}>
                {coinsData.balance}
              </span>
            </div>
          )}
        </div>

        {activeTrail && trailDetail ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{trailDetail.subject_icon}</span>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color }}>
                {trailDetail.subject_name}{trailDetail.bimester ? ` · ${trailDetail.bimester}º Bim.` : ""}
              </p>
            </div>
            <h1 className="text-lg font-bold text-white mb-3" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
              {trailDetail.title}
            </h1>
            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                <span>{doneCount}/{steps.length} etapas</span>
                <span style={{ color }}>{progressPct}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                <div className="h-2 rounded-full transition-all duration-700"
                  style={{ width: `${progressPct}%`, background: progressPct === 100 ? "linear-gradient(90deg,#34d399,#10b981)" : `linear-gradient(90deg,${color},${color}99)`, boxShadow: progressPct > 0 ? `0 0 8px ${color}80` : "none" }} />
              </div>
            </div>
          </>
        ) : firstTrail ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{firstTrail.subject_icon}</span>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{firstTrail.subject_name}</p>
            </div>
            <h1 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
              {subjectTrails.length} trilha{subjectTrails.length !== 1 ? "s" : ""} disponível{subjectTrails.length !== 1 ? "is" : ""}
            </h1>
          </>
        ) : null}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        {/* Empty state */}
        {subjectTrails.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-20 text-center px-6">
            <span className="text-6xl">🌌</span>
            <p className="text-lg font-bold text-white">Nenhuma trilha disponível ainda</p>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Aguarde seu professor criar trilhas.</p>
          </div>
        )}

        {/* Trail selection */}
        {subjectTrails.length > 0 && !activeTrail && (
          <div className="p-5 space-y-3">
            {subjectTrails.map((trail) => {
              const done  = Number(trail.completed_steps ?? 0);
              const total = Number(trail.step_count ?? 0);
              const pct   = total ? Math.round((done / total) * 100) : 0;
              return (
                <button key={trail.id} onClick={() => setActiveTrail(trail.id)}
                  className="w-full text-left rounded-2xl p-5 transition-all duration-200 active:scale-[0.98]"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${trail.subject_color}30` }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                      style={{ background: `${trail.subject_color}20` }}>
                      {trail.subject_icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">{trail.title}</p>
                      <p className="text-xs" style={{ color: trail.subject_color }}>
                        {total} etapa{total !== 1 ? "s" : ""}{trail.bimester ? ` · ${trail.bimester}º Bim.` : ""}
                      </p>
                    </div>
                    {pct === 100 && <span className="text-xl">🏆</span>}
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>→</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      <span>{done}/{total} concluídas</span>
                      <span style={{ color: trail.subject_color }}>{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? "linear-gradient(90deg,#34d399,#10b981)" : `linear-gradient(90deg,${trail.subject_color},${trail.subject_color}88)` }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ── STAR MAP ── */}
        {activeTrail && steps.length === 0 && (
          <div className="text-center py-16">
            <span className="text-5xl">🔭</span>
            <p className="text-sm mt-3" style={{ color: "rgba(255,255,255,0.4)" }}>Trilha sem etapas ainda.</p>
          </div>
        )}

        {activeTrail && nodes.length > 0 && (
          <div className="pb-16 pt-4" style={{ maxWidth: 320, margin: "0 auto" }}>
            {nodes.map((node, nIdx) => {
              const step0    = node.steps[0];
              const cfg      = STEP_CONFIG[step0.step_type];
              const isGroup  = node.kind === "group";
              const isCurrent = nIdx === currentNodeIdx;
              // alternate slight left/right offset
              const offDir = nIdx % 2 === 0 ? -1 : 1;
              const offPx  = 28 * offDir; // subtle, not extreme

              function openThisNode() {
                if (!node.unlocked) return;
                if (isGroup) setOpenNode(node);
                else setOpenSingle(step0);
              }

              return (
                <Fragment key={nIdx}>
                  {/* ── Node row ── */}
                  <div className="relative flex justify-center" style={{ minHeight: 130 }}>
                    <div className="absolute top-3 flex flex-col items-center gap-2"
                      style={{ left: `calc(50% + ${offPx}px)`, transform: "translateX(-50%)" }}>

                      {/* Rocket on current node */}
                      {isCurrent && (
                        <div style={{ fontSize: 24, animation: "bounce 0.9s ease-in-out infinite alternate", filter: "drop-shadow(0 0 6px rgba(240,192,64,0.8))", marginBottom: 2 }}>
                          🚀
                        </div>
                      )}

                      {/* Node circle */}
                      <button onClick={openThisNode} disabled={!node.unlocked}
                        className="flex items-center justify-center rounded-full transition-all duration-300"
                        style={{
                          width: isGroup ? 72 : 62,
                          height: isGroup ? 72 : 62,
                          fontSize: isGroup ? 22 : 24,
                          position: "relative",
                          background: node.completed
                            ? `linear-gradient(135deg,${color},${color}cc)`
                            : node.unlocked
                            ? "rgba(255,255,255,0.1)"
                            : "rgba(255,255,255,0.04)",
                          border: `3px solid ${node.completed ? color : node.unlocked ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)"}`,
                          boxShadow: node.completed ? `0 0 20px ${color}60, 0 0 40px ${color}25` : isCurrent ? "0 0 14px rgba(255,255,255,0.12)" : "none",
                          cursor: node.unlocked ? "pointer" : "default",
                          transform: isCurrent ? "scale(1.1)" : "scale(1)",
                        }}>
                        {node.completed ? "✅" : node.unlocked ? cfg.icon : "🔒"}

                        {/* Activity count badge */}
                        {isGroup && node.steps.length > 1 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: node.completed ? "#34d399" : color, color: "#0a1638", fontSize: 10 }}>
                            {node.steps.length}
                          </div>
                        )}
                      </button>

                      {/* Label */}
                      <div className="text-center" style={{ maxWidth: 96 }}>
                        <p className="font-bold leading-tight" style={{
                          fontSize: 11,
                          color: node.completed ? "#34d399" : node.unlocked ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)",
                        }}>
                          {isGroup ? `${node.steps.length} atividade${node.steps.length !== 1 ? "s" : ""}` : step0.title}
                        </p>
                        <p style={{
                          fontSize: 10,
                          color: node.completed ? "#34d399" : node.unlocked ? "#f0c040" : "rgba(255,255,255,0.2)",
                          marginTop: 2,
                        }}>
                          {node.completed
                            ? "✓ Concluído"
                            : isGroup
                            ? `+${node.steps.reduce((s, x) => s + x.coins_reward, 0)} 🌟`
                            : `+${step0.coins_reward} 🌟`}
                        </p>
                      </div>
                    </div>

                    {/* Step number at center axis */}
                    <div className="absolute" style={{ left: "50%", top: 38, transform: "translateX(-50%)" }}>
                      <div className="w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: node.completed ? color : "rgba(255,255,255,0.08)", fontSize: 9, fontWeight: 700, color: node.completed ? "#0a1638" : "rgba(255,255,255,0.25)", border: `1px solid ${node.completed ? color : "rgba(255,255,255,0.1)"}` }}>
                        {nIdx + 1}
                      </div>
                    </div>
                  </div>

                  {/* ── Connector dots ── */}
                  {nIdx < nodes.length - 1 && (
                    <div className="flex flex-col items-center gap-2 py-0.5">
                      {[0, 1, 2].map((d) => {
                        // shift dots slightly toward next node
                        const nextOff = ((nIdx + 1) % 2 === 0 ? -1 : 1) * 10;
                        const shift = (d + 1) * (nextOff / 3);
                        return (
                          <div key={d} style={{
                            width: 7, height: 7, borderRadius: "50%",
                            background: node.completed ? color : "rgba(255,255,255,0.12)",
                            opacity: node.completed ? 0.7 - d * 0.15 : 0.35 - d * 0.08,
                            transform: `translateX(${shift}px)`,
                            boxShadow: node.completed ? `0 0 5px ${color}70` : "none",
                          }} />
                        );
                      })}
                    </div>
                  )}
                </Fragment>
              );
            })}

            {/* End */}
            <div className="flex flex-col items-center gap-2 pt-6">
              {progressPct === 100
                ? <><div style={{ fontSize: 44, filter: "drop-shadow(0 0 14px rgba(240,192,64,0.8))" }}>🏆</div><p className="text-xs font-bold" style={{ color: "#f0c040" }}>Missão Completa!</p></>
                : <div style={{ fontSize: 28, opacity: 0.2 }}>🌟</div>
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
