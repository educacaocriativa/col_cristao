"use client";

import { useState } from "react";
import { type MatchPair } from "../activityMockData";

interface Props {
  pairs: MatchPair[];
  answer: Record<string, string>; // leftId → rightId
  onAnswer: (answer: Record<string, string>) => void;
  revealed: boolean;
}

export default function MatchPairs({ pairs, answer, onAnswer, revealed }: Props) {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  const rightItems = [...pairs].sort(() => Math.random() - 0.5);
  // keep the shuffle stable after first render
  const [shuffledRight] = useState(() => [...pairs].sort(() => Math.random() - 0.5));

  const connectedRight = new Set(Object.values(answer));

  function handleLeftClick(id: string) {
    if (revealed) return;
    setSelectedLeft((prev) => (prev === id ? null : id));
  }

  function handleRightClick(rightId: string) {
    if (revealed || !selectedLeft) return;
    const newAnswer = { ...answer, [selectedLeft]: rightId };
    onAnswer(newAnswer);
    setSelectedLeft(null);
  }

  function getConnectionColor(leftId: string) {
    if (!revealed) return "#f0c040";
    const pair = pairs.find((p) => p.id === leftId);
    if (!pair) return "#f87171";
    return answer[leftId] === pair.right ? "#34d399" : "#f87171";
  }

  return (
    <div className="grid grid-cols-2 gap-6 mt-2">
      {/* Coluna esquerda */}
      <div className="space-y-2.5">
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
          Coluna A
        </p>
        {pairs.map((pair) => {
          const isSelected  = selectedLeft === pair.id;
          const isConnected = answer[pair.id] !== undefined;
          const color       = isConnected ? getConnectionColor(pair.id) : undefined;

          return (
            <button
              key={pair.id}
              onClick={() => handleLeftClick(pair.id)}
              className="w-full px-4 py-3 rounded-xl text-sm text-left transition-all duration-200 flex items-center gap-3"
              style={{
                background: isSelected  ? "rgba(240,192,64,0.15)"
                          : isConnected ? `${color}15`
                          : "rgba(255,255,255,0.05)",
                border: `2px solid ${isSelected ? "#f0c040" : isConnected ? color : "rgba(255,255,255,0.1)"}`,
                color: isConnected ? color : "rgba(255,255,255,0.8)",
                cursor: revealed ? "default" : "pointer",
              }}
            >
              {isConnected && (
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
              )}
              {pair.left}
            </button>
          );
        })}
      </div>

      {/* Coluna direita */}
      <div className="space-y-2.5">
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
          Coluna B
        </p>
        {shuffledRight.map((pair) => {
          const matchedLeft = Object.entries(answer).find(([, rv]) => rv === pair.right)?.[0];
          const isConnected = matchedLeft !== undefined;
          const color       = isConnected ? getConnectionColor(matchedLeft!) : undefined;
          const isHighlight = selectedLeft !== null && !isConnected;

          return (
            <button
              key={pair.id}
              onClick={() => handleRightClick(pair.right)}
              className="w-full px-4 py-3 rounded-xl text-sm text-left transition-all duration-200 flex items-center gap-3"
              style={{
                background: isConnected  ? `${color}15`
                          : isHighlight  ? "rgba(240,192,64,0.07)"
                          : "rgba(255,255,255,0.05)",
                border: `2px solid ${isConnected ? color : isHighlight ? "rgba(240,192,64,0.3)" : "rgba(255,255,255,0.1)"}`,
                color: isConnected ? color : isHighlight ? "rgba(240,192,64,0.8)" : "rgba(255,255,255,0.8)",
                cursor: revealed ? "default" : "pointer",
              }}
            >
              {isConnected && (
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
              )}
              {pair.right}
            </button>
          );
        })}
      </div>

      {/* Instrução */}
      {!revealed && selectedLeft && (
        <p className="col-span-2 text-xs text-center" style={{ color: "#f0c040" }}>
          ✦ Agora clique em um item da Coluna B para conectar
        </p>
      )}
      {!revealed && !selectedLeft && Object.keys(answer).length < pairs.length && (
        <p className="col-span-2 text-xs text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
          Clique em um item da Coluna A para começar a conectar
        </p>
      )}
    </div>
  );
}
