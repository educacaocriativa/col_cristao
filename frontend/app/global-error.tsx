"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#0f172a",
          color: "#f1f5f9",
          fontFamily: "sans-serif",
          gap: "16px",
        }}
      >
        <h1 style={{ fontSize: "2rem", margin: 0 }}>🚀 Falha crítica na missão</h1>
        <p style={{ color: "#94a3b8", margin: 0 }}>
          {error?.message || "Erro inesperado. Por favor, tente novamente."}
        </p>
        <button
          onClick={reset}
          style={{
            padding: "10px 24px",
            background: "#6366f1",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          Reiniciar missão
        </button>
      </body>
    </html>
  );
}
