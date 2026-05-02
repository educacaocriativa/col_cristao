"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { booksApi, schoolsApi } from "../../../_lib/api";

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

interface School {
  id: string;
  name: string;
  city: string;
  state: string;
}
interface GradeLevel {
  id: string;
  name: string;
  order_index: number;
  segment: string;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "-";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export default function LivrosAdminPage() {
  const [collections, setCollections] = useState<BookCollection[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [subjectSuggestions, setSubjectSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCollectionForm, setShowCollectionForm] = useState(false);
  const [itemCollection, setItemCollection] = useState<BookCollection | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [forAluno, setForAluno] = useState(true);
  const [forProfessor, setForProfessor] = useState(false);

  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedGrades, setSelectedGrades] = useState<Set<string>>(new Set());
  const [itemName, setItemName] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const sortedSchools = useMemo(
    () => [...schools].sort((a, b) => a.name.localeCompare(b.name)),
    [schools],
  );
  const sortedGrades = useMemo(
    () => [...gradeLevels].sort((a, b) => a.order_index - b.order_index),
    [gradeLevels],
  );

  function refetch() {
    return booksApi
      .collections()
      .then((d) => setCollections(d as BookCollection[]));
  }

  useEffect(() => {
    Promise.all([
      refetch(),
      schoolsApi.list().then((d) => setSchools(d as School[])),
      schoolsApi.gradeLevels().then((d) => setGradeLevels(d as GradeLevel[])),
      booksApi
        .subjectSuggestions()
        .then((d) => setSubjectSuggestions(d ?? []))
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  function resetCollectionForm() {
    setName("");
    setSubject("");
    setForAluno(true);
    setForProfessor(false);
    setError(null);
  }

  function resetItemForm() {
    setSelectedSchool("");
    setSelectedGrades(new Set());
    setItemName("");
    setFile(null);
    setError(null);
  }

  function toggleGrade(id: string) {
    const next = new Set(selectedGrades);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedGrades(next);
  }

  async function createCollection() {
    setError(null);
    const missing: string[] = [];
    if (!name.trim()) missing.push("nome do livro");
    if (!forAluno && !forProfessor) missing.push("aluno e/ou professor");
    if (missing.length) {
      setError(`Preencha: ${missing.join(", ")}.`);
      return;
    }

    setSubmitting(true);
    try {
      await booksApi.createCollection({
        name: name.trim(),
        subject: subject.trim() || null,
        for_aluno: forAluno,
        for_professor: forProfessor,
      });
      await refetch();
      resetCollectionForm();
      setShowCollectionForm(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao criar livro.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function addPdfItem() {
    if (!itemCollection) return;
    setError(null);
    const missing: string[] = [];
    if (!itemName.trim()) missing.push("nome do PDF");
    if (!selectedSchool) missing.push("unidade");
    if (selectedGrades.size === 0) missing.push("ano escolar");
    if (!file) missing.push("PDF");
    if (missing.length) {
      setError(`Preencha: ${missing.join(", ")}.`);
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("item_name", itemName.trim());
      fd.append("file", file!);
      fd.append("school_ids", JSON.stringify([selectedSchool]));
      fd.append("grade_level_ids", JSON.stringify(Array.from(selectedGrades)));
      await booksApi.addItem(itemCollection.id, fd);
      await refetch();
      resetItemForm();
      setItemCollection(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar PDF.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeCollection(collection: BookCollection) {
    if (
      !confirm(
        `Remover o livro "${collection.name}" e todos os PDFs dentro dele?`,
      )
    )
      return;
    await booksApi.deleteCollection(collection.id);
    await refetch();
  }

  async function removeItem(item: BookItem) {
    if (!confirm("Remover este PDF?")) return;
    await booksApi.delete(item.id);
    await refetch();
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
          {loading
            ? "Carregando..."
            : `${collections.length} livro${collections.length !== 1 ? "s" : ""}`}
        </p>
        <button
          onClick={() => {
            resetCollectionForm();
            setShowCollectionForm(true);
          }}
          className="px-5 py-3 rounded-xl font-bold text-sm"
          style={{
            background: "linear-gradient(135deg,#f0c040,#eab308)",
            color: "#0a1638",
            fontFamily: "'Space Grotesk',sans-serif",
          }}
        >
          + Criar Livro
        </button>
      </div>

      {!loading && collections.length === 0 && (
        <div
          className="rounded-2xl py-12 text-center"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(240,192,64,0.1)",
          }}
        >
          <p className="text-base font-semibold text-white">
            Nenhum livro cadastrado
          </p>
          <p
            className="text-sm mt-1"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Crie um livro e depois adicione os PDFs por unidade.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {collections.map((collection) => (
          <div
            key={collection.id}
            className="rounded-2xl p-4"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-bold text-white truncate">
                  {collection.name}
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  {collection.subject ? `${collection.subject} | ` : ""}
                  {collection.for_aluno ? "Alunos" : ""}
                  {collection.for_aluno && collection.for_professor
                    ? " + "
                    : ""}
                  {collection.for_professor ? "Professores" : ""}
                  {" | "}
                  {collection.items.length} PDF
                  {collection.items.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => {
                    resetItemForm();
                    setItemCollection(collection);
                  }}
                  className="text-xs px-3 py-2 rounded-lg font-semibold"
                  style={{
                    background: "rgba(240,192,64,0.14)",
                    color: "#f0c040",
                  }}
                >
                  + PDF
                </button>
                <button
                  onClick={() => removeCollection(collection)}
                  className="text-xs px-3 py-2 rounded-lg font-semibold"
                  style={{
                    background: "rgba(248,113,113,0.12)",
                    color: "#f87171",
                  }}
                >
                  Remover
                </button>
              </div>
            </div>

            {collection.items.length === 0 ? (
              <p
                className="text-xs mt-4"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                Nenhum PDF dentro deste livro ainda.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {collection.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl px-3 py-2"
                    style={{ background: "rgba(0,0,0,0.16)" }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {item.name}
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "rgba(255,255,255,0.38)" }}
                      >
                        {item.schools.map((s) => s.name).join(", ") ||
                          "Unidade nao informada"}{" | "}
                        {item.grade_levels.map((g) => g.name).join(" | ") ||
                          "Ano nao informado"}{" "}
                        | {formatSize(item.file_size)}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <a
                        href={booksApi.fileUrlWithToken(item.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                        style={{
                          background: "rgba(96,165,250,0.12)",
                          color: "#60a5fa",
                        }}
                      >
                        Abrir
                      </a>
                      <button
                        onClick={() => removeItem(item)}
                        className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                        style={{
                          background: "rgba(248,113,113,0.12)",
                          color: "#f87171",
                        }}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {showCollectionForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            className="w-full max-w-xl rounded-3xl p-6 space-y-4"
            style={{
              background: "#0d1a3a",
              border: "1px solid rgba(240,192,64,0.2)",
            }}
          >
            <FormHeader
              title="Criar Livro"
              onClose={() => setShowCollectionForm(false)}
            />
            <Field label="Nome do livro *">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Livro do professor"
                className="input-base"
              />
            </Field>
            <Field label="Disciplina">
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                list="subject-suggestions"
                placeholder="Ex: Matematica"
                className="input-base"
              />
              <datalist id="subject-suggestions">
                {subjectSuggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>
            <Field label="Disponivel para *">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={forAluno}
                    onChange={(e) => setForAluno(e.target.checked)}
                  />{" "}
                  Alunos
                </label>
                <label className="flex items-center gap-2 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={forProfessor}
                    onChange={(e) => setForProfessor(e.target.checked)}
                  />{" "}
                  Professores
                </label>
              </div>
            </Field>
            <FormError error={error} />
            <FormActions
              onCancel={() => setShowCollectionForm(false)}
              onSubmit={createCollection}
              submitting={submitting}
              submitLabel="Criar"
            />
          </div>
        </div>
      )}

      {itemCollection && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            className="w-full max-w-2xl rounded-3xl p-6 space-y-4 overflow-y-auto"
            style={{
              background: "#0d1a3a",
              border: "1px solid rgba(240,192,64,0.2)",
              maxHeight: "92vh",
            }}
          >
            <FormHeader
              title={`Adicionar PDF em ${itemCollection.name}`}
              onClose={() => setItemCollection(null)}
            />
            <Field label="Unidade *">
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="input-base"
              >
                <option value="">Selecione uma unidade</option>
                {sortedSchools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nome do PDF *">
              <input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Ex: Unidade 1 - Livro do professor"
                className="input-base"
              />
            </Field>
            <Field
              label={`Anos escolares * (${selectedGrades.size} selecionado${selectedGrades.size !== 1 ? "s" : ""})`}
            >
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {sortedGrades.map((grade) => {
                  const selected = selectedGrades.has(grade.id);
                  return (
                    <button
                      key={grade.id}
                      type="button"
                      onClick={() => toggleGrade(grade.id)}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                      style={{
                        background: selected
                          ? "rgba(96,165,250,0.2)"
                          : "rgba(255,255,255,0.05)",
                        color: selected ? "#60a5fa" : "rgba(255,255,255,0.5)",
                        border: `1px solid ${selected ? "rgba(96,165,250,0.4)" : "rgba(255,255,255,0.08)"}`,
                      }}
                    >
                      {selected ? "OK " : ""}
                      {grade.name}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Arquivo PDF * (ate 50 MB)">
              <label
                className="block w-full cursor-pointer rounded-xl py-5 text-center"
                style={{
                  border: "2px dashed rgba(240,192,64,0.3)",
                  background: "rgba(240,192,64,0.03)",
                }}
              >
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <p
                  className="text-sm font-semibold"
                  style={{ color: file ? "#f0c040" : "rgba(255,255,255,0.6)" }}
                >
                  {file
                    ? file.name
                    : "Clique para selecionar o PDF desta unidade"}
                </p>
                {file && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    {formatSize(file.size)}
                  </p>
                )}
              </label>
            </Field>
            <FormError error={error} />
            <FormActions
              onCancel={() => setItemCollection(null)}
              onSubmit={addPdfItem}
              submitting={submitting}
              submitLabel="Adicionar PDF"
            />
          </div>
        </div>
      )}

      <style jsx>{`
        .input-base {
          width: 100%;
          padding: 10px 16px;
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
        select.input-base option {
          color: #0d1a3a;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label
        className="text-xs font-semibold mb-1.5 block"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function FormHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2
        className="text-lg font-bold text-white"
        style={{ fontFamily: "'Space Grotesk',sans-serif" }}
      >
        {title}
      </h2>
      <button
        onClick={onClose}
        className="w-8 h-8 rounded-xl flex items-center justify-center"
        style={{
          background: "rgba(255,255,255,0.08)",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        x
      </button>
    </div>
  );
}

function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div
      className="px-3 py-2 rounded-xl text-xs"
      style={{
        background: "rgba(248,113,113,0.1)",
        color: "#fca5a5",
        border: "1px solid rgba(248,113,113,0.25)",
      }}
    >
      {error}
    </div>
  );
}

function FormActions({
  onCancel,
  onSubmit,
  submitting,
  submitLabel,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitLabel: string;
}) {
  return (
    <div className="flex gap-3 pt-2">
      <button
        onClick={onCancel}
        className="flex-1 py-3 rounded-2xl font-semibold text-sm"
        style={{
          background: "rgba(255,255,255,0.06)",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        Cancelar
      </button>
      <button
        onClick={onSubmit}
        disabled={submitting}
        className="flex-1 py-3 rounded-2xl font-bold text-sm disabled:opacity-50"
        style={{
          background: "linear-gradient(135deg,#f0c040,#eab308)",
          color: "#0a1638",
          fontFamily: "'Space Grotesk',sans-serif",
        }}
      >
        {submitting ? "Salvando..." : submitLabel}
      </button>
    </div>
  );
}
