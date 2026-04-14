"use client";

import { useMemo, useState } from "react";
import { useQuery } from "../../../_lib/useQuery";
import { alunosApi, turmasApi } from "../../../_lib/api";
import React from "react";

// ── tipos ──────────────────────────────────────────────────────
interface Aluno {
  id: string; name: string; email: string; whatsapp: string | null;
  active: boolean; internal_enrollment: string | null;
  birth_date: string | null; mother_name: string | null;
  mother_whatsapp: string | null; classes: string | null;
}
interface Turma { id: string; full_name: string; shift: string; }

const BRA_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC",
  "SP","SE","TO",
];

const EMPTY_FORM = {
  // acesso
  name: "", email: "", cpf: "", whatsapp: "",
  // pessoal
  rg: "", birth_date: "",
  // endereço
  address: "", address_number: "", address_complement: "",
  neighborhood: "", city: "", state: "", zip_code: "",
  // matrícula
  internal_enrollment: "", sere_enrollment: "", class_id: "",
  // mãe
  mother_name: "", mother_email: "", mother_whatsapp: "",
  // pai
  father_name: "", father_email: "", father_whatsapp: "",
  // contato do aluno
  student_email: "", student_whatsapp: "",
};

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}
function formatPhone(v: string | null) {
  return v ? v.replace(/\D/g, "").replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3") : "";
}

// ── página ─────────────────────────────────────────────────────
export default function AlunosAdminPage() {
  const [search,    setSearch]    = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form,      setForm]      = useState({ ...EMPTY_FORM });
  const [saving,    setSaving]    = useState(false);
  const [credentials, setCredentials] = useState<{ profileCode: string; password: string; name: string } | null>(null);
  const [activeSection, setActiveSection] = useState(0);
  // passo pós-matrícula: vincular à turma
  const [newAlunoId,   setNewAlunoId]   = useState("");
  const [newAlunoName, setNewAlunoName] = useState("");
  const [linkingClass, setLinkingClass] = useState(false);
  // filtro de ano/série no modal (seção 3 e passo 6)
  const [gradeFilter,  setGradeFilter]  = useState("");

  // CSV import state
  const [csvModal,     setCsvModal]     = useState(false);
  const [csvRows,      setCsvRows]      = useState<Record<string, string>[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResults,   setCsvResults]   = useState<{ row: number; name: string; success: boolean; error?: string }[] | null>(null);

  const { data: alunos, loading, refetch } = useQuery<Aluno[]>(
    () => alunosApi.list() as Promise<Aluno[]>, []
  );
  const { data: turmas } = useQuery<Turma[]>(
    () => turmasApi.list() as Promise<Turma[]>, []
  );

  const filtered = useMemo(() => (alunos ?? []).filter(a =>
    (!classFilter || (a.classes ?? "").includes(
      (turmas ?? []).find(t => t.id === classFilter)?.full_name ?? ""
    )) &&
    (!search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.internal_enrollment ?? "").includes(search) ||
      (a.email ?? "").toLowerCase().includes(search.toLowerCase()))
  ), [alunos, classFilter, turmas, search]);

  const f = (field: keyof typeof EMPTY_FORM, value: string) =>
    setForm(p => ({ ...p, [field]: value }));

  // Extrai anos únicos e turmas filtradas por ano
  const gradeNames = useMemo(() => {
    const seen = new Set<string>();
    return (turmas ?? []).reduce<string[]>((acc, t) => {
      const grade = t.full_name.split(" | ")[0]?.trim() ?? t.full_name;
      if (!seen.has(grade)) { seen.add(grade); acc.push(grade); }
      return acc;
    }, []);
  }, [turmas]);

  const turmasByGrade = useMemo(() =>
    (turmas ?? []).filter(t => {
      if (!gradeFilter) return false;
      return (t.full_name.split(" | ")[0]?.trim() ?? t.full_name) === gradeFilter;
    }), [turmas, gradeFilter]);

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim() || !form.cpf.trim()) {
      setActiveSection(0); return;
    }
    setSaving(true);
    try {
      const res = await alunosApi.matricular(form) as { id: string; profileCode: string; password: string };
      setNewAlunoId(res.id);
      setNewAlunoName(form.name);
      setCredentials({ profileCode: res.profileCode, password: res.password, name: form.name });
      setForm({ ...EMPTY_FORM });
      // Avança para o passo de vínculo de turma (seção 6)
      setActiveSection(6);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao matricular aluno.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLinkClass(classId: string) {
    if (!classId || !newAlunoId) { setShowModal(false); return; }
    setLinkingClass(true);
    try {
      await turmasApi.addAluno(classId, newAlunoId);
    } catch { /* silencioso */ } finally {
      setLinkingClass(false);
    }
    setShowModal(false);
  }

  function skipLinkClass() {
    setShowModal(false);
    setNewAlunoId("");
  }

  // ── CSV handlers ─────────────────────────────────────────────

  function downloadAlunosTemplate() {
    const header = 'nome,email,cpf,whatsapp,rg,data_nascimento,matricula_interna,matricula_sere,turma,nome_mae,email_mae,whatsapp_mae,nome_pai,email_pai,whatsapp_pai';
    const example = '"Alice Fernandes","alice@email.com","000.000.000-00","(41)99999-0000","00.000.000-0","2010-05-15","2025001","","","Maria Fernandes","mae@email.com","(41)99999-0001","João Fernandes","pai@email.com","(41)99999-0002"';
    const note = `# Obrigatórios: nome, email, cpf | turma = nome completo da turma (ex: 6º Ano | Cativante)\n# Turnos disponíveis: ${(turmas ?? []).map(t => t.full_name).join(' | ')}`;
    const csv = `${note}\n${header}\n${example}\n`;
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'modelo_importacao_alunos.csv'; a.click();
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
    result.push(current.trim()); return result;
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
      const turmaMap = new Map((turmas ?? []).map(t => [t.full_name.toLowerCase().trim(), t.id]));
      const payload = csvRows.map(r => {
        const turmaName = (r['turma'] || '').toLowerCase().trim();
        return {
          name:                r['nome']           || r['name'] || '',
          email:               r['email']          || '',
          cpf:                 r['cpf']            || '',
          whatsapp:            r['whatsapp']        || '',
          rg:                  r['rg']             || '',
          birth_date:          r['data_nascimento'] || r['nascimento'] || '',
          internal_enrollment: r['matricula_interna'] || '',
          sere_enrollment:     r['matricula_sere']    || '',
          class_id:            turmaMap.get(turmaName) ?? '',
          mother_name:         r['nome_mae']    || '',
          mother_email:        r['email_mae']   || '',
          mother_whatsapp:     r['whatsapp_mae'] || '',
          father_name:         r['nome_pai']    || '',
          father_email:        r['email_pai']   || '',
          father_whatsapp:     r['whatsapp_pai'] || '',
        };
      });
      const res = await alunosApi.importBulk(payload) as { results: typeof csvResults; successCount: number };
      setCsvResults(res.results);
      if (res.successCount > 0) refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro na importação.');
    } finally {
      setCsvImporting(false);
    }
  }

  function closeCsvModal() { setCsvModal(false); setCsvRows([]); setCsvResults(null); }

  const SECTIONS = [
    "👤 Acesso", "📋 Pessoal", "🏠 Endereço", "🏫 Matrícula", "👩 Mãe", "👨 Pai", "🚀 Turma",
  ];

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            Cosmonautas
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            {loading ? "Carregando…" : `${(alunos ?? []).length} alunos matriculados`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setCsvModal(true); setCsvRows([]); setCsvResults(null); }}
            className="px-4 py-3 rounded-xl font-bold text-sm"
            style={{ background: "rgba(240,192,64,0.1)", color: "#f0c040", border: "1px solid rgba(240,192,64,0.3)", fontFamily: "'Space Grotesk',sans-serif" }}>
            📥 Importar CSV
          </button>
          <button onClick={() => { setForm({ ...EMPTY_FORM }); setActiveSection(0); setShowModal(true); }}
            className="px-5 py-3 rounded-xl font-bold text-sm"
            style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif", boxShadow: "0 4px 20px rgba(240,192,64,0.3)" }}>
            + Matricular Aluno
          </button>
        </div>
      </div>

      {/* Credentials banner pós-matrícula */}
      {credentials && (
        <div className="rounded-2xl px-5 py-4"
          style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)" }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white">✅ {credentials.name} matriculado(a) com sucesso!</p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                Guarde as credenciais de acesso:
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                <div className="px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Código de Perfil</p>
                  <p className="text-sm font-bold" style={{ color: "#f0c040" }}>{credentials.profileCode}</p>
                </div>
                <div className="px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Senha Gerada</p>
                  <p className="text-sm font-bold font-mono" style={{ color: "#34d399" }}>{credentials.password}</p>
                </div>
                <button onClick={() => navigator.clipboard.writeText(`Código: ${credentials.profileCode}\nSenha: ${credentials.password}`)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold"
                  style={{ background: "rgba(240,192,64,0.12)", color: "#f0c040", border: "1px solid rgba(240,192,64,0.25)" }}>
                  📋 Copiar
                </button>
              </div>
            </div>
            <button onClick={() => setCredentials(null)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0"
              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>✕</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>🔍</span>
          <input type="text" placeholder="Nome, e-mail ou matrícula…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30 outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
          />
        </div>
        <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm text-white outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <option value="" style={{ background: "#0a1638" }}>Todas as turmas</option>
          {(turmas ?? []).map(t => (
            <option key={t.id} value={t.id} style={{ background: "#0a1638" }}>{t.full_name}</option>
          ))}
        </select>
      </div>

      <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
        {filtered.length} aluno{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "#f0c040", borderTopColor: "transparent" }} />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-12 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="text-3xl mb-3">👨‍🚀</div>
              <p className="text-sm text-white font-semibold">Nenhum aluno encontrado.</p>
            </div>
          )}
          {filtered.map(a => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${a.active ? "rgba(255,255,255,0.06)" : "rgba(248,113,113,0.15)"}` }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: "rgba(52,211,153,0.12)", color: "#34d399" }}>
                {getInitials(a.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{a.name}</p>
                <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {a.email}
                  {a.internal_enrollment ? ` · Mat. ${a.internal_enrollment}` : ""}
                  {a.classes ? ` · ${a.classes}` : ""}
                </p>
              </div>
              {a.birth_date && (
                <span className="text-xs hidden sm:block shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {new Date(a.birth_date + "T12:00:00").toLocaleDateString("pt-BR")}
                </span>
              )}
              <span className="w-2 h-2 rounded-full shrink-0"
                style={{ background: a.active ? "#34d399" : "#f87171" }} />
              {a.mother_whatsapp && (
                <a href={`https://wa.me/55${a.mother_whatsapp.replace(/\D/g, "")}`}
                  target="_blank" rel="noreferrer"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                  style={{ background: "rgba(52,211,153,0.1)", color: "#34d399" }}
                  title="WhatsApp responsável">
                  💬
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── CSV IMPORT MODAL ── */}
      {csvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)" }}
          onClick={e => { if (e.target === e.currentTarget) closeCsvModal(); }}>
          <div className="w-full max-w-2xl rounded-3xl p-6 space-y-5 overflow-y-auto"
            style={{ background: "#0d1a3a", border: "1px solid rgba(240,192,64,0.2)", maxHeight: "92vh" }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>📥 Importar Alunos via CSV</h2>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Matricule múltiplos alunos de uma só vez</p>
              </div>
              <button onClick={closeCsvModal} className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>✕</button>
            </div>

            {/* Modelo */}
            <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(240,192,64,0.05)", border: "1px solid rgba(240,192,64,0.15)" }}>
              <p className="text-sm font-bold" style={{ color: "#f0c040" }}>Modelo de Planilha</p>
              <div className="font-mono text-xs px-3 py-2 rounded-xl overflow-x-auto"
                style={{ background: "rgba(0,0,0,0.3)", color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap" }}>
                nome · email · cpf · whatsapp · rg · data_nascimento · matricula_interna · matricula_sere · turma · nome_mae · email_mae · whatsapp_mae · nome_pai · email_pai · whatsapp_pai
              </div>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                Obrigatórios: <span style={{ color: "#f0c040" }}>nome, email, cpf</span>.
                A coluna <span style={{ color: "#f0c040" }}>turma</span> deve conter o nome completo da turma (ex: <em>6º Ano | Cativante</em>).
              </p>
              <button onClick={downloadAlunosTemplate}
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
                <p className="text-sm font-semibold text-white">{csvRows.length} aluno{csvRows.length !== 1 ? "s" : ""} encontrado{csvRows.length !== 1 ? "s" : ""}</p>
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                  <table className="w-full text-xs">
                    <thead><tr style={{ background: "rgba(255,255,255,0.05)" }}>
                      {["#", "Nome", "Email", "CPF", "Turma"].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {csvRows.slice(0, 10).map((r, i) => (
                        <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                          <td className="px-3 py-2" style={{ color: "rgba(255,255,255,0.3)" }}>{i + 1}</td>
                          <td className="px-3 py-2 font-semibold text-white max-w-[120px] truncate">{r['nome'] || r['name'] || '—'}</td>
                          <td className="px-3 py-2 max-w-[140px] truncate" style={{ color: "rgba(255,255,255,0.5)" }}>{r['email'] || '—'}</td>
                          <td className="px-3 py-2" style={{ color: "rgba(255,255,255,0.5)" }}>{r['cpf'] || '—'}</td>
                          <td className="px-3 py-2 max-w-[120px] truncate" style={{ color: "rgba(255,255,255,0.5)" }}>{r['turma'] || '—'}</td>
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
                    {csvImporting ? "Importando…" : `Importar ${csvRows.length} Aluno${csvRows.length !== 1 ? "s" : ""} →`}
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
                      <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Matriculados com sucesso</p>
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

      {/* ── MODAL MATRÍCULA ─────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="w-full max-w-2xl rounded-3xl flex flex-col"
            style={{ background: "#0d1a3a", border: "1px solid rgba(240,192,64,0.2)", maxHeight: "90vh" }}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                  Matrícula de Aluno
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                  A senha será gerada automaticamente pelo CPF
                </p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>✕</button>
            </div>

            {/* Tabs de seção */}
            <div className="flex gap-1 px-6 pb-4 overflow-x-auto shrink-0">
              {SECTIONS.slice(0, 6).map((s, i) => (
                <button key={i} onClick={() => activeSection < 6 && setActiveSection(i)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0"
                  style={{
                    background: activeSection === i ? "rgba(240,192,64,0.15)" : "rgba(255,255,255,0.05)",
                    color: activeSection === i ? "#f0c040" : "rgba(255,255,255,0.4)",
                    border: `1px solid ${activeSection === i ? "rgba(240,192,64,0.35)" : "rgba(255,255,255,0.07)"}`,
                  }}>
                  {s}
                </button>
              ))}
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 pb-2">

              {/* SEÇÃO 0: Dados de Acesso */}
              {activeSection === 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>DADOS DE ACESSO *obrigatórios</p>
                  <Field label="Nome completo *" placeholder="Ex: Alice Fernandes"
                    value={form.name} onChange={v => f("name", v)} />
                  <Field label="E-mail *" placeholder="aluno@escola.edu.br" type="email"
                    value={form.email} onChange={v => f("email", v)} />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="CPF *" placeholder="000.000.000-00"
                      value={form.cpf} onChange={v => f("cpf", v)} />
                    <Field label="WhatsApp" placeholder="(41) 99999-0000"
                      value={form.whatsapp} onChange={v => f("whatsapp", v)} />
                  </div>
                  <div className="rounded-xl px-4 py-3 text-xs"
                    style={{ background: "rgba(240,192,64,0.08)", border: "1px solid rgba(240,192,64,0.2)", color: "#f0c040" }}>
                    🔑 Senha gerada: <strong>ALU25XXX@{form.cpf.replace(/\D/g,"").substring(0,3) || "???"}</strong>
                    <br /><span style={{ color: "rgba(255,255,255,0.35)" }}>Formato: Código@3primeirosDigitosCPF</span>
                  </div>
                </div>
              )}

              {/* SEÇÃO 1: Dados Pessoais */}
              {activeSection === 1 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>DADOS PESSOAIS</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="RG" placeholder="00.000.000-0"
                      value={form.rg} onChange={v => f("rg", v)} />
                    <Field label="Data de Nascimento" type="date"
                      value={form.birth_date} onChange={v => f("birth_date", v)} />
                  </div>
                  <Field label="E-mail pessoal do aluno" placeholder="alice@gmail.com" type="email"
                    value={form.student_email} onChange={v => f("student_email", v)} />
                  <Field label="WhatsApp do aluno" placeholder="(41) 99999-0000"
                    value={form.student_whatsapp} onChange={v => f("student_whatsapp", v)} />
                </div>
              )}

              {/* SEÇÃO 2: Endereço */}
              {activeSection === 2 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>ENDEREÇO</p>
                  <Field label="Logradouro" placeholder="Rua, Av., Alameda…"
                    value={form.address} onChange={v => f("address", v)} />
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Número"
                      value={form.address_number} onChange={v => f("address_number", v)} />
                    <div className="col-span-2">
                      <Field label="Complemento" placeholder="Apto, Bloco…"
                        value={form.address_complement} onChange={v => f("address_complement", v)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Bairro"
                      value={form.neighborhood} onChange={v => f("neighborhood", v)} />
                    <Field label="CEP" placeholder="00000-000"
                      value={form.zip_code} onChange={v => f("zip_code", v)} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <Field label="Cidade"
                        value={form.city} onChange={v => f("city", v)} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>UF</label>
                      <select value={form.state} onChange={e => f("state", e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <option value="" style={{ background: "#0a1638" }}>—</option>
                        {BRA_STATES.map(s => <option key={s} value={s} style={{ background: "#0a1638" }}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* SEÇÃO 3: Matrícula Escolar */}
              {activeSection === 3 && (
                <div className="space-y-4">
                  <p className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>MATRÍCULA ESCOLAR</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Matrícula Interna" placeholder="2025001"
                      value={form.internal_enrollment} onChange={v => f("internal_enrollment", v)} />
                    <Field label="Matrícula SERE" placeholder="SERE00001"
                      value={form.sere_enrollment} onChange={v => f("sere_enrollment", v)} />
                  </div>

                  {/* Seleção de Ano/Série */}
                  <div>
                    <label className="text-xs font-semibold mb-2 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                      Ano / Série <span style={{ color: "rgba(255,255,255,0.3)" }}>(opcional)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {gradeNames.map(g => (
                        <button key={g} type="button"
                          onClick={() => { setGradeFilter(g); f("class_id", ""); }}
                          className="px-3 py-2 rounded-xl text-xs font-semibold"
                          style={{
                            background: gradeFilter === g ? "rgba(240,192,64,0.15)" : "rgba(255,255,255,0.06)",
                            color: gradeFilter === g ? "#f0c040" : "rgba(255,255,255,0.5)",
                            border: `1px solid ${gradeFilter === g ? "rgba(240,192,64,0.4)" : "rgba(255,255,255,0.1)"}`,
                          }}>
                          {g}
                        </button>
                      ))}
                      {gradeFilter && (
                        <button type="button" onClick={() => { setGradeFilter(""); f("class_id", ""); }}
                          className="px-3 py-2 rounded-xl text-xs font-semibold"
                          style={{ background: "rgba(248,113,113,0.08)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
                          ✕ Limpar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Seleção de Turma (aparece após escolher o ano) */}
                  {gradeFilter && (
                    <div>
                      <label className="text-xs font-semibold mb-2 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                        Turma em <span style={{ color: "#f0c040" }}>{gradeFilter}</span>
                      </label>
                      {turmasByGrade.length === 0 ? (
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Nenhuma turma cadastrada para este ano.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {turmasByGrade.map(t => {
                            const turmaName = t.full_name.split(" | ")[1]?.trim() ?? t.full_name;
                            const sel = form.class_id === t.id;
                            return (
                              <button key={t.id} type="button" onClick={() => f("class_id", t.id)}
                                className="px-4 py-2.5 rounded-xl text-sm font-semibold"
                                style={{
                                  background: sel ? "rgba(96,165,250,0.18)" : "rgba(255,255,255,0.06)",
                                  color: sel ? "#60a5fa" : "rgba(255,255,255,0.55)",
                                  border: `1px solid ${sel ? "rgba(96,165,250,0.4)" : "rgba(255,255,255,0.1)"}`,
                                }}>
                                🚀 {turmaName}
                                {sel && <span className="ml-1.5">✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {form.class_id && (
                        <p className="text-xs mt-2" style={{ color: "#60a5fa" }}>
                          ✓ {(turmas ?? []).find(t => t.id === form.class_id)?.full_name}
                        </p>
                      )}
                    </div>
                  )}

                  {!gradeFilter && form.class_id && (
                    <p className="text-xs" style={{ color: "#60a5fa" }}>
                      ✓ Turma selecionada: {(turmas ?? []).find(t => t.id === form.class_id)?.full_name}
                    </p>
                  )}
                </div>
              )}

              {/* SEÇÃO 4: Mãe */}
              {activeSection === 4 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>RESPONSÁVEL — MÃE / GUARDIÃ</p>
                  <Field label="Nome completo da mãe" placeholder="Maria da Silva"
                    value={form.mother_name} onChange={v => f("mother_name", v)} />
                  <Field label="E-mail da mãe" placeholder="mae@gmail.com" type="email"
                    value={form.mother_email} onChange={v => f("mother_email", v)} />
                  <Field label="WhatsApp da mãe" placeholder="(41) 99999-0000"
                    value={form.mother_whatsapp} onChange={v => f("mother_whatsapp", v)} />
                  <div className="rounded-xl px-4 py-3 text-xs"
                    style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)", color: "#60a5fa" }}>
                    💡 O e-mail da mãe será vinculado ao perfil de pais no sistema para acesso ao aplicativo.
                  </div>
                </div>
              )}

              {/* SEÇÃO 5: Pai */}
              {activeSection === 5 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>RESPONSÁVEL — PAI / GUARDIÃO</p>
                  <Field label="Nome completo do pai" placeholder="João da Silva"
                    value={form.father_name} onChange={v => f("father_name", v)} />
                  <Field label="E-mail do pai" placeholder="pai@gmail.com" type="email"
                    value={form.father_email} onChange={v => f("father_email", v)} />
                  <Field label="WhatsApp do pai" placeholder="(41) 99999-0000"
                    value={form.father_whatsapp} onChange={v => f("father_whatsapp", v)} />
                </div>
              )}

              {/* SEÇÃO 6: Vincular à Turma (opcional, pós-matrícula) */}
              {activeSection === 6 && (
                <div className="space-y-4">
                  <div className="rounded-2xl px-4 py-3"
                    style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)" }}>
                    <p className="text-sm font-bold text-white">✅ {newAlunoName} matriculado(a) com sucesso!</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                      Deseja vincular agora a uma turma? (opcional)
                    </p>
                  </div>

                  {/* Selecionar Ano/Série */}
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>1. Selecione o Ano / Série:</p>
                    <div className="flex flex-wrap gap-2">
                      {gradeNames.map(g => (
                        <button key={g} type="button" onClick={() => setGradeFilter(g)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold"
                          style={{
                            background: gradeFilter === g ? "rgba(240,192,64,0.15)" : "rgba(255,255,255,0.06)",
                            color: gradeFilter === g ? "#f0c040" : "rgba(255,255,255,0.5)",
                            border: `1px solid ${gradeFilter === g ? "rgba(240,192,64,0.4)" : "rgba(255,255,255,0.1)"}`,
                          }}>
                          {g}
                        </button>
                      ))}
                      {gradeNames.length === 0 && (
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Nenhuma turma cadastrada ainda.</p>
                      )}
                    </div>
                  </div>

                  {/* Selecionar Turma */}
                  {gradeFilter && (
                    <div>
                      <p className="text-xs font-semibold mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                        2. Selecione a turma em <span style={{ color: "#f0c040" }}>{gradeFilter}</span>:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {turmasByGrade.map(t => {
                          const turmaName = t.full_name.split(" | ")[1]?.trim() ?? t.full_name;
                          return (
                            <button key={t.id} type="button"
                              onClick={() => handleLinkClass(t.id)}
                              disabled={linkingClass}
                              className="px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                              style={{ background: "rgba(96,165,250,0.12)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.3)" }}>
                              {linkingClass ? "…" : `🚀 ${turmaName}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 flex items-center justify-between gap-3 shrink-0"
              style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex gap-1.5">
                {SECTIONS.slice(0, 6).map((_, i) => (
                  <button key={i} onClick={() => activeSection < 6 && setActiveSection(i)}
                    className="w-2 h-2 rounded-full transition-all"
                    style={{ background: activeSection === i ? "#f0c040" : "rgba(255,255,255,0.2)" }} />
                ))}
              </div>
              <div className="flex gap-3">
                {activeSection > 0 && activeSection < 6 && (
                  <button onClick={() => setActiveSection(s => s - 1)}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}>
                    ← Anterior
                  </button>
                )}
                {activeSection === 6 ? (
                  <button onClick={skipLinkClass} disabled={linkingClass}
                    className="px-6 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50"
                    style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}>
                    Pular — vincular depois
                  </button>
                ) : activeSection < 5 ? (
                  <button onClick={() => setActiveSection(s => s + 1)}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold"
                    style={{ background: "rgba(240,192,64,0.15)", color: "#f0c040", border: "1px solid rgba(240,192,64,0.3)" }}>
                    Próximo →
                  </button>
                ) : (
                  <button onClick={handleSave}
                    disabled={!form.name.trim() || !form.email.trim() || !form.cpf.trim() || saving}
                    className="px-6 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638" }}>
                    {saving ? "Matriculando…" : "✅ Concluir Matrícula"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente de campo reutilizável ───────────────────────────
function Field({
  label, placeholder = "", value, onChange, type = "text",
}: {
  label: string; placeholder?: string; value: string;
  onChange: (v: string) => void; type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
        {label}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30 outline-none"
        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
      />
    </div>
  );
}
