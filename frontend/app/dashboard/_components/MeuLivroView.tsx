"use client";

import { useEffect, useState } from "react";
import { booksApi } from "../../_lib/api";

interface BookItem {
  id: string;
  name: string;
  file_size: number | null;
  schools: { id: string; name: string }[];
  grade_levels: { id: string; name: string; order_index: number }[];
  created_at: string;
}

interface BookCollection {
  id: string;
  name: string;
  subject: string | null;
  for_aluno: boolean;
  for_professor: boolean;
  items: BookItem[];
  created_at: string;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "-";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export default function MeuLivroView() {
  const [collections, setCollections] = useState<BookCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [openItemId, setOpenItemId] = useState<string | null>(null);

  useEffect(() => {
    booksApi
      .myCollections()
      .then((d) => setCollections(d as BookCollection[]))
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar livros."))
      .finally(() => setLoading(false));
  }, []);

  const selectedCollection = collections.find((c) => c.id === selectedCollectionId) ?? null;
  const openItem = selectedCollection?.items.find((item) => item.id === openItemId) ?? null;

  return (
    <div className="p-6 space-y-5">
      <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
        {loading
          ? "Carregando livros..."
          : selectedCollection
            ? `${selectedCollection.items.length} PDF${selectedCollection.items.length !== 1 ? "s" : ""}`
            : `${collections.length} livro${collections.length !== 1 ? "s" : ""} disponivel${collections.length !== 1 ? "is" : ""}`}
      </p>

      {error && (
        <div
          className="px-4 py-3 rounded-xl text-sm"
          style={{ background: "rgba(248,113,113,0.1)", color: "#fca5a5", border: "1px solid rgba(248,113,113,0.25)" }}
        >
          {error}
        </div>
      )}

      {!loading && !error && collections.length === 0 && (
        <div
          className="rounded-2xl py-14 text-center"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(240,192,64,0.1)" }}
        >
          <p className="text-base font-semibold text-white">Nenhum livro disponivel ainda</p>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
            Quando a coordenacao cadastrar materiais para voce, eles aparecerao aqui.
          </p>
        </div>
      )}

      {!loading && !selectedCollection && collections.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {collections.map((collection) => (
            <button
              key={collection.id}
              onClick={() => setSelectedCollectionId(collection.id)}
              className="text-left rounded-2xl p-4 transition-all duration-150 hover:scale-[1.02]"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(240,192,64,0.15)" }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-12 h-14 rounded-lg flex items-center justify-center text-xl shrink-0"
                  style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638" }}
                >
                  PDF
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{collection.name}</p>
                  {collection.subject && (
                    <p className="text-xs mt-0.5 font-semibold" style={{ color: "#f0c040" }}>
                      {collection.subject}
                    </p>
                  )}
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {collection.items.length} PDF{collection.items.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedCollection && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <button
                onClick={() => setSelectedCollectionId(null)}
                className="text-xs mb-2 px-3 py-1.5 rounded-lg font-semibold"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)" }}
              >
                Voltar
              </button>
              <p className="text-lg font-bold text-white truncate">{selectedCollection.name}</p>
              {selectedCollection.subject && (
                <p className="text-xs font-semibold mt-0.5" style={{ color: "#f0c040" }}>
                  {selectedCollection.subject}
                </p>
              )}
            </div>
          </div>

          {selectedCollection.items.length === 0 ? (
            <div className="rounded-2xl py-12 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(240,192,64,0.1)" }}>
              <p className="text-sm text-white">Nenhum PDF disponivel neste livro.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedCollection.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setOpenItemId(item.id)}
                  className="w-full text-left flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{item.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {item.schools.map((s) => s.name).join(", ")}
                      {item.schools.length > 0 && item.grade_levels.length > 0 ? " | " : ""}
                      {item.grade_levels.map((g) => g.name).join(" | ")}
                    </p>
                  </div>
                  <p className="text-xs shrink-0" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {formatSize(item.file_size)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {openItem && selectedCollection && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)" }}
        >
          <div
            className="flex items-center justify-between px-5 py-3 shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{itemTitle(selectedCollection, openItem)}</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                {openItem.grade_levels.map((g) => g.name).join(" | ")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={booksApi.fileUrlWithToken(openItem.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl text-xs font-semibold"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
              >
                Abrir em nova aba
              </a>
              <button
                onClick={() => setOpenItemId(null)}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
              >
                x
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <PdfViewer bookId={openItem.id} />
          </div>
        </div>
      )}
    </div>
  );
}

function itemTitle(collection: BookCollection, item: BookItem): string {
  if (item.name === collection.name) return collection.name;
  return `${collection.name} - ${item.name}`;
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
