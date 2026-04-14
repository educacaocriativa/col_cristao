"use client";

import { useState } from "react";

interface Props {
  context: string;       // texto com __BLANK__ nos espaços
  words: string[];       // todas as palavras disponíveis
  correctOrder: string[];
  answer: (string | null)[];
  onAnswer: (answer: (string | null)[]) => void;
  revealed: boolean;
}

export default function DragWords({ context, words, correctOrder, answer, onAnswer, revealed }: Props) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  const blanks = context.split("__BLANK__");
  const blankCount = blanks.length - 1;

  // words that haven't been placed yet
  const placedWords = answer.filter(Boolean) as string[];
  const availableWords = words.filter((w) => !placedWords.includes(w));

  function handleBlankClick(index: number) {
    if (revealed) return;
    if (answer[index]) {
      // Remove from blank and return to pool
      const next = [...answer];
      next[index] = null;
      onAnswer(next);
      return;
    }
    if (selectedWord) {
      const next = [...answer];
      next[index] = selectedWord;
      onAnswer(next);
      setSelectedWord(null);
    }
  }

  function handleWordClick(word: string) {
    if (revealed) return;
    setSelectedWord((prev) => (prev === word ? null : word));
  }

  function getBlankColor(index: number) {
    if (!revealed || !answer[index]) return undefined;
    return answer[index] === correctOrder[index] ? "#34d399" : "#f87171";
  }

  return (
    <div className="space-y-6">
      {/* Texto com lacunas */}
      <div className="px-5 py-5 rounded-2xl text-base leading-loose"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        {blanks.map((part, i) => (
          <span key={i}>
            <span className="text-white">{part}</span>
            {i < blankCount && (
              <button
                onClick={() => handleBlankClick(i)}
                className="inline-flex items-center justify-center min-w-20 px-3 py-1 mx-1 rounded-lg text-sm font-bold transition-all duration-200 align-middle"
                style={{
                  background: answer[i]
                    ? (revealed ? `${getBlankColor(i)}20` : "rgba(240,192,64,0.15)")
                    : (selectedWord ? "rgba(240,192,64,0.08)" : "rgba(255,255,255,0.08)"),
                  border: `2px ${answer[i] || selectedWord ? "solid" : "dashed"} ${
                    answer[i]
                      ? (revealed ? getBlankColor(i) : "#f0c040")
                      : selectedWord ? "rgba(240,192,64,0.5)" : "rgba(255,255,255,0.2)"
                  }`,
                  color: answer[i]
                    ? (revealed ? getBlankColor(i) : "#f0c040")
                    : "rgba(255,255,255,0.3)",
                  cursor: revealed ? "default" : "pointer",
                  minHeight: "2rem",
                }}
              >
                {answer[i] ?? (selectedWord ? "→" : "_____")}
              </button>
            )}
          </span>
        ))}
      </div>

      {/* Palavras disponíveis */}
      {!revealed && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
            Palavras disponíveis — clique para selecionar, depois clique no espaço
          </p>
          <div className="flex flex-wrap gap-2">
            {availableWords.map((word) => {
              const isSel = selectedWord === word;
              return (
                <button
                  key={word}
                  onClick={() => handleWordClick(word)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
                  style={{
                    background: isSel ? "rgba(240,192,64,0.2)" : "rgba(255,255,255,0.07)",
                    border:     `2px solid ${isSel ? "#f0c040" : "rgba(255,255,255,0.12)"}`,
                    color:      isSel ? "#f0c040" : "rgba(255,255,255,0.7)",
                    transform:  isSel ? "scale(1.05)" : "scale(1)",
                  }}
                >
                  {word}
                </button>
              );
            })}
            {availableWords.length === 0 && (
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                Todas as palavras foram utilizadas. Clique nos espaços para remover.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Gabarito quando revelado */}
      {revealed && (
        <div className="flex flex-wrap gap-2">
          {correctOrder.map((word, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs"
              style={{
                background: answer[i] === word ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)",
                border: `1px solid ${answer[i] === word ? "#34d399" : "#f87171"}`,
                color: answer[i] === word ? "#34d399" : "#f87171",
              }}>
              <span>Espaço {i + 1}:</span>
              <span className="font-bold">{word}</span>
              <span>{answer[i] === word ? "✓" : `(você: ${answer[i] ?? "—"})`}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
