"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "../../../_lib/useQuery";
import { turmasApi, schoolsApi, subjectsApi } from "../../../_lib/api";

const SHIFT_LABEL: Record<string, string> = {
  manha: "Manhã", tarde: "Tarde", noturno: "Noturno", integral: "Integral",
};
const SHIFT_OPTIONS = [
  { value: "manha",    label: "Manhã" },
  { value: "tarde",    label: "Tarde" },
  { value: "noturno",  label: "Noturno" },
  { value: "integral", label: "Integral" },
];
const SEGMENT_COLOR: Record<string, string> = {
  fundamental_i: "#60a5fa", fundamental_ii: "#a78bfa", medio: "#f0c040",
};

interface Turma {
  id: string; name: string; full_name: string; shift: string;
  grade_level_name: string; segment: string; student_count: number; school_name: string;
}
interface GradeLevel { id: string; name: string; segment: string; order_index: number; }
interface Subject { id: string; name: string; color: string; icon: string; }

const EMPTY_FORM = { name: "", shift: "manha", grade_level_id: "" };

export default function TurmasAdminPage() {
  const [search, setSearch]       = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<Turma | null>(null);
  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [saving, setSaving]       = useState(false);

  // Modal steps: 0=closed, 1=dados turma, 2=disciplinas
  const [modalStep,        setModalStep]        = useState(0);
  const [newTurmaId,       setNewTurmaId]       = useState("");
  const [newTurmaName,     setNewTurmaName]     = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [linkingSubs,      setLinkingSubs]      = useState(false);

  // CSV import
  const [csvModal,     setCsvModal]     = useState(false);
  const [csvRows,      setCsvRows]      = useState<Record<string, string>[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResults,   setCsvResults]   = useState<{ row: number; name: string; success: boolean; error?: string }[] | null>(null);

  const { data: turmas, loading, refetch } = useQuery<Turma[]>(
    () => turmasApi.list() as Promise<Turma[]>, []
  );
  const { data: gradeLevels } = useQuery<GradeLevel[]>(
    () => schoolsApi.gradeLevels() as Promise<GradeLevel[]>, []
  );
  const { data: subjects } = useQuery<Subject[]>(
    () => subjectsApi.list() as Promise<Subject[]>, []
  );

  const list = (turmas ?? []).filter((t) =>
    t.full_name.toLowerCase().includes(search.toLowerCase()) ||
    t.grade_level_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalStudents = (turmas ?? []).reduce((s, t) => s + (t.student_count ?? 0), 0);

  // ── CSV handlers ─────────────────────────────────────────────

  function downloadTurmasTemplate() {
    // Usa ";" como separador de colunas (padrão BR no Excel)
    // Usa "|" como separador de disciplinas dentro da célula
    const SEP = ';';
    const header = `nome_turma${SEP}ano_serie${SEP}turno${SEP}disciplinas`;
    const g0   = (gradeLevels ?? [])[0]?.name ?? '6º Ano';
    const g1   = (gradeLevels ?? [])[1]?.name ?? '7º Ano';
    const subs = (subjects ?? []).slice(0, 3).map(s => s.name).join('|') || 'Matemática|Português|Ciências';
    const ex1  = `Cativante${SEP}${g0}${SEP}manha${SEP}${subs}`;
    const ex2  = `Explorador${SEP}${g1}${SEP}tarde${SEP}${subs}`;
    const note = [
      `# Separador de colunas: ponto-e-vírgula (;)`,
      `# Separador de disciplinas dentro da célula: pipe (|)`,
      `# Turnos válidos: manha; tarde; noturno; integral`,
      `# Anos disponíveis: ${(gradeLevels ?? []).map(g => g.name).join('; ')}`,
      `# Disciplinas disponíveis: ${(subjects ?? []).map(s => s.name).join('; ')}`,
    ].join('\n');
    const csv = `${note}\n${header}\n${ex1}\n${ex2}\n`;
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'modelo_importacao_turmas.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function parseCsvLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = ''; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (inQuotes && line[i + 1] === '"') { current += '"'; i++; } else { inQuotes = !inQuotes; } }
      else if (ch === delimiter && !inQuotes) { result.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    result.push(current.trim());
    return result;
  }

  function detectDelimiter(firstLine: string): string {
    // Count unquoted occurrences of , and ;
    let commas = 0; let semis = 0; let inQ = false;
    for (const ch of firstLine) {
      if (ch === '"') { inQ = !inQ; }
      else if (!inQ) { if (ch === ',') commas++; else if (ch === ';') semis++; }
    }
    return semis > commas ? ';' : ',';
  }

  function handleCsvFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? '';
      const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n')
        .filter(l => l.trim() && !l.trim().startsWith('#'));
      if (lines.length < 2) { alert('Arquivo CSV vazio ou sem dados.'); return; }
      const delim = detectDelimiter(lines[0]);
      const headers = parseCsvLine(lines[0], delim).map(h => h.toLowerCase().trim().replace(/^\uFEFF/, ''));
      const rows = lines.slice(1).map(line => {
        const vals = parseCsvLine(line, delim);
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
        return obj;
      }).filter(r => Object.values(r).some(v => v.trim()));
      setCsvRows(rows); setCsvResults(null);
    };
    reader.readAsText(file, 'utf-8');
  }

  async function handleCsvImport() {
    if (csvRows.length === 0) return;
    setCsvImporting(true);
    try {
      const glMap  = new Map((gradeLevels ?? []).map(g => [g.name.toLowerCase().trim(), g.id]));
      const subMap = new Map((subjects ?? []).map(s => [s.name.toLowerCase().trim(), s.id]));
      const payload = csvRows.map(r => {
        const gradeName = (r['ano_serie'] || r['ano'] || r['serie'] || '').toLowerCase().trim();
        const discRaw   = r['disciplinas'] || r['materias'] || '';
        // aceita "|" (template BR) ou ";" como separador de disciplinas
        const discSep   = discRaw.includes('|') ? '|' : ';';
        const subjectIds = discRaw.split(discSep).map(d => subMap.get(d.trim().toLowerCase())).filter(Boolean) as string[];
        return {
          name:           r['nome_turma'] || r['nome'] || '',
          grade_level_id: glMap.get(gradeName) ?? '',
          shift:          (r['turno'] || 'manha').toLowerCase().trim(),
          subject_ids:    subjectIds,
        };
      });
      const res = await turmasApi.importBulk(payload) as { results: typeof csvResults; successCount: number };
      setCsvResults(res.results);
      if (res.successCount > 0) refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro na importação.');
    } finally {
      setCsvImporting(false);
    }
  }

  function closeCsvModal() { setCsvModal(false); setCsvRows([]); setCsvResults(null); }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setSelectedSubjects([]);
    setNewTurmaId("");
    setNewTurmaName("");
    setModalStep(1);
    setShowModal(true);
  }

  function openEdit(t: Turma) {
    setEditing(t);
    const gl = (gradeLevels ?? []).find((g) => g.name === t.grade_level_name);
    setForm({ name: t.name, shift: t.shift, grade_level_id: gl?.id ?? "" });
    setModalStep(1);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setModalStep(0);
    setNewTurmaId("");
    setSelectedSubjects([]);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await turmasApi.update(editing.id, {
          name: form.name,
          shift: form.shift,
          ...(form.grade_level_id ? { grade_level_id: form.grade_level_id } : {}),
        });
        closeModal();
        refetch();
      } else {
        if (!form.grade_level_id) return;
        const res = await turmasApi.create({ name: form.name, shift: form.shift, grade_level_id: form.grade_level_id }) as { id: string };
        setNewTurmaId(res.id);
        const glName = (gradeLevels ?? []).find(g => g.id === form.grade_level_id)?.name ?? '';
        setNewTurmaName(`${glName} | ${form.name}`);
        setModalStep(2); // avança para seleção de disciplinas
        refetch();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar turma.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLinkSubjects() {
    if (selectedSubjects.length === 0) { closeModal(); return; }
    setLinkingSubs(true);
    try {
      await turmasApi.addSubjects(newTurmaId, selectedSubjects);
    } catch { /* silencioso */ } finally {
      setLinkingSubs(false);
    }
    closeModal();
  }

  function toggleSubject(id: string) {
    setSelectedSubjects(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            Turmas
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
            {loading ? "Carregando…" : `${(turmas ?? []).length} turmas · ${totalStudents} alunos`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setCsvModal(true); setCsvRows([]); setCsvResults(null); }}
            className="px-4 py-3 rounded-xl font-bold text-sm"
            style={{ background: "rgba(240,192,64,0.1)", color: "#f0c040", border: "1px solid rgba(240,192,64,0.3)", fontFamily: "'Space Grotesk',sans-serif" }}>
            📥 Importar CSV
          </button>
          <button onClick={openCreate}
            className="px-5 py-3 rounded-xl font-bold text-sm"
            style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif", boxShadow: "0 4px 20px rgba(240,192,64,0.3)" }}>
            + Nova Turma
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { icon: "🚀", label: "Turmas",      value: (turmas ?? []).length, color: "#60a5fa" },
          { icon: "👨‍🚀", label: "Cosmonautas", value: totalStudents,         color: "#f0c040" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-3 px-4 py-4 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="text-xl font-bold leading-none" style={{ color: s.color, fontFamily: "'Space Grotesk',sans-serif" }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>🔍</span>
        <input type="text" placeholder="Buscar turma…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "#f0c040", borderTopColor: "transparent" }} />
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-12 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-3xl mb-3">🚀</div>
          <p className="text-sm text-white font-semibold">Nenhuma turma encontrada.</p>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            Clique em &quot;+ Nova Turma&quot; para criar a primeira.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((tc) => {
            const segColor = SEGMENT_COLOR[tc.segment] ?? "#60a5fa";
            return (
              <div key={tc.id} className="rounded-2xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {/* Top bar */}
                <div className="px-5 py-4 flex items-center gap-4"
                  style={{ background: `linear-gradient(135deg, ${segColor}18, ${segColor}08)`, borderBottom: `1px solid ${segColor}20` }}>
                  <span className="text-3xl">🚀</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white">{tc.full_name}</h3>
                    <p className="text-xs" style={{ color: segColor }}>
                      {SHIFT_LABEL[tc.shift] ?? tc.shift} · {tc.student_count ?? 0} alunos
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                    style={{ background: `${segColor}20`, color: segColor }}>
                    {tc.grade_level_name}
                  </span>
                  {/* Edit button */}
                  <button onClick={() => openEdit(tc)}
                    title="Editar turma"
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
                    style={{ background: "rgba(240,192,64,0.12)", color: "#f0c040", border: "1px solid rgba(240,192,64,0.2)" }}>
                    ✏️
                  </button>
                </div>

                {/* Action buttons */}
                <div className="px-5 py-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { href: `/dashboard/piloto/turmas/${tc.id}`,        icon: "📊", label: "Visão Geral", color: "#60a5fa", bg: "rgba(59,130,246,0.12)" },
                      { href: `/dashboard/piloto/turmas/${tc.id}/chamada`, icon: "📋", label: "Chamada",     color: "#f0c040", bg: "rgba(240,192,64,0.12)" },
                      { href: `/dashboard/piloto/turmas/${tc.id}/notas`,   icon: "⭐", label: "Notas",       color: "#34d399", bg: "rgba(52,211,153,0.12)" },
                      { href: `/dashboard/piloto/turmas/${tc.id}/diario`,  icon: "📔", label: "Diário",      color: "#a78bfa", bg: "rgba(139,92,246,0.12)" },
                    ].map((btn) => (
                      <Link key={btn.href} href={btn.href}
                        className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-semibold transition-all duration-150 hover:-translate-y-px"
                        style={{ background: btn.bg, color: btn.color }}>
                        <span className="text-lg">{btn.icon}</span>
                        {btn.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CSV IMPORT MODAL ── */}
      {csvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)" }}
          onClick={e => { if (e.target === e.currentTarget) closeCsvModal(); }}>
          <div className="w-full max-w-xl rounded-3xl p-6 space-y-5 overflow-y-auto"
            style={{ background: "#0d1a3a", border: "1px solid rgba(240,192,64,0.2)", maxHeight: "92vh" }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>📥 Importar Turmas via CSV</h2>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Cadastre múltiplas turmas de uma só vez</p>
              </div>
              <button onClick={closeCsvModal} className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>✕</button>
            </div>

            {/* Modelo */}
            <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(240,192,64,0.05)", border: "1px solid rgba(240,192,64,0.15)" }}>
              <p className="text-sm font-bold" style={{ color: "#f0c040" }}>Modelo de Planilha</p>
              <div className="font-mono text-xs px-3 py-2 rounded-xl overflow-x-auto"
                style={{ background: "rgba(0,0,0,0.3)", color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap" }}>
                nome_turma · ano_serie · turno · disciplinas
              </div>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                Turnos: <span style={{ color: "#f0c040" }}>manha, tarde, noturno, integral</span>
                {(gradeLevels ?? []).length > 0 && (
                  <> · Anos: <span style={{ color: "#f0c040" }}>{(gradeLevels ?? []).map(g => g.name).join(', ')}</span></>
                )}
              </p>
              <button onClick={downloadTurmasTemplate}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm"
                style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif" }}>
                ⬇️ Baixar Modelo .CSV
              </button>
            </div>

            {/* Upload */}
            {!csvResults && (
              <label className="block w-full cursor-pointer rounded-2xl py-8 text-center"
                style={{ border: "2px dashed rgba(240,192,64,0.3)", background: "rgba(240,192,64,0.03)" }}>
                <input type="file" accept=".csv,text/csv" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleCsvFile(f); e.target.value = ''; }} />
                <p className="text-3xl mb-2">📂</p>
                <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>Clique para selecionar o arquivo CSV</p>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>Suporte a vírgula (,) e ponto-e-vírgula (;)</p>
              </label>
            )}

            {/* Preview */}
            {csvRows.length > 0 && !csvResults && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-white">{csvRows.length} turma{csvRows.length !== 1 ? "s" : ""} encontrada{csvRows.length !== 1 ? "s" : ""}</p>
                <div className="rounded-2xl overflow-x-auto" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                  <table className="text-xs" style={{ minWidth: "500px", width: "100%" }}>
                    <thead><tr style={{ background: "rgba(255,255,255,0.05)" }}>
                      {["#", "Turma", "Ano/Série", "Turno", "Disciplinas"].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap" style={{ color: "rgba(255,255,255,0.5)" }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {csvRows.slice(0, 10).map((r, i) => (
                        <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                          <td className="px-3 py-2 whitespace-nowrap" style={{ color: "rgba(255,255,255,0.3)" }}>{i + 1}</td>
                          <td className="px-3 py-2 font-semibold text-white whitespace-nowrap">{r['nome_turma'] || r['nome'] || '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap" style={{ color: "rgba(255,255,255,0.5)" }}>{r['ano_serie'] || r['ano'] || r['serie'] || '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap" style={{ color: "rgba(255,255,255,0.5)" }}>{r['turno'] || 'manha'}</td>
                          <td className="px-3 py-2" style={{ color: "rgba(255,255,255,0.4)", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r['disciplinas'] || r['materias'] || ''}>{r['disciplinas'] || r['materias'] || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {csvRows.length > 10 && (
                    <p className="px-3 py-2 text-xs text-center" style={{ color: "rgba(255,255,255,0.3)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      + {csvRows.length - 10} linha{csvRows.length - 10 !== 1 ? "s" : ""} não exibida{csvRows.length - 10 !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setCsvRows([])} className="flex-1 py-3 rounded-2xl font-semibold text-sm"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>Trocar arquivo</button>
                  <button onClick={handleCsvImport} disabled={csvImporting} className="flex-1 py-3 rounded-2xl font-bold text-sm disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif" }}>
                    {csvImporting ? "Importando…" : `Importar ${csvRows.length} Turma${csvRows.length !== 1 ? "s" : ""} →`}
                  </button>
                </div>
              </div>
            )}

            {/* Results */}
            {csvResults && (
              <div className="space-y-3">
                {(() => { const ok = csvResults.filter(r => r.success).length; const err = csvResults.filter(r => !r.success).length; return (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl py-4 text-center" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)" }}>
                      <p className="text-2xl font-bold" style={{ color: "#34d399" }}>{ok}</p>
                      <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Importadas com sucesso</p>
                    </div>
                    <div className="rounded-2xl py-4 text-center" style={{ background: err > 0 ? "rgba(248,113,113,0.08)" : "rgba(52,211,153,0.04)", border: `1px solid ${err > 0 ? "rgba(248,113,113,0.2)" : "rgba(52,211,153,0.1)"}` }}>
                      <p className="text-2xl font-bold" style={{ color: err > 0 ? "#f87171" : "#34d399" }}>{err}</p>
                      <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Com erro</p>
                    </div>
                  </div>
                ); })()}
                {csvResults.some(r => !r.success) && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold" style={{ color: "#f87171" }}>Linhas com erro:</p>
                    {csvResults.filter(r => !r.success).map(r => (
                      <div key={r.row} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                        style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)" }}>
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>Linha {r.row}</span>
                        <span className="font-semibold text-white">{r.name}</span>
                        <span style={{ color: "#f87171" }}>— {r.error}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={closeCsvModal} className="w-full py-3 rounded-2xl font-bold text-sm"
                  style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif" }}>
                  Concluir ✓
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal criar / editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="w-full max-w-md rounded-3xl p-6 space-y-4 overflow-y-auto"
            style={{ background: "#0d1a3a", border: "1px solid rgba(240,192,64,0.2)", maxHeight: "92vh" }}>

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                  {editing ? "Editar Turma" : modalStep === 2 ? `📚 Disciplinas — ${newTurmaName}` : "Nova Turma"}
                </h2>
                {!editing && (
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {modalStep === 1 ? "Passo 1 de 2 — Dados da turma" : "Passo 2 de 2 — Disciplinas ofertadas"}
                  </p>
                )}
              </div>
              <button onClick={closeModal}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>✕</button>
            </div>

            {/* ── Step 1: dados da turma ── */}
            {modalStep === 1 && (
              <div className="space-y-3">
                {/* Nome */}
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Nome da Turma *
                  </label>
                  <input type="text" value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Ex: Cativante, Turma A, 101…"
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                </div>

                {/* Turno */}
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Turno *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {SHIFT_OPTIONS.map((s) => (
                      <button key={s.value} type="button"
                        onClick={() => setForm((p) => ({ ...p, shift: s.value }))}
                        className="py-2.5 rounded-xl text-xs font-semibold"
                        style={{
                          background: form.shift === s.value ? "rgba(240,192,64,0.15)" : "rgba(255,255,255,0.05)",
                          color: form.shift === s.value ? "#f0c040" : "rgba(255,255,255,0.45)",
                          border: `1px solid ${form.shift === s.value ? "rgba(240,192,64,0.4)" : "rgba(255,255,255,0.08)"}`,
                        }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ano/Série */}
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Ano / Série {!editing && "*"}
                  </label>
                  <select value={form.grade_level_id}
                    onChange={(e) => setForm((p) => ({ ...p, grade_level_id: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <option value="" style={{ background: "#0a1638" }}>
                      {editing ? "Manter atual" : "Selecione…"}
                    </option>
                    {(gradeLevels ?? []).map((g) => (
                      <option key={g.id} value={g.id} style={{ background: "#0a1638" }}>{g.name}</option>
                    ))}
                  </select>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button onClick={closeModal}
                    className="flex-1 py-3.5 rounded-2xl font-semibold text-sm"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                    Cancelar
                  </button>
                  <button onClick={handleSave}
                    disabled={!form.name.trim() || (!editing && !form.grade_level_id) || saving}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-sm disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif" }}>
                    {saving ? "Salvando…" : editing ? "Salvar →" : "Criar Turma →"}
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 2: disciplinas ── */}
            {modalStep === 2 && (
              <div className="space-y-4">
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Selecione as disciplinas que esta turma irá oferecer. Você pode alterar isso depois.
                </p>

                {(subjects ?? []).length === 0 ? (
                  <div className="text-center py-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Nenhuma disciplina cadastrada ainda.</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(subjects ?? []).map((sub) => {
                      const sel = selectedSubjects.includes(sub.id);
                      return (
                        <button key={sub.id} type="button" onClick={() => toggleSubject(sub.id)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                          style={{
                            background: sel ? `${sub.color || "#f0c040"}22` : "rgba(255,255,255,0.06)",
                            color: sel ? (sub.color || "#f0c040") : "rgba(255,255,255,0.5)",
                            border: `1px solid ${sel ? (sub.color || "#f0c040") + "55" : "rgba(255,255,255,0.1)"}`,
                          }}>
                          {sub.icon && <span className="mr-1">{sub.icon}</span>}{sub.name}
                          {sel && <span className="ml-1.5">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedSubjects.length > 0 && (
                  <p className="text-xs" style={{ color: "#f0c040" }}>
                    {selectedSubjects.length} disciplina{selectedSubjects.length !== 1 ? "s" : ""} selecionada{selectedSubjects.length !== 1 ? "s" : ""}
                  </p>
                )}

                <div className="flex gap-3 pt-1">
                  <button onClick={closeModal} disabled={linkingSubs}
                    className="flex-1 py-3.5 rounded-2xl font-semibold text-sm disabled:opacity-50"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                    Pular
                  </button>
                  <button onClick={handleLinkSubjects} disabled={linkingSubs || selectedSubjects.length === 0}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-sm disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif" }}>
                    {linkingSubs ? "Salvando…" : `Finalizar →`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
