"use client";

interface Props {
  selected: string | null;
  onSelect: (id: string) => void;
  revealed: boolean;
  correctId: string;
}

export default function TrueFalse({ selected, onSelect, revealed, correctId }: Props) {
  const options = [
    { id: "v", label: "Verdadeiro", icon: "✓" },
    { id: "f", label: "Falso",      icon: "✗" },
  ];

  return (
    <div className="flex gap-4 justify-center mt-4">
      {options.map((opt) => {
        const isSelected = selected === opt.id;
        const isCorrect  = opt.id === correctId;

        let bg = "rgba(255,255,255,0.05)";
        let border = "rgba(255,255,255,0.1)";
        let iconColor = "rgba(255,255,255,0.4)";
        let textColor = "rgba(255,255,255,0.6)";

        if (!revealed && isSelected) {
          bg = opt.id === "v" ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)";
          border = opt.id === "v" ? "#34d399" : "#f87171";
          iconColor = opt.id === "v" ? "#34d399" : "#f87171";
          textColor = "#ffffff";
        }
        if (revealed && isCorrect) {
          bg = "rgba(52,211,153,0.15)"; border = "#34d399";
          iconColor = "#34d399"; textColor = "#34d399";
        }
        if (revealed && isSelected && !isCorrect) {
          bg = "rgba(248,113,113,0.15)"; border = "#f87171";
          iconColor = "#f87171"; textColor = "#f87171";
        }

        return (
          <button
            key={opt.id}
            onClick={() => !revealed && onSelect(opt.id)}
            disabled={revealed}
            className="flex-1 max-w-48 flex flex-col items-center gap-3 py-8 rounded-2xl transition-all duration-200"
            style={{ background: bg, border: `2px solid ${border}`, cursor: revealed ? "default" : "pointer" }}
          >
            <span className="text-4xl font-black transition-colors duration-200" style={{ color: iconColor }}>
              {opt.icon}
            </span>
            <span className="text-base font-bold transition-colors duration-200" style={{ color: textColor }}>
              {opt.label}
            </span>
            {revealed && isSelected && (
              <span className="text-xl">{isCorrect ? "⭐" : "❌"}</span>
            )}
            {revealed && !isSelected && isCorrect && (
              <span className="text-sm font-medium" style={{ color: "#34d399" }}>Correta</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
