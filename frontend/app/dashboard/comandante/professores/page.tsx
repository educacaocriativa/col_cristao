"use client";

import { useState } from "react";
import { useQuery } from "../../../_lib/useQuery";
import { usuariosApi, turmasApi, subjectsApi } from "../../../_lib/api";

interface Professor {
  id: string; name: string; email: string; role: string;
  whatsapp: string | null; active: boolean; created_at: string;
  school_name: string | null;
}
interface Subject { id: string; name: string; color: string; icon: string; }
interface Turma   { id: string; full_name: string; name: string; grade_level_name: string; }

const EMPTY_PROF = { name: "", email: "", cpf: "", whatsapp: "" };

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function ProfessoresPage() {
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState<"all" | "active" | "inactive">("all");
  const [selected, setSelected] = useState<string | null>(null);

  // ── Create modal (3 steps) ────────────────────────────────────
  const [modalStep,      setModalStep]      = useState(0); // 0=closed 1=dados 2=disciplinas 3=turmas
  const [profForm,       setProfForm]       = useState({ ...EMPTY_PROF });
  const [saving,         setSaving]         = useState(false);
  const [newProfId,      setNewProfId]      = useState("");
  const [selSubjects,    setSelSubjects]    = useState<string[]>([]);
  const [selTurmas,      setSelTurmas]      = useState<string[]>([]);
  const [linking,        setLinking]        = useState(false);

  // CSV import state
  const [csvModal,     setCsvModal]     = useState(false);
  const [csvRows,      setCsvRows]      = useState<Record<string, string>[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResults,   setCsvResults]   = useState<{ row: number; name: string; success: boolean; error?: string }[] | null>(null);

  const { data: professores, loading, refetch } = useQuery<Professor[]>(
    () => usuariosApi.list({ role: "professor" }) as Promise<Professor[]>, []
  );
  const { data: subjects } = useQuery<Subject[]>(
    () => subjectsApi.list() as Promise<Subject[]>, []
  );
  const { data: turmas } = useQuery<Turma[]>(
    () => turmasApi.list() as Promise<Turma[]>, []
  );

  const filtered = (professores ?? []).filter(t =>
    (filter === "all" || (filter === "active" ? t.active : !t.active)) &&
    (!search || t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.email ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  // ── Create modal handlers ─────────────────────────────────────

  function openCreate() {
    setProfForm({ ...EMPTY_PROF });
    setSelSubjects([]);
    setSelTurmas([]);
    setNewProfId("");
    setModalStep(1);
  }

  function closeCreateModal() {
    setModalStep(0);
    setNewProfId("");
    setSelSubjects([]);
    setSelTurmas([]);
  }

  async function handleCreateProf() {
    if (!profForm.name.trim() || !profForm.email.trim()) return;
    setSaving(true);
    try {
      const res = await usuariosApi.create({
        name: profForm.name.trim(),
        email: profForm.email.trim(),
        cpf: profForm.cpf.trim() || undefined,
        whatsapp: profForm.whatsapp.trim() || undefined,
        role: "professor",
      }) as { id: string };
      setNewProfId(res.id);
      setModalStep(2);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao criar professor.");
    } finally {
      setSaving(false);
    }
  }

  function toggleSubject(id: string) {
    setSelSubjects(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  }

  function toggleTurma(id: string) {
    setSelTurmas(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  }

  async function handleLinkTurmas() {
    if (selTurmas.length === 0) { closeCreateModal(); return; }
    setLinking(true);
    try {
      for (const classId of selTurmas) {
        await turmasApi.assignProfessor(classId, newProfId, selSubjects);
      }
    } catch { /* silencioso */ } finally {
      setLinking(false);
    }
    closeCreateModal();
  }

  // ── CSV handlers ──────────────────────────────────────────────

  function downloadTemplate() {
    const SEP = ';';
    const subNames   = (subjects ?? []).slice(0, 3).map(s => s.name).join('|') || 'Matemática|Português';
    const turmaNames = (turmas   ?? []).slice(0, 2).map(t => t.full_name).join('|') || '6º Ano Cativante|7º Ano Explorador';
    const header  = `nome${SEP}email${SEP}cpf${SEP}whatsapp${SEP}disciplinas${SEP}turmas`;
    const example = `João Silva${SEP}joao@escola.edu.br${SEP}000.000.000-00${SEP}(41) 99999-0000${SEP}${subNames}${SEP}${turmaNames}`;
    const note = [
      '# Separador de colunas: ponto-e-vírgula (;)',
      '# Separador de múltiplos valores dentro da célula: pipe (|)',
      '# Colunas obrigatórias: nome, email',
      '# A senha é gerada automaticamente: CódigoPerfil@3primeirosDigitosCPF',
      `# Disciplinas disponíveis: ${(subjects ?? []).map(s => s.name).join('; ')}`,
      `# Turmas disponíveis: ${(turmas ?? []).map(t => t.full_name).join('; ')}`,
    ].join('\n');
    const csv = `${note}\n${header}\n${example}\n`;
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'modelo_importacao_professores.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function parseCsvLine(line: string): string[] {
    const result: string[] = []; let current = ''; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (inQuotes && line[i + 1] === '"') { current += '"'; i++; } else { inQuotes = !inQuotes; } }
      else if ((ch === ',' || ch === ';') && !inQuotes) { result.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    result.push(current.trim());
    return result;
  }

  function handleCsvFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? '';
      const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n')
        .filter(l => l.trim() && !l.trim().startsWith('#'));
      if (lines.length < 2) { alert('Arquivo CSV vazio ou sem dados.'); return; }
      const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim().replace(/^\uFEFF/, ''));
      const rows = lines.slice(1).map(line => {
        const vals = parseCsvLine(line);
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
      const subMap   = new Map((subjects ?? []).map(s => [s.name.toLowerCase().trim(), s.id]));
      const turmaMap = new Map((turmas   ?? []).map(t => [t.full_name.toLowerCase().trim(), t.id]));
      const payload = csvRows.map(r => {
        const discRaw   = r['disciplinas'] || r['disciplina'] || '';
        const turmaRaw  = r['turmas']      || r['turma']      || '';
        const discSep  = discRaw.includes('|')  ? '|' : ';';
        const turmaSep = turmaRaw.includes('|') ? '|' : ';';
        const subjectIds = discRaw.split(discSep).map(d => subMap.get(d.trim().toLowerCase())).filter(Boolean) as string[];
        const classIds   = turmaRaw.split(turmaSep).map(d => turmaMap.get(d.trim().toLowerCase())).filter(Boolean) as string[];
        return {
          name:        r['nome']     || r['name']  || '',
          email:       r['email']    || '',
          cpf:         r['cpf']      || '',
          whatsapp:    r['whatsapp'] || '',
          role:        'professor',
          subject_ids: subjectIds,
          class_ids:   classIds,
        };
      });
      const res = await usuariosApi.importBulk(payload) as { results: typeof csvResults; successCount: number };
      setCsvResults(res.results);
      if (res.successCount > 0) refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro na importação.');
    } finally {
      setCsvImporting(false);
    }
  }

  function closeCsvModal() { setCsvModal(false); setCsvRows([]); setCsvResults(null); }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            Professores
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            {loading ? "Carregando…" : `${(professores ?? []).filter(t => t.active).length} ativos · ${(professores ?? []).filter(t => !t.active).length} inativos`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setCsvModal(true); setCsvRows([]); setCsvResults(null); }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm"
            style={{ background: "rgba(240,192,64,0.1)", color: "#f0c040", border: "1px solid rgba(240,192,64,0.3)", fontFamily: "'Space Grotesk',sans-serif" }}>
            📥 Importar CSV
          </button>
          <button onClick={openCreate}
            className="px-5 py-3 rounded-xl font-bold text-sm"
            style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif", boxShadow: "0 4px 20px rgba(240,192,64,0.3)" }}>
            + Cadastrar Professor
          </button>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>🔍</span>
          <input type="text" placeholder="Buscar professor…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30 outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
          />
        </div>
        {(["all", "active", "inactive"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold"
            style={{
              background: filter === f ? "rgba(240,192,64,0.15)" : "rgba(255,255,255,0.05)",
              color: filter === f ? "#f0c040" : "rgba(255,255,255,0.4)",
              border: `1px solid ${filter === f ? "rgba(240,192,64,0.35)" : "rgba(255,255,255,0.08)"}`,
            }}>
            {f === "all" ? "Todos" : f === "active" ? "Ativos" : "Inativos"}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "#f0c040", borderTopColor: "transparent" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-3xl mb-3">👨‍🏫</div>
          <p className="text-sm text-white font-semibold">Nenhum professor encontrado.</p>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            Clique em &quot;+ Cadastrar Professor&quot; ou use o CSV para importar vários de uma vez.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(t => {
            const isOpen = selected === t.id;
            return (
              <div key={t.id} className="rounded-2xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <button className="w-full flex items-center gap-3 px-4 py-4 text-left"
                  onClick={() => setSelected(isOpen ? null : t.id)}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: "rgba(96,165,250,0.15)", color: "#60a5fa" }}>
                    {getInitials(t.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{t.email}</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold shrink-0"
                    style={{ background: t.active ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)", color: t.active ? "#34d399" : "#f87171" }}>
                    {t.active ? "Ativo" : "Inativo"}
                  </span>
                  <span className="text-xs ml-1" style={{ color: "rgba(255,255,255,0.3)" }}>{isOpen ? "▲" : "▼"}</span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                    <div className="flex flex-wrap gap-4 pt-3">
                      <div>
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Email</p>
                        <p className="text-sm text-white">{t.email}</p>
                      </div>
                      {t.whatsapp && (
                        <div>
                          <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>WhatsApp</p>
                          <p className="text-sm text-white">{t.whatsapp}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {t.whatsapp && (
                        <a href={`https://wa.me/55${t.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                          className="text-xs px-3 py-2 rounded-lg font-semibold"
                          style={{ background: "rgba(52,211,153,0.1)", color: "#34d399" }}>
                          💬 WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE MODAL (3 steps) ── */}
      {modalStep > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)" }}
          onClick={e => { if (e.target === e.currentTarget) closeCreateModal(); }}>
          <div className="w-full max-w-md rounded-3xl p-6 space-y-4 overflow-y-auto"
            style={{ background: "#0d1a3a", border: "1px solid rgba(240,192,64,0.2)", maxHeight: "92vh" }}>

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                  {modalStep === 1 ? "Cadastrar Professor" : modalStep === 2 ? "Disciplinas" : "Turmas"}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Passo {modalStep} de 3 —{" "}
                  {modalStep === 1 ? "Dados do professor" : modalStep === 2 ? "Disciplinas que leciona" : "Turmas que vai atender"}
                </p>
              </div>
              <button onClick={closeCreateModal}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>✕</button>
            </div>

            {/* Step 1: Dados */}
            {modalStep === 1 && (
              <div className="space-y-3">
                {[
                  { key: "name",     label: "Nome *",       placeholder: "Nome completo",           type: "text" },
                  { key: "email",    label: "Email *",      placeholder: "professor@escola.edu.br", type: "email" },
                  { key: "cpf",      label: "CPF",          placeholder: "000.000.000-00",          type: "text" },
                  { key: "whatsapp", label: "WhatsApp",     placeholder: "(41) 99999-0000",         type: "text" },
                ].map(field => (
                  <div key={field.key}>
                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>{field.label}</label>
                    <input type={field.type} value={profForm[field.key as keyof typeof profForm]}
                      onChange={e => setProfForm(p => ({ ...p, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                      style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                  </div>
                ))}
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Senha gerada automaticamente: <span style={{ color: "#f0c040" }}>CódigoPerfil@3primeirosDigitosCPF</span>
                </p>
                <div className="flex gap-3 pt-1">
                  <button onClick={closeCreateModal}
                    className="flex-1 py-3.5 rounded-2xl font-semibold text-sm"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                    Cancelar
                  </button>
                  <button onClick={handleCreateProf}
                    disabled={!profForm.name.trim() || !profForm.email.trim() || saving}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-sm disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif" }}>
                    {saving ? "Criando…" : "Próximo →"}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Disciplinas */}
            {modalStep === 2 && (
              <div className="space-y-4">
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Selecione as disciplinas que este professor leciona.
                </p>
                {(subjects ?? []).length === 0 ? (
                  <div className="text-center py-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Nenhuma disciplina cadastrada.</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(subjects ?? []).map(sub => {
                      const sel = selSubjects.includes(sub.id);
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
                {selSubjects.length > 0 && (
                  <p className="text-xs" style={{ color: "#f0c040" }}>
                    {selSubjects.length} disciplina{selSubjects.length !== 1 ? "s" : ""} selecionada{selSubjects.length !== 1 ? "s" : ""}
                  </p>
                )}
                <div className="flex gap-3 pt-1">
                  <button onClick={() => { setSelSubjects([]); setModalStep(3); }}
                    className="flex-1 py-3.5 rounded-2xl font-semibold text-sm"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                    Pular
                  </button>
                  <button onClick={() => setModalStep(3)} disabled={selSubjects.length === 0}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-sm disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif" }}>
                    Próximo →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Turmas */}
            {modalStep === 3 && (
              <div className="space-y-4">
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Selecione as turmas que este professor vai atender.
                </p>
                {(turmas ?? []).length === 0 ? (
                  <div className="text-center py-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Nenhuma turma cadastrada.</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(turmas ?? []).map(tc => {
                      const sel = selTurmas.includes(tc.id);
                      return (
                        <button key={tc.id} type="button" onClick={() => toggleTurma(tc.id)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                          style={{
                            background: sel ? "rgba(96,165,250,0.18)" : "rgba(255,255,255,0.06)",
                            color: sel ? "#60a5fa" : "rgba(255,255,255,0.5)",
                            border: `1px solid ${sel ? "rgba(96,165,250,0.4)" : "rgba(255,255,255,0.1)"}`,
                          }}>
                          🚀 {tc.full_name}
                          {sel && <span className="ml-1.5">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
                {selTurmas.length > 0 && (
                  <p className="text-xs" style={{ color: "#60a5fa" }}>
                    {selTurmas.length} turma{selTurmas.length !== 1 ? "s" : ""} selecionada{selTurmas.length !== 1 ? "s" : ""}
                  </p>
                )}
                <div className="flex gap-3 pt-1">
                  <button onClick={closeCreateModal} disabled={linking}
                    className="flex-1 py-3.5 rounded-2xl font-semibold text-sm disabled:opacity-50"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                    Pular
                  </button>
                  <button onClick={handleLinkTurmas} disabled={linking || selTurmas.length === 0}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-sm disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif" }}>
                    {linking ? "Salvando…" : "Finalizar →"}
                  </button>
                </div>
              </div>
            )}
          </div>
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
                <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>📥 Importar Professores via CSV</h2>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Cadastre múltiplos professores de uma só vez</p>
              </div>
              <button onClick={closeCsvModal} className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>✕</button>
            </div>

            {/* Modelo */}
            <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(240,192,64,0.05)", border: "1px solid rgba(240,192,64,0.15)" }}>
              <p className="text-sm font-bold" style={{ color: "#f0c040" }}>Modelo de Planilha</p>
              <div className="font-mono text-xs px-3 py-2 rounded-xl overflow-x-auto"
                style={{ background: "rgba(0,0,0,0.3)", color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap" }}>
                nome · email · cpf · whatsapp · disciplinas · turmas
              </div>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                Obrigatórios: <span style={{ color: "#f0c040" }}>nome, email</span>.
                Separe múltiplos valores com <span style={{ color: "#f0c040" }}>ponto-e-vírgula (;)</span>
              </p>
              <button onClick={downloadTemplate}
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
                <p className="text-sm font-semibold text-white">{csvRows.length} professor{csvRows.length !== 1 ? "es" : ""} encontrado{csvRows.length !== 1 ? "s" : ""}</p>
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                  <table className="w-full text-xs">
                    <thead><tr style={{ background: "rgba(255,255,255,0.05)" }}>
                      {["#", "Nome", "Email", "Disciplinas", "Turmas"].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {csvRows.slice(0, 10).map((r, i) => (
                        <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                          <td className="px-3 py-2" style={{ color: "rgba(255,255,255,0.3)" }}>{i + 1}</td>
                          <td className="px-3 py-2 font-semibold text-white max-w-[100px] truncate">{r['nome'] || r['name'] || '—'}</td>
                          <td className="px-3 py-2 max-w-[120px] truncate" style={{ color: "rgba(255,255,255,0.5)" }}>{r['email'] || '—'}</td>
                          <td className="px-3 py-2 max-w-[100px] truncate" style={{ color: "rgba(255,255,255,0.4)" }} title={r['disciplinas'] || ''}>{r['disciplinas'] || '—'}</td>
                          <td className="px-3 py-2 max-w-[100px] truncate" style={{ color: "rgba(255,255,255,0.4)" }} title={r['turmas'] || ''}>{r['turmas'] || '—'}</td>
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
                    {csvImporting ? "Importando…" : `Importar ${csvRows.length} Professor${csvRows.length !== 1 ? "es" : ""} →`}
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
                      <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Importados com sucesso</p>
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
    </div>
  );
}
