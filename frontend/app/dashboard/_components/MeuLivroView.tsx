"use client";

import { useEffect, useState } from "react";
import { booksApi } from "../../_lib/api";

interface Book {
  id: string;
  name: string;
  file_size: number | null;
  for_aluno: boolean;
  for_professor: boolean;
  schools: { id: string; name: string }[];
  grade_levels: { id: string; name: string; order_index: number }[];
  created_at: string;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

export default function MeuLivroView() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    booksApi
      .list()
      .then((d) => setBooks(d as Book[]))
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar livros."))
      .finally(() => setLoading(false));
  }, []);

  const openBook = books.find((b) => b.id === openId) ?? null;

  return (
    <div className="p-6 space-y-5">
      <div>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
          {loading
            ? "Carregando livros..."
            : `${books.length} livro${books.length !== 1 ? "s" : ""} disponível${books.length !== 1 ? "is" : ""}`}
        </p>
      </div>

      {error && (
        <div
          className="px-4 py-3 rounded-xl text-sm"
          style={{ background: "rgba(248,113,113,0.1)", color: "#fca5a5", border: "1px solid rgba(248,113,113,0.25)" }}
        >
          {error}
        </div>
      )}

      {!loading && !error && books.length === 0 && (
        <div
          className="rounded-2xl py-14 text-center"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(240,192,64,0.1)" }}
        >
          <div className="text-5xl mb-3">📚</div>
          <p className="text-base font-semibold text-white">Nenhum livro disponível ainda</p>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
            Quando a coordenação cadastrar materiais para você, eles aparecerão aqui.
          </p>
        </div>
      )}

      {!loading && books.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {books.map((b) => (
            <button
              key={b.id}
              onClick={() => setOpenId(b.id)}
              className="text-left rounded-2xl p-4 transition-all duration-150 hover:scale-[1.02]"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(240,192,64,0.15)" }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-12 h-14 rounded-lg flex items-center justify-center text-xl shrink-0"
                  style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638" }}
                >
                  📖
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{b.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {b.grade_levels.map((g) => g.name).join(" · ") || "—"}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {formatSize(b.file_size)} · PDF
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {openBook && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)" }}
        >
          <div
            className="flex items-center justify-between px-5 py-3 shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{openBook.name}</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                {openBook.grade_levels.map((g) => g.name).join(" · ")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={booksApi.fileUrlWithToken(openBook.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl text-xs font-semibold"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
              >
                Abrir em nova aba
              </a>
              <button
                onClick={() => setOpenId(null)}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
              >
                ✕
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <PdfViewer bookId={openBook.id} />
          </div>
        </div>
      )}
    </div>
  );
}

function PdfViewer({ bookId }: { bookId: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let revoked = false;
    let currentUrl: string | null = null;
    (async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("cc_mission_token") : null;
        const res = await fetch(booksApi.fileUrl(bookId), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (revoked) return;
        currentUrl = URL.createObjectURL(blob);
        setBlobUrl(currentUrl);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao carregar PDF.");
      }
    })();
    return () => {
      revoked = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [bookId]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-sm" style={{ color: "#fca5a5" }}>
        {error}
      </div>
    );
  }
  if (!blobUrl) {
    return (
      <div className="flex items-center justify-center h-full text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
        Carregando PDF...
      </div>
    );
  }
  return <iframe src={blobUrl} className="w-full h-full" title="Visualizador de PDF" />;
}
