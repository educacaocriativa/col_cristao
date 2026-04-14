"use client";

import { type Alternative } from "../activityMockData";

interface Props {
  alternatives: Alternative[];
  selected: string | null;
  onSelect: (id: string) => void;
  revealed: boolean;
}

export default function MultipleChoice({ alternatives, selected, onSelect, revealed }: Props) {
  return (
    <div className="space-y-2.5">
      {alternatives.map((alt) => {
        const isSelected = selected === alt.id;
        const isCorrect  = alt.isCorrect;

        let bg     = "rgba(255,255,255,0.04)";
        let border = "rgba(255,255,255,0.1)";
        let color  = "rgba(255,255,255,0.8)";
        let labelBg = "rgba(255,255,255,0.08)";
        let labelColor = "rgba(255,255,255,0.5)";

        if (!revealed && isSelected) {
          bg = "rgba(240,192,64,0.1)"; border = "rgba(240,192,64,0.5)";
          color = "#ffffff"; labelBg = "#f0c040"; labelColor = "#0a1638";
        }
        if (revealed && isSelected && isCorrect) {
          bg = "rgba(52,211,153,0.12)"; border = "#34d399";
          color = "#ffffff"; labelBg = "#34d399"; labelColor = "#ffffff";
        }
        if (revealed && isSelected && !isCorrect) {
          bg = "rgba(248,113,113,0.12)"; border = "#f87171";
          color = "#ffffff"; labelBg = "#f87171"; labelColor = "#ffffff";
        }
        if (revealed && !isSelected && isCorrect) {
          bg = "rgba(52,211,153,0.06)"; border = "rgba(52,211,153,0.4)";
          color = "#34d399"; labelBg = "rgba(52,211,153,0.2)"; labelColor = "#34d399";
        }

        return (
          <button
            key={alt.id}
            onClick={() => !revealed && onSelect(alt.id)}
            disabled={revealed}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all duration-200"
            style={{ background: bg, border: `2px solid ${border}`, cursor: revealed ? "default" : "pointer" }}
          >
            <span className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-all duration-200"
              style={{ background: labelBg, color: labelColor }}>
              {alt.label}
            </span>
            <span className="text-sm flex-1" style={{ color }}>{alt.text}</span>
            {revealed && isCorrect && (
              <span className="text-lg shrink-0">{isSelected ? "✅" : "✓"}</span>
            )}
            {revealed && isSelected && !isCorrect && (
              <span className="text-lg shrink-0">❌</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
