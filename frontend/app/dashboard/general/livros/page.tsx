"use client";

import { useEffect, useMemo, useState } from "react";
import { booksApi, schoolsApi } from "../../../_lib/api";

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

interface School { id: string; name: string; city: string; state: string; }
interface GradeLevel { id: string; name: string; order_index: number; segment: string; }

function formatSize(bytes: number | null): string {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export default function LivrosAdminPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [selectedSchools, setSelectedSchools] = useState<Set<string>>(new Set());
  const [selectedGrades, setSelectedGrades] = useState<Set<string>>(new Set());
  const [forAluno, setForAluno] = useState(true);
  const [forProfessor, setForProfessor] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refetch() {
    return booksApi.list().then((d) => setBooks(d as Book[]));
  }

  useEffect(() => {
    Promise.all([
      booksApi.list().then((d) => setBooks(d as Book[])),
      schoolsApi.list().then((d) => setSchools(d as School[])),
      schoolsApi.gradeLevels().then((d) => setGradeLevels(d as GradeLevel[])),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggle<T extends string>(set: Set<T>, value: T): Set<T> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value); else next.add(value);
    return next;
  }

  function resetForm() {
    setName("");
    setSelectedSchools(new Set());
    setSelectedGrades(new Set());
    setForAluno(true);
    setForProfessor(false);
    setFile(null);
    setError(null);
  }

  async function handleSubmit() {
    setError(null);
    const missing: string[] = [];
    if (!name.trim()) missing.push("nome");
    if (!file) missing.push("PDF");
    if (selectedSchools.size === 0) missing.push("ao menos uma unidade");
    if (selectedGrades.size === 0) missing.push("ao menos um ano");
    if (!forAluno && !forProfessor) missing.push("aluno e/ou professor");
    if (missing.length > 0) {
      setError(`Preencha: ${missing.join(", ")}.`);
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("file", file!);
      fd.append("school_ids", JSON.stringify(Array.from(selectedSchools)));
      fd.append("grade_level_ids", JSON.stringify(Array.from(selectedGrades)));
      fd.append("for_aluno", String(forAluno));
      fd.append("for_professor", String(forProfessor));
      await booksApi.create(fd);
      await refetch();
      resetForm();
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar livro.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(b: Book) {
    if (!confirm(`Remover o livro "${b.name}"?`)) return;
    await booksApi.delete(b.id);
    refetch();
  }

  const sortedSchools = useMemo(() => [...schools].sort((a, b) => a.name.localeCompare(b.name)), [schools]);
  const sortedGrades = useMemo(() => [...gradeLevels].sort((a, b) => a.order_index - b.order_index), [gradeLevels]);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
            {loading ? "Carregando..." : `${books.length} livro${books.length !== 1 ? "s" : ""} cadastrado${books.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-5 py-3 rounded-xl font-bold text-sm"
          style={{
            background: "linear-gradient(135deg,#f0c040,#eab308)",
            color: "#0a1638",
            fontFamily: "'Space Grotesk',sans-serif",
          }}
        >
          + Cadastrar Livro
        </button>
      </div>

      {!loading && books.length === 0 && (
        <div
          className="rounded-2xl py-12 text-center"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(240,192,64,0.1)" }}
        >
          <div className="text-5xl mb-3">📚</div>
          <p className="text-base font-semibold text-white">Nenhum livro cadastrado</p>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            Clique em &quot;Cadastrar Livro&quot; para começar.
          </p>
        </div>
      )}

      {books.length > 0 && (
        <div className="space-y-2">
          {books.map((b) => (
            <div
              key={b.id}
              className="flex items-start gap-3 px-4 py-3 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div
                className="w-12 h-14 rounded-lg flex items-center justify-center text-xl shrink-0"
                style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638" }}
              >
                📖
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{b.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {b.grade_levels.map((g) => g.name).join(" · ") || "—"}
                </p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {b.schools.map((s) => (
                    <span
                      key={s.id}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(96,165,250,0.12)", color: "#60a5fa" }}
                    >
                      {s.name}
                    </span>
                  ))}
                  {b.for_aluno && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(52,211,153,0.12)", color: "#34d399" }}>
                      👨‍🚀 Aluno
                    </span>
                  )}
                  {b.for_professor && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(240,192,64,0.12)", color: "#f0c040" }}>
                      👨‍🏫 Professor
                    </span>
                  )}
                </div>
                <p className="text-xs mt-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {formatSize(b.file_size)} · cadastrado em {new Date(b.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <a
                  href={booksApi.fileUrlWithToken(b.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold text-center"
                  style={{ background: "rgba(96,165,250,0.12)", color: "#60a5fa" }}
                >
                  Abrir
                </a>
                <button
                  onClick={() => handleDelete(b)}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                  style={{ background: "rgba(248,113,113,0.12)", color: "#f87171" }}
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div
            className="w-full max-w-2xl rounded-3xl p-6 space-y-4 overflow-y-auto"
            style={{ background: "#0d1a3a", border: "1px solid rgba(240,192,64,0.2)", maxHeight: "92vh" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                  📖 Cadastrar Livro
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Vincule o PDF a uma ou mais unidades, anos e perfis.
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                Nome do livro *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Matemática Fundamental — 4º Ano"
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>

            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                Arquivo PDF * (até 50 MB)
              </label>
              <label
                className="block w-full cursor-pointer rounded-xl py-5 text-center"
                style={{ border: "2px dashed rgba(240,192,64,0.3)", background: "rgba(240,192,64,0.03)" }}
              >
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-2xl mb-1">📂</p>
                <p className="text-sm font-semibold" style={{ color: file ? "#f0c040" : "rgba(255,255,255,0.6)" }}>
                  {file ? file.name : "Clique para selecionar o PDF"}
                </p>
                {file && (
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {formatSize(file.size)}
                  </p>
                )}
              </label>
            </div>

            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                Unidades * ({selectedSchools.size} selecionada{selectedSchools.size !== 1 ? "s" : ""})
              </label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {sortedSchools.map((s) => {
                  const sel = selectedSchools.has(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSchools(toggle(selectedSchools, s.id))}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                      style={{
                        background: sel ? "rgba(240,192,64,0.2)" : "rgba(255,255,255,0.05)",
                        color: sel ? "#f0c040" : "rgba(255,255,255,0.5)",
                        border: `1px solid ${sel ? "rgba(240,192,64,0.4)" : "rgba(255,255,255,0.08)"}`,
                      }}
                    >
                      {sel ? "✓ " : ""}{s.name}
                    </button>
                  );
                })}
                {sortedSchools.length === 0 && (
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Nenhuma unidade cadastrada.</p>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                Anos escolares * ({selectedGrades.size} selecionado{selectedGrades.size !== 1 ? "s" : ""})
              </label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {sortedGrades.map((g) => {
                  const sel = selectedGrades.has(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedGrades(toggle(selectedGrades, g.id))}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                      style={{
                        background: sel ? "rgba(96,165,250,0.2)" : "rgba(255,255,255,0.05)",
                        color: sel ? "#60a5fa" : "rgba(255,255,255,0.5)",
                        border: `1px solid ${sel ? "rgba(96,165,250,0.4)" : "rgba(255,255,255,0.08)"}`,
                      }}
                    >
                      {sel ? "✓ " : ""}{g.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                Disponível para *
              </label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={forAluno} onChange={(e) => setForAluno(e.target.checked)} />
                  <span className="text-sm text-white">👨‍🚀 Alunos</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={forProfessor} onChange={(e) => setForProfessor(e.target.checked)} />
                  <span className="text-sm text-white">👨‍🏫 Professores</span>
                </label>
              </div>
            </div>

            {error && (
              <div
                className="px-3 py-2 rounded-xl text-xs"
                style={{ background: "rgba(248,113,113,0.1)", color: "#fca5a5", border: "1px solid rgba(248,113,113,0.25)" }}
              >
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3 rounded-2xl font-bold text-sm disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg,#f0c040,#eab308)",
                  color: "#0a1638",
                  fontFamily: "'Space Grotesk',sans-serif",
                }}
              >
                {submitting ? "Enviando..." : "Cadastrar →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
