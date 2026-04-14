"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { turmasApi, atividadesApi } from "../../../../_lib/api";
import { useQuery } from "../../../../_lib/useQuery";
import type { QuestionType, Alternative, MatchPair } from "../../../_components/activityMockData";

// ── Constants ─────────────────────────────────────────────────────────────────

const BLOOM_LEVELS = [
  "Conhecimento", "Compreensão", "Aplicação", "Análise", "Síntese", "Avaliação",
];

const DIFFICULTIES = [
  { key: "facil"   as const, label: "Fácil",   color: "#34d399" },
  { key: "medio"   as const, label: "Médio",   color: "#fbbf24" },
  { key: "dificil" as const, label: "Difícil", color: "#f87171" },
];

const SUBJECTS = [
  { id: "mat",  name: "Matemática",        color: "#3b82f6", icon: "🔢" },
  { id: "por",  name: "Língua Portuguesa", color: "#8b5cf6", icon: "📖" },
  { id: "cien", name: "Ciências",          color: "#10b981", icon: "🔬" },
  { id: "hist", name: "História",          color: "#f59e0b", icon: "🏛" },
  { id: "geo",  name: "Geografia",         color: "#ef4444", icon: "🌍" },
  { id: "ing",  name: "Inglês",            color: "#6366f1", icon: "🌐" },
  { id: "art",  name: "Arte",              color: "#ec4899", icon: "🎨" },
  { id: "ef",   name: "Ed. Física",        color: "#14b8a6", icon: "⚽" },
];

const ACTIVITY_TYPES = [
  { key: "atividade" as const, label: "Atividade", icon: "📝" },
  { key: "prova"     as const, label: "Prova",     icon: "📋" },
  { key: "simulado"  as const, label: "Simulado",  icon: "🎯" },
  { key: "tarefa"    as const, label: "Tarefa",    icon: "📌" },
];

const Q_TYPES: { key: QuestionType; label: string; icon: string }[] = [
  { key: "multipla_escolha", label: "Múltipla Escolha", icon: "🔵" },
  { key: "verdadeiro_falso", label: "Verdadeiro/Falso",  icon: "⚖️" },
  { key: "ligar",            label: "Ligar Colunas",     icon: "🔗" },
  { key: "arrastar",         label: "Arrastar Palavras", icon: "✋" },
];

const PARTIAL_SCORES = [
  { value: 0,    label: "0%",   hint: "Incorreta" },
  { value: 0.25, label: "25%",  hint: "Bem distrator" },
  { value: 0.5,  label: "50%",  hint: "Parcialmente correto" },
  { value: 0.75, label: "75%",  hint: "Quase correto" },
];

// ── Types ──────────────────────────────────────────────────────────────────────

type Difficulty = "facil" | "medio" | "dificil";
type ActivityType = "atividade" | "prova" | "simulado" | "tarefa";

interface DraftQuestion {
  id: string;
  type: QuestionType;
  difficulty: Difficulty;
  bloomLevel: string;
  bnccCode: string;
  context: string;
  command: string;
  score: number;
  alternatives: Alternative[];
  matchPairs: MatchPair[];
  dragContext: string;
  dragWords: string;
  dragOrder: string;
}

interface ActivityDraft {
  title: string;
  subjectId: string;   // real subject UUID
  classId: string;     // real class UUID
  type: ActivityType;
  bimester: number;
  timeLimitMinutes: string;
  availableUntil: string;
  instructions: string;
  coinsReward: number;
}

interface TurmaOption {
  id: string; full_name: string; segment: string;
  subjects: { id: string; subject_id: string; name: string; color: string; icon: string; }[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function blankQuestion(): DraftQuestion {
  return {
    id: `q_${Date.now()}`,
    type: "multipla_escolha",
    difficulty: "medio",
    bloomLevel: "Compreensão",
    bnccCode: "",
    context: "",
    command: "",
    score: 20,
    alternatives: [
      { id: "a", label: "A", text: "", isCorrect: true,  partialScore: 1.0 },
      { id: "b", label: "B", text: "", isCorrect: false, partialScore: 0.0 },
      { id: "c", label: "C", text: "", isCorrect: false, partialScore: 0.0 },
      { id: "d", label: "D", text: "", isCorrect: false, partialScore: 0.0 },
    ],
    matchPairs: [
      { id: "p1", left: "", right: "" },
      { id: "p2", left: "", right: "" },
    ],
    dragContext: "",
    dragWords: "",
    dragOrder: "",
  };
}

// ── Mock AI suggestions ────────────────────────────────────────────────────────

async function fetchAISuggestions(topic: string, subjectName: string): Promise<DraftQuestion[]> {
  await new Promise((r) => setTimeout(r, 2200));
  return [
    {
      ...blankQuestion(),
      id: `ai_mc_${Date.now()}`,
      type: "multipla_escolha",
      difficulty: "medio",
      bloomLevel: "Compreensão",
      bnccCode: "EF04MA01",
      command: `Qual das afirmações sobre "${topic}" está correta?`,
      context: `Analise os conceitos de ${subjectName} relacionados ao tema "${topic}".`,
      score: 25,
      alternatives: [
        { id: "a", label: "A", text: `A definição correta de ${topic}`, isCorrect: true,  partialScore: 1.0 },
        { id: "b", label: "B", text: `Uma interpretação parcial de ${topic}`,   isCorrect: false, partialScore: 0.5  },
        { id: "c", label: "C", text: `Uma concepção alternativa de ${topic}`,  isCorrect: false, partialScore: 0.25 },
        { id: "d", label: "D", text: `Uma afirmação incorreta sobre ${topic}`,  isCorrect: false, partialScore: 0.0  },
      ],
      matchPairs: [], dragContext: "", dragWords: "", dragOrder: "",
    },
    {
      ...blankQuestion(),
      id: `ai_vf_${Date.now()}`,
      type: "verdadeiro_falso",
      difficulty: "facil",
      bloomLevel: "Conhecimento",
      bnccCode: "EF04MA02",
      command: `É correto afirmar que "${topic}" é um conceito fundamental em ${subjectName}.`,
      context: "",
      score: 15,
      alternatives: [
        { id: "v", label: "V", text: "Verdadeiro", isCorrect: true,  partialScore: 1.0 },
        { id: "f", label: "F", text: "Falso",      isCorrect: false, partialScore: 0.0 },
      ],
      matchPairs: [], dragContext: "", dragWords: "", dragOrder: "",
    },
    {
      ...blankQuestion(),
      id: `ai_ligar_${Date.now()}`,
      type: "ligar",
      difficulty: "medio",
      bloomLevel: "Análise",
      bnccCode: "EF04MA03",
      command: `Ligue cada conceito relacionado a "${topic}" com sua definição:`,
      context: "",
      score: 20,
      alternatives: [],
      matchPairs: [
        { id: "p1", left: `Conceito A de ${topic}`, right: "Definição correspondente A" },
        { id: "p2", left: `Conceito B de ${topic}`, right: "Definição correspondente B" },
        { id: "p3", left: `Conceito C de ${topic}`, right: "Definição correspondente C" },
      ],
      dragContext: "", dragWords: "", dragOrder: "",
    },
  ];
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function NovaAtividadePage() {
  const router = useRouter();

  // Wizard step: 0 = Config, 1 = Questions, 2 = Review
  const [step, setStep] = useState(0);
  const [publishing, setPublishing] = useState(false);

  // Real turmas/subjects
  const { data: turmas } = useQuery<TurmaOption[]>(
    () => turmasApi.list() as Promise<TurmaOption[]>,
    []
  );

  // Activity metadata
  const [draft, setDraft] = useState<ActivityDraft>({
    title: "",
    subjectId: "",
    classId: "",
    type: "atividade",
    bimester: 1,
    timeLimitMinutes: "45",
    availableUntil: "",
    instructions: "Leia cada questão com atenção antes de responder.",
    coinsReward: 0,
  });

  // Questions
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [editingQ,  setEditingQ]  = useState<DraftQuestion | null>(null);
  const [isNewQ,    setIsNewQ]    = useState(false);

  // AI panel
  const [aiOpen,    setAiOpen]    = useState(false);
  const [aiTopic,   setAiTopic]   = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<DraftQuestion[]>([]);

  const allSubjects = useMemo(() =>
    (turmas ?? []).flatMap((t) => t.subjects.map((s) => ({ ...s, class_id: t.id, class_name: t.full_name }))),
    [turmas]
  );

  const subject = useMemo(() => {
    const found = allSubjects.find((s) => s.subject_id === draft.subjectId);
    return found
      ? { id: found.subject_id, name: found.name, color: found.color, icon: found.icon ?? "📚" }
      : { id: "", name: "Disciplina", color: "#f0c040", icon: "📚" };
  }, [allSubjects, draft.subjectId]);

  const totalScore = useMemo(() => questions.reduce((s, q) => s + q.score, 0), [questions]);

  // ── Activity info update helpers ────────────────────────
  function setField<K extends keyof ActivityDraft>(key: K, value: ActivityDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  // ── Question CRUD ────────────────────────────────────────
  function openNewQuestion() {
    setEditingQ(blankQuestion());
    setIsNewQ(true);
  }
  function openEditQuestion(q: DraftQuestion) {
    setEditingQ({ ...q });
    setIsNewQ(false);
  }
  function saveQuestion() {
    if (!editingQ) return;
    if (isNewQ) {
      setQuestions((prev) => [...prev, editingQ]);
    } else {
      setQuestions((prev) => prev.map((q) => q.id === editingQ.id ? editingQ : q));
    }
    setEditingQ(null);
  }
  function deleteQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  // ── Question field update helpers ─────────────────────────
  function setQField<K extends keyof DraftQuestion>(key: K, value: DraftQuestion[K]) {
    setEditingQ((prev) => prev ? { ...prev, [key]: value } : null);
  }
  function setAltText(idx: number, text: string) {
    setEditingQ((prev) => {
      if (!prev) return null;
      const alts = [...prev.alternatives];
      alts[idx] = { ...alts[idx], text };
      return { ...prev, alternatives: alts };
    });
  }
  function setAltPartial(idx: number, partialScore: number) {
    setEditingQ((prev) => {
      if (!prev) return null;
      const alts = [...prev.alternatives];
      alts[idx] = { ...alts[idx], partialScore };
      return { ...prev, alternatives: alts };
    });
  }
  function setCorrectAlt(idx: number) {
    setEditingQ((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        alternatives: prev.alternatives.map((a, i) => ({
          ...a,
          isCorrect:    i === idx,
          partialScore: i === idx ? 1.0 : a.partialScore === 1.0 ? 0.0 : a.partialScore,
        })),
      };
    });
  }
  function setMatchPair(idx: number, side: "left" | "right", value: string) {
    setEditingQ((prev) => {
      if (!prev) return null;
      const pairs = [...prev.matchPairs];
      pairs[idx] = { ...pairs[idx], [side]: value };
      return { ...prev, matchPairs: pairs };
    });
  }
  function addMatchPair() {
    setEditingQ((prev) => {
      if (!prev) return null;
      return { ...prev, matchPairs: [...prev.matchPairs, { id: `p${Date.now()}`, left: "", right: "" }] };
    });
  }
  function removeMatchPair(idx: number) {
    setEditingQ((prev) => {
      if (!prev) return null;
      const pairs = prev.matchPairs.filter((_, i) => i !== idx);
      return { ...prev, matchPairs: pairs };
    });
  }

  // ── When type changes, reset type-specific fields ──────────
  function changeQType(type: QuestionType) {
    setEditingQ((prev) => {
      if (!prev) return null;
      let alternatives = prev.alternatives;
      if (type === "verdadeiro_falso") {
        alternatives = [
          { id: "v", label: "V", text: "Verdadeiro", isCorrect: true,  partialScore: 1.0 },
          { id: "f", label: "F", text: "Falso",      isCorrect: false, partialScore: 0.0 },
        ];
      } else if (type === "multipla_escolha" && (prev.type === "verdadeiro_falso" || prev.type === "ligar" || prev.type === "arrastar")) {
        alternatives = [
          { id: "a", label: "A", text: "", isCorrect: true,  partialScore: 1.0 },
          { id: "b", label: "B", text: "", isCorrect: false, partialScore: 0.0 },
          { id: "c", label: "C", text: "", isCorrect: false, partialScore: 0.0 },
          { id: "d", label: "D", text: "", isCorrect: false, partialScore: 0.0 },
        ];
      }
      return { ...prev, type, alternatives };
    });
  }

  // ── AI generation ────────────────────────────────────────
  async function handleAIGenerate() {
    if (!aiTopic.trim()) return;
    setAiLoading(true);
    setAiResults([]);
    const results = await fetchAISuggestions(aiTopic, subject.name);
    setAiResults(results);
    setAiLoading(false);
  }
  function addAISuggestion(q: DraftQuestion) {
    setQuestions((prev) => [...prev, { ...q, id: `q_${Date.now()}` }]);
    setAiResults((prev) => prev.filter((r) => r.id !== q.id));
  }

  // ── Validation ───────────────────────────────────────────
  const step1Valid = draft.title.trim().length > 0 && !!draft.classId && !!draft.subjectId;
  const step2Valid = questions.length > 0;
  const qValid = editingQ
    ? editingQ.command.trim().length > 0 &&
      (editingQ.type !== "multipla_escolha" || editingQ.alternatives.every((a) => a.text.trim())) &&
      (editingQ.type !== "ligar" || editingQ.matchPairs.every((p) => p.left.trim() && p.right.trim())) &&
      (editingQ.type !== "arrastar" || (editingQ.dragContext.trim() && editingQ.dragWords.trim()))
    : false;

  const DIFF_COLOR: Record<string, string> = { facil: "#34d399", medio: "#fbbf24", dificil: "#f87171" };

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────

  const STEPS = ["Configuração", "Questões", "Revisão"];

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── TOP BAR ──────────────────────────────────────── */}
      <div className="px-6 py-4 shrink-0 flex items-center gap-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(10,22,56,0.6)" }}>
        <button onClick={() => router.back()} className="text-sm shrink-0"
          style={{ color: "rgba(255,255,255,0.4)" }}>
          ←
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            {draft.title || "Nova Expedição"}
          </h1>
          <p className="text-xs" style={{ color: subject.color }}>
            {subject.icon} {subject.name}
          </p>
        </div>
        {/* Steps */}
        <div className="hidden sm:flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              {i > 0 && <div className="w-6 h-px" style={{ background: i <= step ? "#f0c040" : "rgba(255,255,255,0.1)" }} />}
              <button
                onClick={() => { if (i < step || (i === 1 && step1Valid) || (i === 2 && step1Valid && step2Valid)) setStep(i); }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150"
                style={{
                  background: i === step ? "rgba(240,192,64,0.2)" : i < step ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.05)",
                  color: i === step ? "#f0c040" : i < step ? "#34d399" : "rgba(255,255,255,0.35)",
                }}>
                {i < step ? "✓" : i + 1} {s}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── MAIN AREA ────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* ════════════════════════════════════════════════
            STEP 0 — CONFIGURAÇÃO
        ════════════════════════════════════════════════ */}
        {step === 0 && (
          <div className="p-6 max-w-2xl mx-auto space-y-6">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
              Passo 1 — Configurações da Expedição
            </p>

            {/* Title */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                Título da Atividade *
              </label>
              <input type="text" placeholder="Ex: Avaliação de Frações — 1º Bimestre"
                value={draft.title}
                onChange={(e) => setField("title", e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${draft.title ? subject.color + "50" : "rgba(255,255,255,0.1)"}` }}
              />
            </div>

            {/* Turma + Subject */}
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                Turma *
              </label>
              <div className="space-y-2">
                {(turmas ?? []).map((t) => (
                  <button key={t.id} onClick={() => { setField("classId", t.id); setField("subjectId", ""); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all duration-150"
                    style={{
                      background: draft.classId === t.id ? "rgba(240,192,64,0.1)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${draft.classId === t.id ? "rgba(240,192,64,0.4)" : "rgba(255,255,255,0.07)"}`,
                    }}>
                    <span className="text-xl">🚀</span>
                    <span className="flex-1 font-semibold text-white">{t.full_name}</span>
                    <span className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold"
                      style={{ background: draft.classId === t.id ? "#f0c040" : "rgba(255,255,255,0.08)", color: draft.classId === t.id ? "#0a1638" : "rgba(255,255,255,0.3)" }}>
                      {draft.classId === t.id ? "✓" : "+"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Subject from selected class */}
            {draft.classId && (
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Disciplina *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(turmas ?? []).find((t) => t.id === draft.classId)?.subjects.map((s) => (
                    <button key={s.subject_id} onClick={() => setField("subjectId", s.subject_id)}
                      className="flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-semibold transition-all duration-150"
                      style={{
                        background: draft.subjectId === s.subject_id ? `${s.color}20` : "rgba(255,255,255,0.04)",
                        border: `1px solid ${draft.subjectId === s.subject_id ? s.color + "50" : "rgba(255,255,255,0.08)"}`,
                        color: draft.subjectId === s.subject_id ? s.color : "rgba(255,255,255,0.45)",
                      }}>
                      <span className="text-lg">{s.icon ?? "📚"}</span>
                      <span className="truncate w-full text-center">{s.name.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Type + Bimester */}
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Tipo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ACTIVITY_TYPES.map((t) => (
                    <button key={t.key} onClick={() => setField("type", t.key)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150"
                      style={{
                        background: draft.type === t.key ? "rgba(240,192,64,0.15)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${draft.type === t.key ? "rgba(240,192,64,0.4)" : "rgba(255,255,255,0.08)"}`,
                        color: draft.type === t.key ? "#f0c040" : "rgba(255,255,255,0.45)",
                      }}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Bimestre
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map((b) => (
                    <button key={b} onClick={() => setField("bimester", b)}
                      className="py-2.5 rounded-xl text-xs font-bold transition-all duration-150"
                      style={{
                        background: draft.bimester === b ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${draft.bimester === b ? "rgba(96,165,250,0.4)" : "rgba(255,255,255,0.08)"}`,
                        color: draft.bimester === b ? "#60a5fa" : "rgba(255,255,255,0.45)",
                      }}>
                      {b}º Bim.
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Time limit + Due date */}
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Tempo Limite (min) — 0 = livre
                </label>
                <input type="number" min="0" max="300" placeholder="45"
                  value={draft.timeLimitMinutes}
                  onChange={(e) => setField("timeLimitMinutes", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Disponível Até
                </label>
                <input type="datetime-local"
                  value={draft.availableUntil}
                  onChange={(e) => setField("availableUntil", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>
            </div>


            {/* Instructions */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                Instruções para o Aluno
              </label>
              <textarea rows={3}
                value={draft.instructions}
                onChange={(e) => setField("instructions", e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none resize-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>

            {/* Coins reward */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#f0c040" }}>
                ⭐ Moedas Estelares ao Concluir
              </label>
              <input type="number" min="0" max="9999" placeholder="0 = sem moedas"
                value={draft.coinsReward}
                onChange={(e) => setDraft((p) => ({ ...p, coinsReward: Number(e.target.value) }))}
                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                style={{ background: "rgba(240,192,64,0.07)", border: "1px solid rgba(240,192,64,0.2)" }}
              />
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                Quantidade de moedas que o aluno recebe ao concluir esta expedição.
              </p>
            </div>

            <button disabled={!step1Valid} onClick={() => setStep(1)}
              className="w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all duration-200"
              style={{
                background: step1Valid ? "linear-gradient(135deg,#f0c040,#eab308)" : "rgba(255,255,255,0.06)",
                color: step1Valid ? "#0a1638" : "rgba(255,255,255,0.25)",
                cursor: step1Valid ? "pointer" : "not-allowed",
                fontFamily: "'Space Grotesk',sans-serif",
                boxShadow: step1Valid ? "0 4px 20px rgba(240,192,64,0.35)" : "none",
              }}>
              Próximo: Adicionar Questões →
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            STEP 1 — QUESTIONS
        ════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="flex h-full">
            {/* Left: question list */}
            <div className="w-80 shrink-0 border-r overflow-y-auto p-5 space-y-3"
              style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              {/* Summary */}
              <div className="px-4 py-3 rounded-xl"
                style={{ background: `${subject.color}10`, border: `1px solid ${subject.color}25` }}>
                <p className="text-xs font-semibold" style={{ color: subject.color }}>{subject.icon} {subject.name}</p>
                <p className="text-sm font-bold text-white mt-0.5">{draft.title || "Sem título"}</p>
                <div className="flex gap-3 mt-2">
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {questions.length} questões
                  </span>
                  <span className="text-xs font-bold" style={{ color: "#f0c040" }}>
                    {totalScore} pts total
                  </span>
                </div>
              </div>

              {/* Add question buttons */}
              <button onClick={openNewQuestion}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-150"
                style={{ background: "rgba(240,192,64,0.1)", color: "#f0c040", border: "1px solid rgba(240,192,64,0.25)" }}>
                + Questão Manual
              </button>
              <button onClick={() => { setAiOpen(true); setAiResults([]); setAiTopic(""); }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-150"
                style={{ background: "rgba(139,92,246,0.12)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)" }}>
                ✨ Gerar com IA (Gemini)
              </button>

              {/* Question list */}
              {questions.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: "rgba(255,255,255,0.25)" }}>
                  Nenhuma questão ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {questions.map((q, i) => (
                    <div key={q.id}
                      className="flex items-start gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150"
                      style={{
                        background: editingQ?.id === q.id ? "rgba(240,192,64,0.1)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${editingQ?.id === q.id ? "rgba(240,192,64,0.3)" : "rgba(255,255,255,0.07)"}`,
                      }}
                      onClick={() => openEditQuestion(q)}>
                      <span className="text-xs font-bold mt-0.5 shrink-0"
                        style={{ color: DIFF_COLOR[q.difficulty] }}>
                        Q{i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white line-clamp-2">{q.command || "(sem enunciado)"}</p>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                          {Q_TYPES.find((t) => t.key === q.type)?.icon} {q.score} pts • {q.bloomLevel}
                        </p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); deleteQuestion(q.id); }}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0 transition-all duration-150"
                        style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Continue */}
              {questions.length > 0 && (
                <button onClick={() => setStep(2)}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-all duration-150"
                  style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif" }}>
                  Revisar Atividade →
                </button>
              )}
            </div>

            {/* Right: question editor OR AI panel OR empty state */}
            <div className="flex-1 overflow-y-auto">
              {aiOpen ? (
                /* ── AI PANEL ── */
                <div className="p-6 max-w-xl mx-auto space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-white flex items-center gap-2">
                        ✨ Gerador com IA — Gemini
                      </h2>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(139,92,246,0.8)" }}>
                        Descreva o tópico e a IA criará questões com TRI, Bloom's e BNCC
                      </p>
                    </div>
                    <button onClick={() => setAiOpen(false)}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}>
                      ✕ Fechar
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl space-y-4"
                    style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.2)" }}>
                    <div>
                      <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                        Tópico / Tema
                      </label>
                      <input type="text"
                        placeholder={`Ex: frações equivalentes, ${subject.name}...`}
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleAIGenerate(); }}
                        className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(139,92,246,0.3)" }}
                      />
                    </div>
                    <button onClick={handleAIGenerate} disabled={!aiTopic.trim() || aiLoading}
                      className="w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2"
                      style={{
                        background: aiLoading ? "rgba(139,92,246,0.2)" : "linear-gradient(135deg,#a78bfa,#8b5cf6)",
                        color: "#fff",
                        cursor: !aiTopic.trim() || aiLoading ? "not-allowed" : "pointer",
                        opacity: !aiTopic.trim() ? 0.5 : 1,
                        fontFamily: "'Space Grotesk',sans-serif",
                      }}>
                      {aiLoading ? (
                        <>
                          <span className="animate-spin text-lg">⚙️</span>
                          Gerando questões com Gemini...
                        </>
                      ) : "✨ Gerar Questões"}
                    </button>
                  </div>

                  {aiLoading && (
                    <div className="flex flex-col items-center gap-3 py-8">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl animate-pulse"
                        style={{ background: "rgba(139,92,246,0.15)" }}>
                        🤖
                      </div>
                      <p className="text-sm font-semibold text-white">Gemini está pensando...</p>
                      <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.35)" }}>
                        Analisando BNCC, aplicando Bloom's Taxonomy<br />e calculando parâmetros TRI
                      </p>
                    </div>
                  )}

                  {aiResults.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {aiResults.length} questões geradas — revise e adicione
                      </p>
                      {aiResults.map((q) => (
                        <div key={q.id} className="rounded-2xl overflow-hidden"
                          style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)" }}>
                          <div className="px-4 py-4">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="text-xs px-2 py-0.5 rounded-full"
                                style={{ background: `${DIFF_COLOR[q.difficulty]}20`, color: DIFF_COLOR[q.difficulty] }}>
                                {DIFFICULTIES.find((d) => d.key === q.difficulty)?.label}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-full"
                                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)" }}>
                                {q.bloomLevel}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-full"
                                style={{ background: "rgba(96,165,250,0.1)", color: "#60a5fa" }}>
                                {q.bnccCode}
                              </span>
                              <span className="ml-auto text-xs font-bold" style={{ color: "#f0c040" }}>
                                {q.score} pts
                              </span>
                            </div>
                            {q.context && (
                              <p className="text-xs mb-2 px-3 py-2 rounded-lg"
                                style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)" }}>
                                {q.context}
                              </p>
                            )}
                            <p className="text-sm font-semibold text-white mb-3">{q.command}</p>
                            {q.type === "multipla_escolha" && (
                              <div className="space-y-1">
                                {q.alternatives.map((a) => (
                                  <div key={a.id} className="flex items-center gap-2 text-xs">
                                    <span className="w-5 h-5 rounded-md flex items-center justify-center font-bold shrink-0"
                                      style={{ background: a.isCorrect ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.05)", color: a.isCorrect ? "#34d399" : "rgba(255,255,255,0.4)" }}>
                                      {a.label}
                                    </span>
                                    <span className="flex-1" style={{ color: a.isCorrect ? "#34d399" : "rgba(255,255,255,0.6)" }}>
                                      {a.text}
                                    </span>
                                    <span className="shrink-0 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                                      TRI: {a.partialScore * 100}%
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {q.type === "ligar" && (
                              <div className="space-y-1">
                                {q.matchPairs.map((p) => (
                                  <div key={p.id} className="flex items-center gap-2 text-xs">
                                    <span className="flex-1 px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)" }}>{p.left}</span>
                                    <span style={{ color: "rgba(255,255,255,0.3)" }}>↔</span>
                                    <span className="flex-1 px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)" }}>{p.right}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 px-4 pb-4">
                            <button onClick={() => addAISuggestion(q)}
                              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-150"
                              style={{ background: "linear-gradient(135deg,#34d399,#10b981)", color: "#fff" }}>
                              + Adicionar à Atividade
                            </button>
                            <button onClick={() => setAiResults((prev) => prev.filter((r) => r.id !== q.id))}
                              className="px-4 py-2.5 rounded-xl text-sm transition-all duration-150"
                              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                              Ignorar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : editingQ ? (
                /* ── QUESTION EDITOR ── */
                <div className="p-6 max-w-xl mx-auto space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-white">
                      {isNewQ ? "Nova Questão" : "Editar Questão"}
                    </h2>
                    <button onClick={() => setEditingQ(null)}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}>
                      Cancelar
                    </button>
                  </div>

                  {/* Question type */}
                  <div>
                    <label className="text-xs font-semibold mb-2 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                      Tipo de Questão
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {Q_TYPES.map((t) => (
                        <button key={t.key} onClick={() => changeQType(t.key)}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150"
                          style={{
                            background: editingQ.type === t.key ? "rgba(240,192,64,0.15)" : "rgba(255,255,255,0.04)",
                            border: `1px solid ${editingQ.type === t.key ? "rgba(240,192,64,0.4)" : "rgba(255,255,255,0.08)"}`,
                            color: editingQ.type === t.key ? "#f0c040" : "rgba(255,255,255,0.45)",
                          }}>
                          {t.icon} {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Difficulty + Bloom + BNCC + Score */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                        Dificuldade
                      </label>
                      <div className="flex gap-1.5">
                        {DIFFICULTIES.map((d) => (
                          <button key={d.key} onClick={() => setQField("difficulty", d.key)}
                            className="flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-150"
                            style={{
                              background: editingQ.difficulty === d.key ? `${d.color}20` : "rgba(255,255,255,0.04)",
                              border: `1px solid ${editingQ.difficulty === d.key ? d.color + "50" : "rgba(255,255,255,0.08)"}`,
                              color: editingQ.difficulty === d.key ? d.color : "rgba(255,255,255,0.4)",
                            }}>
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                        Pontuação
                      </label>
                      <input type="number" min="1" max="100"
                        value={editingQ.score}
                        onChange={(e) => setQField("score", Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none text-center font-bold"
                        style={{ background: "rgba(240,192,64,0.08)", border: "1px solid rgba(240,192,64,0.25)", color: "#f0c040" }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                        Nível Bloom's
                      </label>
                      <select value={editingQ.bloomLevel}
                        onChange={(e) => setQField("bloomLevel", e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        {BLOOM_LEVELS.map((b) => (
                          <option key={b} value={b} style={{ background: "#0a1638" }}>{b}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                        Habilidade BNCC
                      </label>
                      <input type="text" placeholder="Ex: EF04MA08"
                        value={editingQ.bnccCode}
                        onChange={(e) => setQField("bnccCode", e.target.value.toUpperCase())}
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/30 outline-none font-mono"
                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                      />
                    </div>
                  </div>

                  {/* Context */}
                  <div>
                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                      Texto de Apoio / Contexto (opcional)
                    </label>
                    <textarea rows={3} placeholder="Texto, situação-problema ou trecho para contextualizar..."
                      value={editingQ.context}
                      onChange={(e) => setQField("context", e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none resize-none"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
                    />
                  </div>

                  {/* Command */}
                  <div>
                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                      Enunciado / Comando *
                    </label>
                    <textarea rows={2} placeholder="Escreva a pergunta ou comando da questão..."
                      value={editingQ.command}
                      onChange={(e) => setQField("command", e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none resize-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${editingQ.command ? "rgba(240,192,64,0.3)" : "rgba(255,255,255,0.1)"}` }}
                    />
                  </div>

                  {/* ── TYPE-SPECIFIC FIELDS ── */}

                  {/* Múltipla Escolha */}
                  {editingQ.type === "multipla_escolha" && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>
                          Alternativas (marque a correta • TRI = pontuação parcial)
                        </label>
                      </div>
                      <div className="space-y-2">
                        {editingQ.alternatives.map((alt, idx) => (
                          <div key={alt.id} className="flex items-center gap-2">
                            <button onClick={() => setCorrectAlt(idx)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-150"
                              style={{
                                background: alt.isCorrect ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.06)",
                                border: `1px solid ${alt.isCorrect ? "#34d399" : "rgba(255,255,255,0.1)"}`,
                                color: alt.isCorrect ? "#34d399" : "rgba(255,255,255,0.4)",
                              }}>
                              {alt.label}
                            </button>
                            <input type="text" placeholder={`Alternativa ${alt.label}...`}
                              value={alt.text}
                              onChange={(e) => setAltText(idx, e.target.value)}
                              className="flex-1 px-3 py-2 rounded-lg text-xs text-white placeholder-white/30 outline-none"
                              style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${alt.isCorrect ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.08)"}` }}
                            />
                            {/* TRI partial score — only for wrong alternatives */}
                            {!alt.isCorrect && (
                              <div className="flex gap-1 shrink-0">
                                {PARTIAL_SCORES.map((ps) => (
                                  <button key={ps.value}
                                    title={ps.hint}
                                    onClick={() => setAltPartial(idx, ps.value)}
                                    className="w-9 h-7 rounded-md text-xs font-bold transition-all duration-150"
                                    style={{
                                      background: alt.partialScore === ps.value ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.04)",
                                      color: alt.partialScore === ps.value ? "#fbbf24" : "rgba(255,255,255,0.3)",
                                      border: `1px solid ${alt.partialScore === ps.value ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.07)"}`,
                                    }}>
                                    {ps.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.25)" }}>
                        TRI: clique no percentual para definir pontuação parcial de cada distrator
                      </p>
                    </div>
                  )}

                  {/* Verdadeiro/Falso */}
                  {editingQ.type === "verdadeiro_falso" && (
                    <div>
                      <label className="text-xs font-semibold mb-2 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                        Resposta Correta
                      </label>
                      <div className="flex gap-3">
                        {editingQ.alternatives.map((alt, idx) => (
                          <button key={alt.id} onClick={() => setCorrectAlt(idx)}
                            className="flex-1 py-4 rounded-2xl text-sm font-bold transition-all duration-200"
                            style={{
                              background: alt.isCorrect ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.05)",
                              border: `1px solid ${alt.isCorrect ? "#34d399" : "rgba(255,255,255,0.1)"}`,
                              color: alt.isCorrect ? "#34d399" : "rgba(255,255,255,0.4)",
                            }}>
                            {alt.label === "V" ? "✅ Verdadeiro" : "❌ Falso"}
                            {alt.isCorrect && " (correta)"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ligar Colunas */}
                  {editingQ.type === "ligar" && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>
                          Pares de Colunas
                        </label>
                        <button onClick={addMatchPair}
                          className="text-xs px-2.5 py-1 rounded-lg"
                          style={{ background: "rgba(240,192,64,0.1)", color: "#f0c040" }}>
                          + Par
                        </button>
                      </div>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2 mb-1">
                          <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.3)" }}>Coluna A</p>
                          <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.3)" }}>Coluna B</p>
                        </div>
                        {editingQ.matchPairs.map((pair, idx) => (
                          <div key={pair.id} className="flex items-center gap-2">
                            <input type="text" placeholder="Item esquerdo"
                              value={pair.left}
                              onChange={(e) => setMatchPair(idx, "left", e.target.value)}
                              className="flex-1 px-3 py-2 rounded-lg text-xs text-white placeholder-white/30 outline-none"
                              style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)" }}
                            />
                            <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>↔</span>
                            <input type="text" placeholder="Item direito"
                              value={pair.right}
                              onChange={(e) => setMatchPair(idx, "right", e.target.value)}
                              className="flex-1 px-3 py-2 rounded-lg text-xs text-white placeholder-white/30 outline-none"
                              style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)" }}
                            />
                            {editingQ.matchPairs.length > 2 && (
                              <button onClick={() => removeMatchPair(idx)}
                                className="w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0"
                                style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Arrastar Palavras */}
                  {editingQ.type === "arrastar" && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                          Frase com lacunas — use <code className="px-1 py-0.5 rounded text-xs" style={{ background: "rgba(255,255,255,0.1)" }}>__BLANK__</code> onde a palavra vai
                        </label>
                        <textarea rows={2} placeholder="Ex: O __BLANK__ é a unidade básica da __BLANK__."
                          value={editingQ.dragContext}
                          onChange={(e) => setQField("dragContext", e.target.value)}
                          className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none resize-none font-mono"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                        />
                        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
                          Blanks detectados: {(editingQ.dragContext.match(/__BLANK__/g) ?? []).length}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                          Banco de palavras (separadas por vírgula, inclua distratores)
                        </label>
                        <input type="text" placeholder="Ex: átomo, célula, núcleo, proteína"
                          value={editingQ.dragWords}
                          onChange={(e) => setQField("dragWords", e.target.value)}
                          className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                          Ordem correta (separada por vírgula, na ordem dos blanks)
                        </label>
                        <input type="text" placeholder="Ex: átomo, célula"
                          value={editingQ.dragOrder}
                          onChange={(e) => setQField("dragOrder", e.target.value)}
                          className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                          style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)" }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Save question */}
                  <button disabled={!qValid} onClick={saveQuestion}
                    className="w-full py-4 rounded-2xl font-bold text-sm transition-all duration-200"
                    style={{
                      background: qValid ? "linear-gradient(135deg,#f0c040,#eab308)" : "rgba(255,255,255,0.06)",
                      color: qValid ? "#0a1638" : "rgba(255,255,255,0.25)",
                      cursor: qValid ? "pointer" : "not-allowed",
                      fontFamily: "'Space Grotesk',sans-serif",
                      boxShadow: qValid ? "0 4px 20px rgba(240,192,64,0.35)" : "none",
                    }}>
                    {isNewQ ? "✅ Adicionar Questão" : "💾 Salvar Alterações"}
                  </button>
                </div>
              ) : (
                /* ── EMPTY STATE ── */
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
                  <span className="text-5xl">✏️</span>
                  <p className="text-base font-semibold text-white">Adicione questões à sua atividade</p>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Crie manualmente ou use a IA para gerar questões com Bloom's, BNCC e TRI automáticos
                  </p>
                  <div className="flex gap-3 mt-2">
                    <button onClick={openNewQuestion}
                      className="px-5 py-3 rounded-xl font-bold text-sm"
                      style={{ background: "rgba(240,192,64,0.15)", color: "#f0c040", border: "1px solid rgba(240,192,64,0.3)" }}>
                      + Manual
                    </button>
                    <button onClick={() => { setAiOpen(true); setAiResults([]); setAiTopic(""); }}
                      className="px-5 py-3 rounded-xl font-bold text-sm"
                      style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)" }}>
                      ✨ Gerar com IA
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            STEP 2 — REVIEW
        ════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="p-6 max-w-2xl mx-auto space-y-6">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
              Passo 3 — Revisão Final
            </p>

            {/* Activity summary card */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${subject.color}18, rgba(255,255,255,0.03))`, border: `1px solid ${subject.color}30` }}>
              <div className="px-6 py-5">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{subject.icon}</span>
                  <div>
                    <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                      {draft.title}
                    </h2>
                    <p className="text-sm" style={{ color: subject.color }}>{subject.name}</p>
                  </div>
                  <span className="ml-auto text-xs px-3 py-1.5 rounded-full font-bold"
                    style={{ background: "rgba(240,192,64,0.15)", color: "#f0c040" }}>
                    {ACTIVITY_TYPES.find((t) => t.key === draft.type)?.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: "❓", label: "Questões",    value: questions.length },
                    { icon: "⭐", label: "Pontos",      value: totalScore },
                    { icon: "⏱",  label: "Tempo",       value: draft.timeLimitMinutes && +draft.timeLimitMinutes > 0 ? `${draft.timeLimitMinutes}min` : "Livre" },
                    { icon: "📅", label: "Bimestre",    value: `${draft.bimester}º Bim.` },
                  ].map((s) => (
                    <div key={s.label} className="py-3 rounded-xl text-center"
                      style={{ background: "rgba(255,255,255,0.05)" }}>
                      <p className="text-base font-bold text-white">{s.value}</p>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Turma + disciplina */}
            <div>
              <h3 className="text-sm font-bold text-white mb-2">🚀 Turma e Disciplina</h3>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs px-3 py-1.5 rounded-full font-semibold"
                  style={{ background: `${subject.color}15`, color: subject.color, border: `1px solid ${subject.color}30` }}>
                  {subject.icon} {subject.name}
                </span>
                <span className="text-xs px-3 py-1.5 rounded-full font-semibold"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
                  {(turmas ?? []).find((t) => t.id === draft.classId)?.full_name ?? "—"}
                </span>
              </div>
            </div>

            {/* Questions preview */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white">Questões ({questions.length})</h3>
                <button onClick={() => setStep(1)}
                  className="text-xs px-3 py-1.5 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)" }}>
                  ← Editar
                </button>
              </div>
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <div key={q.id} className="flex items-start gap-3 px-4 py-3 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <span className="text-sm font-bold mt-0.5 shrink-0 w-6" style={{ color: DIFF_COLOR[q.difficulty] }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{q.command}</p>
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: `${DIFF_COLOR[q.difficulty]}15`, color: DIFF_COLOR[q.difficulty] }}>
                          {DIFFICULTIES.find((d) => d.key === q.difficulty)?.label}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                          {q.bloomLevel}
                        </span>
                        {q.bnccCode && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-mono"
                            style={{ background: "rgba(96,165,250,0.1)", color: "#60a5fa" }}>
                            {q.bnccCode}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-bold shrink-0" style={{ color: "#f0c040" }}>
                      {q.score}pts
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Publish */}
            <div className="flex gap-3 pb-6">
              <button onClick={() => setStep(1)}
                className="flex-1 py-4 rounded-2xl font-semibold text-sm"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                ← Voltar
              </button>
              <button onClick={async () => {
                  setPublishing(true);
                  try {
                    await atividadesApi.create({
                      title: draft.title,
                      activity_type: draft.type,
                      subject_id: draft.subjectId,
                      class_id: draft.classId,
                      bimester: draft.bimester,
                      time_limit_minutes: draft.timeLimitMinutes ? Number(draft.timeLimitMinutes) : null,
                      available_until: draft.availableUntil || null,
                      instructions: draft.instructions,
                      coins_reward: draft.coinsReward || 0,
                      max_score: totalScore || 100,
                      use_tri: true,
                      published: true,
                      questions: questions.map((q) => ({
                        question_type: q.type,
                        difficulty: q.difficulty,
                        bloom_level: q.bloomLevel,
                        bncc_code: q.bnccCode || null,
                        context: q.context || null,
                        command: q.command,
                        score: q.score,
                        alternatives: q.type === "multipla_escolha" || q.type === "verdadeiro_falso"
                          ? q.alternatives.map((a) => ({ text: a.text, is_correct: a.isCorrect, partial_score: a.partialScore }))
                          : q.type === "ligar"
                          ? q.matchPairs.map((p) => ({ text: p.left, is_correct: true, partial_score: 1, match_text: p.right }))
                          : [],
                      })),
                    });
                    router.push("/dashboard/piloto/atividades");
                  } catch (err) {
                    alert(err instanceof Error ? err.message : "Erro ao publicar.");
                  } finally {
                    setPublishing(false);
                  }
                }}
                disabled={publishing}
                className="flex-2 flex-1 py-4 rounded-2xl font-bold text-sm transition-all duration-200 disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg,#f0c040,#eab308)",
                  color: "#0a1638",
                  fontFamily: "'Space Grotesk',sans-serif",
                  boxShadow: "0 4px 20px rgba(240,192,64,0.4)",
                }}>
                {publishing ? "Publicando…" : "🚀 Publicar Expedição"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
