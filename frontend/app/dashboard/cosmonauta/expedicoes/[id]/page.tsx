"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser, isDemoUser, type AuthUser } from "../../../../_lib/auth";
import { FULL_ACTIVITIES, type Question } from "../../../_components/activityMockData";
import MultipleChoice from "../../../_components/questions/MultipleChoice";
import TrueFalse from "../../../_components/questions/TrueFalse";
import MatchPairs from "../../../_components/questions/MatchPairs";
import DragWords from "../../../_components/questions/DragWords";
import NonDemoPlaceholder from "../../../_components/NonDemoPlaceholder";

// ── Types ──────────────────────────────────────────────────
type SingleAnswer   = string | null;
type MatchAnswer    = Record<string, string>;
type DragAnswer     = (string | null)[];
type AnyAnswer      = SingleAnswer | MatchAnswer | DragAnswer;

// ── Timer hook ────────────────────────────────────────────
function useCountdown(initialSeconds: number, onExpire: () => void) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const expired = useRef(false);

  useEffect(() => {
    if (initialSeconds <= 0) return;
    const id = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          clearInterval(id);
          if (!expired.current) { expired.current = true; onExpire(); }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [initialSeconds, onExpire]);

  const mins = String(Math.floor(remaining / 60)).padStart(2, "0");
  const secs = String(remaining % 60).padStart(2, "0");
  return { remaining, display: `${mins}:${secs}`, urgent: remaining < 120 };
}

// ── Score calculation ─────────────────────────────────────
function calcScore(question: Question, answer: AnyAnswer): number {
  if (answer === null || answer === undefined) return 0;

  if (question.type === "multipla_escolha" || question.type === "verdadeiro_falso") {
    const alt = question.alternatives?.find((a) => a.id === answer);
    return (alt?.partialScore ?? 0) * question.score;
  }
  if (question.type === "ligar") {
    const ans = answer as MatchAnswer;
    const pairs = question.matchPairs ?? [];
    const correct = pairs.filter((p) => ans[p.id] === p.right).length;
    return (correct / pairs.length) * question.score;
  }
  if (question.type === "arrastar") {
    const ans = answer as DragAnswer;
    const order = question.correctDragOrder ?? [];
    const correct = order.filter((w, i) => ans[i] === w).length;
    return (correct / order.length) * question.score;
  }
  return 0;
}

// ── Difficulty badge ──────────────────────────────────────
const DIFF_CONFIG = {
  facil:   { label: "Fácil",   color: "#34d399", bg: "rgba(52,211,153,0.12)"   },
  medio:   { label: "Médio",   color: "#fbbf24", bg: "rgba(251,191,36,0.12)"   },
  dificil: { label: "Difícil", color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};

// ── Main component ────────────────────────────────────────
export default function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router  = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    setHydrated(true);
  }, []);

  const activity = FULL_ACTIVITIES[id];

  const [current,   setCurrent]   = useState(0);
  const [answers,   setAnswers]   = useState<AnyAnswer[]>(() => activity?.questions.map(() => null) ?? []);
  const [submitted, setSubmitted] = useState(false);
  const [started,   setStarted]   = useState(false);

  const totalSeconds = useMemo(() => (activity?.timeLimitMinutes ?? 0) * 60, [activity]);

  const timer = useCountdown(
    started && !submitted ? totalSeconds : 0,
    () => { if (!submitted) handleSubmit(); }
  );

  if (!hydrated) return null;
  if (!isDemoUser(user)) return <NonDemoPlaceholder role="aluno" />;

  if (!activity) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <span className="text-5xl">🌌</span>
        <p className="text-white font-semibold">Expedição não encontrada.</p>
        <button onClick={() => router.back()} className="text-sm px-4 py-2 rounded-xl"
          style={{ background: "rgba(240,192,64,0.15)", color: "#f0c040" }}>
          ← Voltar
        </button>
      </div>
    );
  }

  const question      = activity.questions[current];
  const totalQ        = activity.questions.length;
  const answeredCount = answers.filter((a) => {
    if (a === null) return false;
    if (typeof a === "object" && !Array.isArray(a)) return Object.keys(a).length > 0;
    if (Array.isArray(a)) return a.some(Boolean);
    return true;
  }).length;

  function setAnswer(value: AnyAnswer) {
    setAnswers((prev) => {
      const next = [...prev];
      next[current] = value;
      return next;
    });
  }

  function handleSubmit() {
    setSubmitted(true);
  }

  // ── Results ────────────────────────────────────────────
  if (submitted) {
    const totalEarned = activity.questions.reduce((sum, q, i) => sum + calcScore(q, answers[i]), 0);
    const pct         = (totalEarned / activity.maxScore) * 100;
    const passed      = pct >= 70;

    return (
      <div className="min-h-full flex flex-col items-center justify-center p-6"
        style={{ background: "linear-gradient(180deg, #080e28 0%, #060f2b 100%)" }}>
        <div className="w-full max-w-lg space-y-6">
          {/* Result card */}
          <div className="rounded-3xl overflow-hidden text-center"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${passed ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}` }}>
            <div className="px-8 py-8" style={{ background: passed ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)" }}>
              <div className="text-6xl mb-3">{passed ? "🏆" : "📚"}</div>
              <h2 className="text-2xl font-bold" style={{ color: passed ? "#34d399" : "#f87171", fontFamily: "'Space Grotesk',sans-serif" }}>
                {passed ? "Missão Concluída!" : "Continue Estudando!"}
              </h2>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>{activity.title}</p>
            </div>

            <div className="px-8 py-6 space-y-4">
              {/* Score ring */}
              <div className="flex items-center justify-center">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10"/>
                    <circle cx="60" cy="60" r="50" fill="none"
                      stroke={passed ? "#34d399" : "#f87171"} strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 50}`}
                      strokeDashoffset={`${2 * Math.PI * 50 * (1 - pct / 100)}`}
                      style={{ transition: "stroke-dashoffset 1s ease" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black" style={{ color: passed ? "#34d399" : "#f87171", fontFamily: "'Space Grotesk',sans-serif" }}>
                      {pct.toFixed(0)}
                    </span>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>pontos</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Acertos",    value: activity.questions.filter((q,i) => calcScore(q,answers[i]) >= q.score).length, color: "#34d399" },
                  { label: "Erros",      value: activity.questions.filter((q,i) => calcScore(q,answers[i]) === 0).length,       color: "#f87171" },
                  { label: "Parciais",   value: activity.questions.filter((q,i) => { const s = calcScore(q,answers[i]); return s > 0 && s < q.score; }).length, color: "#fbbf24" },
                ].map((s) => (
                  <div key={s.label} className="py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Per-question review */}
              <div className="space-y-2 text-left">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Revisão por questão
                </p>
                {activity.questions.map((q, i) => {
                  const earned = calcScore(q, answers[i]);
                  const icon   = earned >= q.score ? "✅" : earned > 0 ? "⚡" : "❌";
                  return (
                    <div key={q.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <span className="text-lg shrink-0">{icon}</span>
                      <span className="flex-1 text-xs text-white line-clamp-1">{q.command}</span>
                      <span className="text-xs font-bold shrink-0"
                        style={{ color: earned >= q.score ? "#34d399" : earned > 0 ? "#fbbf24" : "#f87171" }}>
                        {earned.toFixed(0)}/{q.score}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <button onClick={() => router.push("/dashboard/cosmonauta/expedicoes")}
            className="w-full py-4 rounded-2xl font-bold text-sm"
            style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif" }}>
            🚀 Voltar às Expedições
          </button>
        </div>
      </div>
    );
  }

  // ── Start screen ───────────────────────────────────────
  if (!started) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-3xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(240,192,64,0.2)" }}>
          <div className="px-8 py-8 text-center" style={{ background: "linear-gradient(135deg,#1b3a8f,#0a1638)" }}>
            <div className="text-5xl mb-4">🚀</div>
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>{activity.title}</h2>
            <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: activity.subjectColor + "20", color: activity.subjectColor, border: `1px solid ${activity.subjectColor}40` }}>
              {activity.subject}
            </span>
          </div>
          <div className="px-8 py-6 space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { icon: "❓", label: "Questões",  value: totalQ },
                { icon: "⭐", label: "Pontos",    value: activity.maxScore },
                { icon: "⏱",  label: "Tempo",    value: activity.timeLimitMinutes ? `${activity.timeLimitMinutes} min` : "Livre" },
              ].map((s) => (
                <div key={s.label} className="py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="text-xl mb-1">{s.icon}</div>
                  <p className="text-base font-bold text-white">{s.value}</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{s.label}</p>
                </div>
              ))}
            </div>
            <div className="px-4 py-4 rounded-2xl" style={{ background: "rgba(240,192,64,0.06)", border: "1px solid rgba(240,192,64,0.15)" }}>
              <p className="text-xs font-semibold mb-1" style={{ color: "#f0c040" }}>📋 Instruções de Missão</p>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{activity.instructions}</p>
            </div>
            <button onClick={() => setStarted(true)}
              className="w-full py-4 rounded-2xl font-bold text-sm tracking-widest uppercase"
              style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif" }}>
              🚀 Iniciar Expedição
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Question screen ────────────────────────────────────
  const diff = DIFF_CONFIG[question.difficulty];
  const progress = ((current) / totalQ) * 100;

  return (
    <div className="flex flex-col h-full">
      {/* ── HEADER ── */}
      <div className="px-6 py-4 shrink-0"
        style={{ background: "rgba(10,22,56,0.9)", borderBottom: "1px solid rgba(240,192,64,0.1)" }}>
        <div className="flex items-center justify-between gap-4 mb-3">
          {/* Title */}
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: activity.subjectColor }}>{activity.subject}</p>
            <p className="text-sm font-bold text-white truncate">{activity.title}</p>
          </div>
          {/* Timer */}
          {activity.timeLimitMinutes && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl shrink-0"
              style={{ background: timer.urgent ? "rgba(248,113,113,0.15)" : "rgba(255,255,255,0.06)", border: `1px solid ${timer.urgent ? "#f87171" : "rgba(255,255,255,0.1)"}` }}>
              <span className={timer.urgent ? "animate-pulse" : ""}>⏱</span>
              <span className="text-sm font-bold font-mono" style={{ color: timer.urgent ? "#f87171" : "#f0c040" }}>
                {timer.display}
              </span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: "linear-gradient(90deg,#f0c040,#eab308)" }} />
          </div>
          <span className="text-xs shrink-0 font-semibold" style={{ color: "#f0c040" }}>
            {current + 1}/{totalQ}
          </span>
        </div>

        {/* Question dots */}
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {activity.questions.map((_, i) => {
            const ans = answers[i];
            const hasAnswer = ans !== null && (
              typeof ans !== "object" || Array.isArray(ans)
                ? (Array.isArray(ans) ? ans.some(Boolean) : true)
                : Object.keys(ans).length > 0
            );
            return (
              <button key={i} onClick={() => setCurrent(i)}
                className="w-6 h-6 rounded-md text-xs font-bold transition-all duration-150"
                style={{
                  background: i === current ? "#f0c040" : hasAnswer ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.08)",
                  color:      i === current ? "#0a1638" : hasAnswer ? "#34d399" : "rgba(255,255,255,0.4)",
                }}>
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── QUESTION BODY ── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-5">
          {/* Question meta */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold"
              style={{ background: diff.bg, color: diff.color }}>
              {diff.label}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
              {question.bloomLevel}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
              {question.bnccCode}
            </span>
            <span className="ml-auto text-xs font-bold" style={{ color: "#f0c040" }}>
              {question.score} pts
            </span>
          </div>

          {/* Context */}
          {question.context && question.type !== "arrastar" && (
            <div className="px-5 py-4 rounded-2xl text-sm leading-relaxed"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)", whiteSpace: "pre-line" }}>
              {question.context}
            </div>
          )}

          {/* Command */}
          <p className="text-base font-semibold text-white leading-relaxed">{question.command}</p>

          {/* Answer component */}
          {question.type === "multipla_escolha" && (
            <MultipleChoice
              alternatives={question.alternatives!}
              selected={answers[current] as SingleAnswer}
              onSelect={(id) => setAnswer(id)}
              revealed={false}
            />
          )}
          {question.type === "verdadeiro_falso" && (
            <TrueFalse
              selected={answers[current] as SingleAnswer}
              onSelect={(id) => setAnswer(id)}
              revealed={false}
              correctId={question.alternatives!.find((a) => a.isCorrect)!.id}
            />
          )}
          {question.type === "ligar" && (
            <MatchPairs
              pairs={question.matchPairs!}
              answer={(answers[current] as MatchAnswer) ?? {}}
              onAnswer={(ans) => setAnswer(ans)}
              revealed={false}
            />
          )}
          {question.type === "arrastar" && (
            <DragWords
              context={question.context!}
              words={question.dragWords!}
              correctOrder={question.correctDragOrder!}
              answer={(answers[current] as DragAnswer) ?? Array(question.correctDragOrder!.length).fill(null)}
              onAnswer={(ans) => setAnswer(ans)}
              revealed={false}
            />
          )}
        </div>
      </div>

      {/* ── FOOTER NAVIGATION ── */}
      <div className="px-6 py-4 shrink-0 flex items-center justify-between gap-3"
        style={{ background: "rgba(10,22,56,0.9)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-150"
          style={{
            background: current === 0 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)",
            color: current === 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)",
            cursor: current === 0 ? "not-allowed" : "pointer",
          }}>
          ← Anterior
        </button>

        <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
          {answeredCount}/{totalQ} respondidas
        </span>

        {current < totalQ - 1 ? (
          <button onClick={() => setCurrent((c) => c + 1)}
            className="px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-150"
            style={{ background: "rgba(240,192,64,0.15)", color: "#f0c040", border: "1px solid rgba(240,192,64,0.3)" }}>
            Próxima →
          </button>
        ) : (
          <button onClick={handleSubmit}
            className="px-6 py-3 rounded-xl text-sm font-bold tracking-wide"
            style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif" }}>
            🚀 Entregar
          </button>
        )}
      </div>
    </div>
  );
}
