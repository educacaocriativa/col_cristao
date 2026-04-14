"use client";

import { useState, useRef, useCallback } from "react";
import { bnccApi } from "../../../_lib/api";
import { useQuery } from "../../../_lib/useQuery";

interface Skill {
  id: string; code: string; description: string;
  subject_area: string | null; grade_level: string | null; component: string | null;
  created_at: string;
}
interface Meta { subject_areas: string[]; grade_levels: string[]; }

const EMPTY_FORM = { code: "", description: "", subject_area: "", grade_level: "", component: "" };

function FormField({ label, value, onChange, placeholder = "", textarea = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean;
}) {
  const cls = "w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30 outline-none";
  const style = { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" };
  return (
    <div>
      <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</label>
      {textarea
        ? <textarea rows={3} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cls} style={style} />
        : <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cls} style={style} />}
    </div>
  );
}

// ── CSV parser (client-side) ───────────────────────────────────
function parseCSV(text: string) {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
  return lines.slice(1).map((line) => {
    // Handle quoted fields
    const vals: string[] = [];
    let cur = ""; let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { vals.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    vals.push(cur.trim());
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
    return {
      code: obj["code"] || obj["código"] || "",
      description: obj["description"] || obj["descrição"] || obj["descricao"] || "",
      subject_area: obj["subject_area"] || obj["area"] || obj["área"] || obj["componente_curricular"] || "",
      grade_level: obj["grade_level"] || obj["ano"] || obj["serie"] || obj["série"] || "",
      component: obj["component"] || obj["objeto"] || "",
    };
  }).filter((s) => s.code && s.description);
}

export default function BNCCPage() {
  const [search, setSearch]               = useState("");
  const [filterArea, setFilterArea]       = useState("");
  const [filterLevel, setFilterLevel]     = useState("");
  const [modal, setModal]                 = useState<"add" | "edit" | null>(null);
  const [form, setForm]                   = useState({ ...EMPTY_FORM });
  const [editId, setEditId]               = useState<string | null>(null);
  const [saving, setSaving]               = useState(false);
  const [importResult, setImportResult]   = useState<{ inserted: number; skipped: number } | null>(null);
  const [importing, setImporting]         = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: skills, loading, refetch } = useQuery<Skill[]>(
    () => bnccApi.list({ search, subject_area: filterArea, grade_level: filterLevel }) as Promise<Skill[]>,
    [search, filterArea, filterLevel]
  );
  const { data: meta } = useQuery<Meta>(() => bnccApi.meta() as Promise<Meta>, []);

  const openAdd  = () => { setForm({ ...EMPTY_FORM }); setEditId(null); setModal("add"); };
  const openEdit = (s: Skill) => {
    setForm({ code: s.code, description: s.description, subject_area: s.subject_area ?? "", grade_level: s.grade_level ?? "", component: s.component ?? "" });
    setEditId(s.id); setModal("edit");
  };

  async function handleSave() {
    if (!form.code.trim() || !form.description.trim()) return;
    setSaving(true);
    try {
      if (modal === "edit" && editId) {
        await bnccApi.update(editId, form);
      } else {
        await bnccApi.create(form);
      }
      setModal(null); refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string, code: string) {
    if (!confirm(`Remover habilidade ${code}?`)) return;
    await bnccApi.delete(id);
    refetch();
  }

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const skills = parseCSV(text);
      if (!skills.length) { alert("Nenhuma habilidade válida encontrada no CSV."); return; }
      setImporting(true);
      try {
        const res = await bnccApi.bulk(skills) as { inserted: number; skipped: number };
        setImportResult(res);
        refetch();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Erro na importação.");
      } finally { setImporting(false); if (fileRef.current) fileRef.current.value = ""; }
    };
    reader.readAsText(file, "utf-8");
  }, [refetch]);

  const F = (field: keyof typeof EMPTY_FORM, label: string, placeholder = "", textarea = false) => (
    <FormField label={label} value={form[field]} placeholder={placeholder}
      textarea={textarea} onChange={(v) => setForm((p) => ({ ...p, [field]: v }))} />
  );

  const totalByArea = (skills ?? []).reduce<Record<string, number>>((acc, s) => {
    const k = s.subject_area ?? "Sem área";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            BNCC / Currículo
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            {loading ? "Carregando…" : `${skills?.length ?? 0} habilidades carregadas`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            type="file" accept=".csv" ref={fileRef} className="hidden" onChange={handleFile} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ background: "rgba(96,165,250,0.12)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.25)" }}>
            {importing ? "Importando…" : "📥 Importar CSV"}
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif" }}>
            + Nova Habilidade
          </button>
        </div>
      </div>

      {/* Import result toast */}
      {importResult && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}>
          <p className="text-sm" style={{ color: "#34d399" }}>
            ✅ Importação concluída: <strong>{importResult.inserted}</strong> inseridas, <strong>{importResult.skipped}</strong> ignoradas
          </p>
          <button onClick={() => setImportResult(null)} style={{ color: "rgba(255,255,255,0.4)" }}>✕</button>
        </div>
      )}

      {/* CSV format hint */}
      <div className="px-4 py-3 rounded-xl"
        style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.12)" }}>
        <p className="text-xs font-semibold mb-1" style={{ color: "#60a5fa" }}>📋 Formato do CSV</p>
        <p className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>
          code,description,subject_area,grade_level,component
        </p>
        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
          Exemplo: EF04MA01,"Resolver problemas de adição…",Matemática,4º Ano,Números e Operações
        </p>
      </div>

      {/* Stats by area */}
      {Object.keys(totalByArea).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(totalByArea).slice(0, 8).map(([area, cnt]) => (
            <button key={area}
              onClick={() => setFilterArea(filterArea === area ? "" : area)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{
                background: filterArea === area ? "rgba(240,192,64,0.2)" : "rgba(255,255,255,0.05)",
                color: filterArea === area ? "#f0c040" : "rgba(255,255,255,0.5)",
                border: `1px solid ${filterArea === area ? "rgba(240,192,64,0.3)" : "rgba(255,255,255,0.08)"}`,
              }}>
              {area} ({cnt})
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Buscar por código ou descrição…"
          className="flex-1 min-w-48 px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30 outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
        <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm text-white outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <option value="" style={{ background: "#0d1a3a" }}>Todos os anos</option>
          {(meta?.grade_levels ?? []).map((l) => (
            <option key={l} value={l} style={{ background: "#0d1a3a" }}>{l}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading && (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto"
            style={{ borderColor: "#f0c040", borderTopColor: "transparent" }} />
        </div>
      )}

      {!loading && (!skills || skills.length === 0) && (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <span className="text-6xl">🎯</span>
          <p className="text-lg font-bold text-white">Nenhuma habilidade BNCC cadastrada</p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Importe um CSV ou cadastre manualmente.
          </p>
        </div>
      )}

      {!loading && skills && skills.length > 0 && (
        <div className="space-y-2">
          {skills.map((s) => (
            <div key={s.id} className="flex items-start gap-3 px-4 py-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="shrink-0 mt-0.5">
                <span className="px-2 py-0.5 rounded-md text-xs font-bold font-mono"
                  style={{ background: "rgba(240,192,64,0.12)", color: "#f0c040" }}>
                  {s.code}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white leading-snug">{s.description}</p>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {s.subject_area && (
                    <span className="text-xs px-2 py-0.5 rounded-md"
                      style={{ background: "rgba(96,165,250,0.1)", color: "#60a5fa" }}>{s.subject_area}</span>
                  )}
                  {s.grade_level && (
                    <span className="text-xs px-2 py-0.5 rounded-md"
                      style={{ background: "rgba(52,211,153,0.1)", color: "#34d399" }}>{s.grade_level}</span>
                  )}
                  {s.component && (
                    <span className="text-xs px-2 py-0.5 rounded-md"
                      style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>{s.component}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => openEdit(s)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                  style={{ background: "rgba(240,192,64,0.1)", color: "#f0c040" }}>✏️</button>
                <button onClick={() => handleDelete(s.id, s.code)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                  style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="w-full max-w-lg rounded-3xl p-6 space-y-4"
            style={{ background: "#0d1a3a", border: "1px solid rgba(240,192,64,0.2)" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                {modal === "edit" ? "Editar Habilidade" : "Nova Habilidade BNCC"}
              </h2>
              <button onClick={() => setModal(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {F("code", "Código *", "EF04MA01")}
              {F("grade_level", "Ano / Série", "4º Ano")}
            </div>
            {F("description", "Descrição *", "Descreva a habilidade…", true)}
            <div className="grid grid-cols-2 gap-3">
              {F("subject_area", "Componente Curricular", "Matemática")}
              {F("component", "Objeto do Conhecimento", "Números e Operações")}
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setModal(null)}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={!form.code.trim() || !form.description.trim() || saving}
                className="flex-1 py-3 rounded-2xl font-bold text-sm disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif" }}>
                {saving ? "Salvando…" : modal === "edit" ? "Salvar →" : "Criar →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
