"use client";

import { useEffect, useMemo, useState } from "react";
import { provasApi } from "../../_lib/api";

interface ProvaPdf {
  id: string;
  name: string;
  original_filename: string | null;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
  created_by_name: string | null;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "-";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export default function ProvasView({ canUpload }: { canUpload: boolean }) {
  const [provas, setProvas] = useState<ProvaPdf[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return provas;
    return provas.filter((prova) => prova.name.toLowerCase().includes(needle));
  }, [provas, search]);

  async function refetch() {
    const data = await provasApi.list();
    setProvas(data as ProvaPdf[]);
  }

  useEffect(() => {
    refetch()
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar provas."))
      .finally(() => setLoading(false));
  }, []);

  async function addProva() {
    setError(null);
    const missing: string[] = [];
    if (!name.trim()) missing.push("nome do arquivo");
    if (!file) missing.push("PDF");
    if (missing.length) {
      setError(`Preencha: ${missing.join(", ")}.`);
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("name", name.trim());
      form.append("file", file!);
      await provasApi.create(form);
      setName("");
      setFile(null);
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar prova.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 space-y-5">
      {canUpload && (
        <section
          className="rounded-2xl p-5 space-y-4"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(240,192,64,0.12)",
          }}
        >
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <Field label="Nome do arquivo *">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Prova 1 - Matematica"
                className="input-base"
              />
            </Field>
            <Field label="PDF *">
              <label className="file-input">
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <span className="truncate">
                  {file ? file.name : "Selecionar arquivo PDF"}
                </span>
              </label>
            </Field>
            <button
              onClick={addProva}
              disabled={submitting}
              className="h-11 px-5 rounded-xl font-bold text-sm disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg,#f0c040,#eab308)",
                color: "#0a1638",
                fontFamily: "'Space Grotesk',sans-serif",
              }}
            >
              {submitting ? "Salvando..." : "Adicionar PDF"}
            </button>
          </div>
          {error && <ErrorBox message={error} />}
        </section>
      )}

      {!canUpload && error && <ErrorBox message={error} />}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
            {loading
              ? "Carregando..."
              : `${filtered.length} prova${filtered.length !== 1 ? "s" : ""}`}
          </p>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome"
            className="input-base max-w-sm"
          />
        </div>

        {!loading && filtered.length === 0 ? (
          <div
            className="rounded-2xl py-12 text-center"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <p className="text-base font-semibold text-white">
              Nenhuma prova encontrada
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((prova) => (
              <div
                key={prova.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {prova.name}
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    {formatSize(prova.file_size)} | {formatDate(prova.created_at)}
                    {prova.created_by_name ? ` | ${prova.created_by_name}` : ""}
                  </p>
                </div>
                <a
                  href={provasApi.downloadUrlWithToken(prova.id)}
                  className="px-4 py-2 rounded-xl text-sm font-bold"
                  style={{
                    background: "rgba(96,165,250,0.16)",
                    color: "#93c5fd",
                  }}
                >
                  Baixar
                </a>
              </div>
            ))}
          </div>
        )}
      </section>

      <style jsx>{`
        .input-base {
          width: 100%;
          height: 44px;
          padding: 0 14px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          outline: none;
          font-size: 14px;
        }
        .input-base::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }
        .file-input {
          display: flex;
          align-items: center;
          width: 100%;
          height: 44px;
          padding: 0 14px;
          border-radius: 12px;
          cursor: pointer;
          background: rgba(240, 192, 64, 0.06);
          border: 1px dashed rgba(240, 192, 64, 0.32);
          color: rgba(255, 255, 255, 0.68);
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span
        className="text-xs font-semibold mb-1.5 block"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      className="px-3 py-2 rounded-xl text-xs"
      style={{
        background: "rgba(248,113,113,0.1)",
        color: "#fca5a5",
        border: "1px solid rgba(248,113,113,0.25)",
      }}
    >
      {message}
    </div>
  );
}
