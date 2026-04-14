"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { schoolsApi, turmasApi, usuariosApi, impersonateApi } from "../../../_lib/api";
import { useQuery } from "../../../_lib/useQuery";
import { startImpersonation, ROLE_DASHBOARD, type AuthUser, type UserRole } from "../../../_lib/auth";

interface School {
  id: string; name: string; city: string; state: string;
  address: string; zip_code: string;
  manager_name: string; manager_email: string; manager_whatsapp: string;
  active: boolean; created_at: string;
  student_count: number; teacher_count: number; admin_count: number;
  // Admin user
  admin_id: string | null; admin_name: string | null; admin_email: string | null;
  admin_profile_code: string | null; admin_cpf: string | null;
}
interface GradeLevel { id: string; name: string; order_index: number; segment: string; }

// ── Sub-components defined OUTSIDE to avoid remount on each render ──

function FormField({
  label, value, onChange, type = "text", placeholder = "",
}: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</label>
      <input type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30 outline-none"
        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }} />
    </div>
  );
}

function SelectField({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none"
        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <option value="" style={{ background: "#0d1a3a" }}>Selecionar…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: "#0d1a3a" }}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ── Wizard types ───────────────────────────────────────────────
type TurmaForm    = { grade_level_id: string; name: string; shift: string };
type UserForm     = { name: string; email: string; cpf: string; class_ids: string[] };
type AlunoForm    = { name: string; email: string; cpf: string; class_id: string };
type CreatedTurma = { id: string; name: string };

const EMPTY_SCHOOL = {
  name: "", address: "", city: "", state: "", zip_code: "",
  manager_name: "", manager_email: "", manager_whatsapp: "", manager_cpf: "",
};
const EMPTY_TURMA: TurmaForm  = { grade_level_id: "", name: "", shift: "manha" };
const EMPTY_USER: UserForm    = { name: "", email: "", cpf: "", class_ids: [] };
const EMPTY_ALUNO: AlunoForm  = { name: "", email: "", cpf: "", class_id: "" };

const SHIFTS = [
  { value: "manha",    label: "Manhã" },
  { value: "tarde",    label: "Tarde" },
  { value: "noturno",  label: "Noturno" },
  { value: "integral", label: "Integral" },
];

const WIZARD_STEPS = [
  { label: "Unidade",        icon: "🏛"  },
  { label: "Administrador",  icon: "👑"  },
  { label: "Turmas",         icon: "📚" },
  { label: "Pedagógico",     icon: "🧑‍💼" },
  { label: "Professores",    icon: "👨‍🏫" },
  { label: "Alunos",         icon: "👨‍🚀" },
];

// ── Main page ──────────────────────────────────────────────────
export default function UnidadesPage() {
  const router = useRouter();
  const [selected,  setSelected]  = useState<string | null>(null);
  const [editModal, setEditModal] = useState<School | null>(null);
  const [editForm,  setEditForm]  = useState({ ...EMPTY_SCHOOL });
  const [saving,    setSaving]    = useState(false);

  // CSV Import state
  const [csvModal,      setCsvModal]      = useState(false);
  const [csvRows,       setCsvRows]       = useState<Record<string, string>[]>([]);
  const [csvImporting,  setCsvImporting]  = useState(false);
  const [csvResults,    setCsvResults]    = useState<{ row: number; name: string; success: boolean; error?: string }[] | null>(null);

  // Wizard state
  const [step,          setStep]          = useState(0); // 0 = closed, 1-5 = steps, 6 = done
  const [schoolId,      setSchoolId]      = useState("");
  const [schoolForm,    setSchoolForm]    = useState({ ...EMPTY_SCHOOL });
  const [adminForm,     setAdminForm]     = useState<UserForm>({ ...EMPTY_USER });
  const [turmas,        setTurmas]        = useState<TurmaForm[]>([{ ...EMPTY_TURMA }]);
  const [createdTurmas, setCreatedTurmas] = useState<CreatedTurma[]>([]);
  const [pedagogicos,   setPedagogicos]   = useState<UserForm[]>([{ ...EMPTY_USER }]);
  const [professores,   setProfessores]   = useState<UserForm[]>([{ ...EMPTY_USER }]);
  const [alunos,        setAlunos]        = useState<AlunoForm[]>([{ ...EMPTY_ALUNO }]);
  const [gradeLevels,   setGradeLevels]   = useState<GradeLevel[]>([]);
  const [summary,       setSummary]       = useState({ admin: 0, turmas: 0, pedagogicos: 0, professores: 0, alunos: 0 });

  const { data: schools, loading, refetch } = useQuery<School[]>(
    () => schoolsApi.list() as Promise<School[]>, []
  );

  useEffect(() => {
    schoolsApi.gradeLevels().then((d) => setGradeLevels(d as GradeLevel[])).catch(() => {});
  }, []);

  const totals = {
    students: (schools ?? []).reduce((s, u) => s + Number(u.student_count), 0),
    teachers: (schools ?? []).reduce((s, u) => s + Number(u.teacher_count), 0),
    active:   (schools ?? []).filter((u) => u.active).length,
  };

  const gradeLevelOptions = gradeLevels.map((g) => ({ value: g.id, label: g.name }));

  // ── CSV Import handlers ──────────────────────────────────────

  function downloadCsvTemplate() {
    const header = 'nome_unidade,cidade,estado,endereco,cep,nome_diretor,email_diretor,whatsapp_diretor,cpf_diretor,nome_admin,email_admin,cpf_admin';
    const example = '"Colégio Cristão Central","Curitiba","PR","Rua das Missões, 100","80000-000","Roberto Alves","diretor@escola.edu.br","41999990000","000.000.000-00","Maria Silva","admin@escola.edu.br","111.111.111-11"';
    const csv = `${header}\n${example}\n`;
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_importacao_unidades.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if ((ch === ',' || ch === ';') && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  function handleCsvFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? '';
      const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n').filter((l) => l.trim());
      if (lines.length < 2) { alert('O arquivo CSV está vazio ou sem dados.'); return; }
      const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_').replace(/^\uFEFF/, ''));
      const rows = lines.slice(1).map((line) => {
        const vals = parseCsvLine(line);
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
        return obj;
      }).filter((r) => Object.values(r).some((v) => v.trim()));
      setCsvRows(rows);
      setCsvResults(null);
    };
    reader.readAsText(file, 'utf-8');
  }

  async function handleCsvImport() {
    if (csvRows.length === 0) return;
    setCsvImporting(true);
    try {
      const payload = csvRows.map((r) => ({
        name:              r['nome_unidade']      || r['nome'],
        city:              r['cidade'],
        state:             r['estado']            || '',
        address:           r['endereco']          || r['endereço'] || '',
        zip_code:          r['cep']               || '',
        manager_name:      r['nome_diretor']      || '',
        manager_email:     r['email_diretor']     || '',
        manager_whatsapp:  r['whatsapp_diretor']  || '',
        manager_cpf:       r['cpf_diretor']       || '',
        admin_name:        r['nome_admin']        || '',
        admin_email:       r['email_admin']       || '',
        admin_cpf:         r['cpf_admin']         || '',
      }));
      const res = await schoolsApi.importBulk(payload) as { results: typeof csvResults; successCount: number; totalCount: number };
      setCsvResults(res.results);
      if (res.successCount > 0) refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro na importação.');
    } finally {
      setCsvImporting(false);
    }
  }

  function closeCsvModal() {
    setCsvModal(false);
    setCsvRows([]);
    setCsvResults(null);
  }

  // ── Wizard handlers ──────────────────────────────────────────

  function openWizard() {
    setSchoolForm({ ...EMPTY_SCHOOL });
    setAdminForm({ ...EMPTY_USER });
    setTurmas([{ ...EMPTY_TURMA }]);
    setCreatedTurmas([]);
    setPedagogicos([{ ...EMPTY_USER }]);
    setProfessores([{ ...EMPTY_USER }]);
    setAlunos([{ ...EMPTY_ALUNO }]);
    setSummary({ admin: 0, turmas: 0, pedagogicos: 0, professores: 0, alunos: 0 });
    setSchoolId("");
    setStep(1);
  }

  async function handleSaveSchool() {
    if (!schoolForm.name.trim() || !schoolForm.city.trim()) return;
    setSaving(true);
    try {
      const res = await schoolsApi.create(schoolForm) as { id: string };
      setSchoolId(res.id);
      setStep(2);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao criar unidade.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAdmin() {
    setSaving(true);
    let count = 0;
    if (adminForm.name.trim() && adminForm.email.trim()) {
      try {
        await usuariosApi.create({ name: adminForm.name, email: adminForm.email, cpf: adminForm.cpf, role: "admin", school_id: schoolId });
        count = 1;
      } catch { /* ignore */ }
    }
    setSummary((s) => ({ ...s, admin: count }));
    setSaving(false);
    setStep(3);
  }

  async function handleSaveTurmas() {
    const valid = turmas.filter((t) => t.grade_level_id && t.name.trim());
    setSaving(true);
    const created: CreatedTurma[] = [];
    for (const t of valid) {
      try {
        const res = await turmasApi.create({ school_id: schoolId, ...t }) as { id: string };
        const glName = gradeLevels.find((g) => g.id === t.grade_level_id)?.name ?? "";
        created.push({ id: res.id, name: `${glName} | ${t.name}` });
      } catch { /* ignore individual failures */ }
    }
    setCreatedTurmas(created);
    setSummary((s) => ({ ...s, turmas: created.length }));
    setSaving(false);
    setStep(4);
  }

  async function handleSaveUsers(
    users: UserForm[],
    role: string,
    next: number,
    key: keyof typeof summary,
    linkFn: (classId: string, userId: string) => Promise<unknown>
  ) {
    const valid = users.filter((u) => u.name.trim() && u.email.trim());
    setSaving(true);
    let count = 0;
    for (const u of valid) {
      try {
        const res = await usuariosApi.create({ name: u.name, email: u.email, cpf: u.cpf, role, school_id: schoolId }) as { id: string };
        for (const cid of u.class_ids) {
          await linkFn(cid, res.id).catch(() => {});
        }
        count++;
      } catch { /* ignore individual failures */ }
    }
    setSummary((s) => ({ ...s, [key]: count }));
    setSaving(false);
    setStep(next);
  }

  async function handleSaveAlunos() {
    const valid = alunos.filter((u) => u.name.trim() && u.email.trim());
    setSaving(true);
    let count = 0;
    for (const u of valid) {
      try {
        const res = await usuariosApi.create({ name: u.name, email: u.email, cpf: u.cpf, role: "aluno", school_id: schoolId }) as { id: string };
        if (u.class_id) await turmasApi.addAluno(u.class_id, res.id).catch(() => {});
        count++;
      } catch { /* ignore individual failures */ }
    }
    setSummary((s) => ({ ...s, alunos: count }));
    setSaving(false);
    setStep(7);
  }

  function skip() { setStep((s) => s + 1); }

  function closeWizard() { setStep(0); refetch(); }

  // ── Edit handlers ────────────────────────────────────────────

  function openEdit(s: School) {
    setEditForm({
      name: s.name, address: s.address ?? "", city: s.city, state: s.state,
      zip_code: s.zip_code ?? "", manager_name: s.manager_name ?? "",
      manager_email: s.manager_email ?? "", manager_whatsapp: s.manager_whatsapp ?? "",
      manager_cpf: "",
    });
    setEditModal(s);
  }

  async function handleEdit() {
    if (!editModal) return;
    setSaving(true);
    try {
      await schoolsApi.update(editModal.id, editForm);
      setEditModal(null);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(s: School) {
    if (!confirm(`Desativar a unidade "${s.name}"?`)) return;
    await schoolsApi.deactivate(s.id);
    refetch();
  }

  function getAdminPassword(s: School): string {
    if (s.admin_profile_code && s.admin_cpf) {
      const digits = s.admin_cpf.replace(/\D/g, "").substring(0, 3);
      return `${s.admin_profile_code}@${digits}`;
    }
    return "Colegio@2025";
  }

  async function handleCopyPassword(s: School) {
    const pwd = getAdminPassword(s);
    await navigator.clipboard.writeText(pwd);
    alert(`Senha copiada: ${pwd}`);
  }

  async function handleImpersonate(s: School) {
    if (!s.admin_id) return;
    try {
      const res = await impersonateApi.start(s.admin_id) as { token: string; user: AuthUser };
      startImpersonation(res.token, res.user);
      router.push(ROLE_DASHBOARD[res.user.role as UserRole]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao acessar como administrador.");
    }
  }

  async function handleDelete(s: School) {
    if (!confirm(`Mover "${s.name}" para a lixeira? Você poderá restaurá-la em "Unidades Excluídas".`)) return;
    await schoolsApi.delete(s.id);
    refetch();
  }

  // ── Helpers ──────────────────────────────────────────────────

  function addRow<T>(setter: React.Dispatch<React.SetStateAction<T[]>>, empty: T) {
    setter((prev) => [...prev, { ...empty }]);
  }

  function removeRow<T>(setter: React.Dispatch<React.SetStateAction<T[]>>, idx: number) {
    setter((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateRow<T>(setter: React.Dispatch<React.SetStateAction<T[]>>, idx: number, patch: Partial<T>) {
    setter((prev) => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  }

  // ── Wizard steps content ─────────────────────────────────────

  function StepIndicator() {
    return (
      <div className="flex items-center justify-between mb-6">
        {WIZARD_STEPS.map((s, i) => {
          const n = i + 1;
          const done    = step > n;
          const current = step === n;
          return (
            <div key={s.label} className="flex flex-col items-center gap-1 flex-1">
              <div className="flex items-center w-full">
                {i > 0 && (
                  <div className="flex-1 h-px" style={{ background: done || current ? "#f0c040" : "rgba(255,255,255,0.1)" }} />
                )}
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    background: done ? "#f0c040" : current ? "rgba(240,192,64,0.2)" : "rgba(255,255,255,0.07)",
                    border: current ? "2px solid #f0c040" : done ? "none" : "1px solid rgba(255,255,255,0.12)",
                    color: done ? "#0a1638" : current ? "#f0c040" : "rgba(255,255,255,0.4)",
                  }}>
                  {done ? "✓" : n}
                </div>
                {i < WIZARD_STEPS.length - 1 && (
                  <div className="flex-1 h-px" style={{ background: done ? "#f0c040" : "rgba(255,255,255,0.1)" }} />
                )}
              </div>
              <span className="text-xs mt-0.5" style={{ color: current ? "#f0c040" : "rgba(255,255,255,0.3)", fontSize: "10px" }}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  function WizardActions({ onSave, saveLabel, canSave = true, canSkip = true }: {
    onSave: () => void; saveLabel: string; canSave?: boolean; canSkip?: boolean;
  }) {
    return (
      <div className="flex gap-3 pt-2">
        {canSkip && (
          <button onClick={skip}
            className="flex-1 py-3 rounded-2xl font-semibold text-sm"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
            Pular esta etapa →
          </button>
        )}
        <button onClick={onSave} disabled={!canSave || saving}
          className="flex-1 py-3 rounded-2xl font-bold text-sm disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif" }}>
          {saving ? "Salvando…" : saveLabel}
        </button>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            Unidades da Rede
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            {loading ? "Carregando…" : `${totals.active} unidade${totals.active !== 1 ? "s" : ""} ativa${totals.active !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setCsvModal(true); setCsvRows([]); setCsvResults(null); }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm"
            style={{ background: "rgba(240,192,64,0.1)", color: "#f0c040", border: "1px solid rgba(240,192,64,0.3)", fontFamily: "'Space Grotesk',sans-serif" }}>
            📥 Importar CSV
          </button>
          <button onClick={openWizard}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm"
            style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif", boxShadow: "0 4px 20px rgba(240,192,64,0.3)" }}>
            + Nova Unidade
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: "👨‍🚀", label: "Total Alunos",     value: totals.students, color: "#60a5fa" },
          { icon: "👨‍🏫", label: "Total Professores", value: totals.teachers, color: "#34d399" },
          { icon: "🏛",  label: "Unidades Ativas",  value: totals.active,   color: "#f0c040" },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center py-3 rounded-xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <span className="text-xl mb-1">{s.icon}</span>
            <p className="text-xl font-bold" style={{ color: s.color, fontFamily: "'Space Grotesk',sans-serif" }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto"
            style={{ borderColor: "#f0c040", borderTopColor: "transparent" }} />
        </div>
      )}

      {!loading && (!schools || schools.length === 0) && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="text-6xl">🏛</span>
          <p className="text-lg font-bold text-white">Nenhuma unidade cadastrada</p>
          <button onClick={openWizard} className="px-6 py-3 rounded-xl font-bold text-sm"
            style={{ background: "rgba(240,192,64,0.15)", color: "#f0c040" }}>
            + Cadastrar Primeira Unidade
          </button>
        </div>
      )}

      {/* School list */}
      {!loading && schools && schools.length > 0 && (
        <div className="space-y-3">
          {schools.map((u) => {
            const isOpen = selected === u.id;
            return (
              <div key={u.id} className="rounded-2xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${u.active ? "rgba(255,255,255,0.07)" : "rgba(248,113,113,0.15)"}` }}>
                <button className="w-full flex items-center gap-4 px-5 py-4 text-left"
                  onClick={() => setSelected(isOpen ? null : u.id)}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: u.active ? "rgba(240,192,64,0.1)" : "rgba(248,113,113,0.1)" }}>
                    🏛
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{u.name}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {u.city}/{u.state} · {u.manager_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold text-white">{u.student_count}</p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>alunos</p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                      style={{ background: u.active ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)", color: u.active ? "#34d399" : "#f87171" }}>
                      {u.active ? "Ativa" : "Inativa"}
                    </span>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{isOpen ? "▲" : "▼"}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 border-t space-y-3" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                      {[
                        { label: "Alunos",      value: u.student_count },
                        { label: "Professores", value: u.teacher_count },
                        { label: "Admins",      value: u.admin_count },
                        { label: "Cidade",      value: `${u.city}/${u.state}` },
                      ].map((s) => (
                        <div key={s.label} className="px-3 py-2 rounded-xl text-center"
                          style={{ background: "rgba(255,255,255,0.05)" }}>
                          <p className="text-sm font-bold text-white">{s.value}</p>
                          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                      🏛 Diretor: {u.manager_name} · {u.manager_email}
                    </p>

                    {/* Admin user card */}
                    <div className="rounded-xl p-3 space-y-2"
                      style={{ background: "rgba(240,192,64,0.05)", border: "1px solid rgba(240,192,64,0.15)" }}>
                      <p className="text-xs font-bold" style={{ color: "#f0c040" }}>👑 Administrador do Sistema</p>
                      {u.admin_id ? (
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <p className="text-sm font-semibold text-white">{u.admin_name}</p>
                            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{u.admin_email}</p>
                            {u.admin_profile_code && (
                              <p className="text-xs mt-0.5 font-mono" style={{ color: "#f0c040" }}>
                                Código: {u.admin_profile_code}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleCopyPassword(u)}
                              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-semibold"
                              style={{ background: "rgba(96,165,250,0.12)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.2)" }}>
                              📋 Copiar Senha
                            </button>
                            <button onClick={() => handleImpersonate(u)}
                              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-bold"
                              style={{ background: "linear-gradient(135deg,rgba(240,192,64,0.2),rgba(234,179,8,0.2))", color: "#f0c040", border: "1px solid rgba(240,192,64,0.3)" }}>
                              🔑 Entrar como
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                          Nenhum administrador cadastrado para esta unidade.
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => openEdit(u)}
                        className="text-xs px-3 py-2 rounded-lg font-semibold"
                        style={{ background: "rgba(240,192,64,0.1)", color: "#f0c040" }}>
                        ✏️ Editar
                      </button>
                      {u.active && (
                        <button onClick={() => handleDeactivate(u)}
                          className="text-xs px-3 py-2 rounded-lg font-semibold"
                          style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>
                          🚫 Desativar
                        </button>
                      )}
                      <button onClick={() => handleDelete(u)}
                        className="text-xs px-3 py-2 rounded-lg font-semibold"
                        style={{ background: "rgba(248,113,113,0.15)", color: "#f87171", border: "1px solid rgba(248,113,113,0.25)" }}>
                        🗑 Mover para Lixeira
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── WIZARD MODAL ────────────────────────────────────── */}
      {step > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)" }}>
          <div className="w-full max-w-lg rounded-3xl p-6 overflow-y-auto space-y-5"
            style={{ background: "#0d1a3a", border: "1px solid rgba(240,192,64,0.2)", maxHeight: "92vh" }}>

            {/* Header */}
            {step < 7 && (
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                    {WIZARD_STEPS[step - 1]?.icon} {WIZARD_STEPS[step - 1]?.label}
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Etapa {step} de {WIZARD_STEPS.length}
                  </p>
                </div>
                <button onClick={closeWizard}
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>✕</button>
              </div>
            )}

            <StepIndicator />

            {/* ── Step 1: Unidade ── */}
            {step === 1 && (
              <div className="space-y-3">
                <FormField label="Nome da Unidade *" value={schoolForm.name}
                  placeholder="Ex: Colégio Cristão Central"
                  onChange={(v) => setSchoolForm((p) => ({ ...p, name: v }))} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Cidade *" value={schoolForm.city}
                    placeholder="Curitiba"
                    onChange={(v) => setSchoolForm((p) => ({ ...p, city: v }))} />
                  <FormField label="Estado" value={schoolForm.state}
                    placeholder="PR"
                    onChange={(v) => setSchoolForm((p) => ({ ...p, state: v }))} />
                </div>
                <FormField label="Endereço" value={schoolForm.address}
                  placeholder="Rua das Missões, 100"
                  onChange={(v) => setSchoolForm((p) => ({ ...p, address: v }))} />
                <FormField label="CEP" value={schoolForm.zip_code}
                  placeholder="80000-000"
                  onChange={(v) => setSchoolForm((p) => ({ ...p, zip_code: v }))} />
                <p className="text-xs font-bold pt-1" style={{ color: "rgba(255,255,255,0.5)" }}>Responsável pela unidade</p>
                <FormField label="Nome do Diretor" value={schoolForm.manager_name}
                  placeholder="Roberto Alves"
                  onChange={(v) => setSchoolForm((p) => ({ ...p, manager_name: v }))} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="E-mail do Diretor" value={schoolForm.manager_email}
                    type="email" placeholder="diretor@escola.edu.br"
                    onChange={(v) => setSchoolForm((p) => ({ ...p, manager_email: v }))} />
                  <FormField label="WhatsApp" value={schoolForm.manager_whatsapp}
                    placeholder="41999990000"
                    onChange={(v) => setSchoolForm((p) => ({ ...p, manager_whatsapp: v }))} />
                </div>
                <FormField label="CPF do Diretor" value={schoolForm.manager_cpf}
                  placeholder="000.000.000-00"
                  onChange={(v) => setSchoolForm((p) => ({ ...p, manager_cpf: v }))} />
                <WizardActions
                  onSave={handleSaveSchool}
                  saveLabel="Criar Unidade →"
                  canSave={!!schoolForm.name.trim() && !!schoolForm.city.trim()}
                  canSkip={false}
                />
              </div>
            )}

            {/* ── Step 2: Administrador ── */}
            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Cadastre o administrador principal desta unidade. A senha será gerada automaticamente
                  (<span style={{ color: "#f0c040" }}>CódigoPerfil@3primeirosDigitosCPF</span>) e enviada por e-mail.
                </p>
                <div className="p-3 rounded-xl space-y-2"
                  style={{ background: "rgba(240,192,64,0.05)", border: "1px solid rgba(240,192,64,0.15)" }}>
                  <p className="text-xs font-bold mb-2" style={{ color: "#f0c040" }}>👑 Administrador do Sistema</p>
                  <FormField label="Nome *" value={adminForm.name}
                    placeholder="Ex: Roberto Alves"
                    onChange={(v) => setAdminForm((p) => ({ ...p, name: v }))} />
                  <FormField label="E-mail *" value={adminForm.email}
                    type="email" placeholder="admin@escola.edu.br"
                    onChange={(v) => setAdminForm((p) => ({ ...p, email: v }))} />
                  <FormField label="CPF *" value={adminForm.cpf}
                    placeholder="000.000.000-00"
                    onChange={(v) => setAdminForm((p) => ({ ...p, cpf: v }))} />
                </div>
                <WizardActions
                  onSave={handleSaveAdmin}
                  saveLabel="Salvar Administrador →"
                />
              </div>
            )}

            {/* ── Step 3: Turmas ── */}
            {step === 3 && (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Adicione as turmas desta unidade. Você pode pular e cadastrar depois.
                </p>
                <div className="space-y-3">
                  {turmas.map((t, i) => (
                    <div key={i} className="p-3 rounded-xl space-y-2"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>Turma {i + 1}</span>
                        {turmas.length > 1 && (
                          <button onClick={() => removeRow(setTurmas, i)}
                            className="text-xs px-2 py-0.5 rounded"
                            style={{ color: "#f87171", background: "rgba(248,113,113,0.1)" }}>remover</button>
                        )}
                      </div>
                      <SelectField label="Ano / Série" value={t.grade_level_id}
                        options={gradeLevelOptions}
                        onChange={(v) => updateRow(setTurmas, i, { grade_level_id: v })} />
                      <FormField label="Nome da Turma" value={t.name}
                        placeholder="Ex: Cativante, Destemido, Explorador"
                        onChange={(v) => updateRow(setTurmas, i, { name: v })} />
                      <SelectField label="Turno" value={t.shift}
                        options={SHIFTS}
                        onChange={(v) => updateRow(setTurmas, i, { shift: v })} />
                    </div>
                  ))}
                </div>
                <button onClick={() => addRow(setTurmas, EMPTY_TURMA)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: "rgba(240,192,64,0.08)", color: "#f0c040", border: "1px dashed rgba(240,192,64,0.3)" }}>
                  + Adicionar Turma
                </button>
                <WizardActions
                  onSave={handleSaveTurmas}
                  saveLabel="Salvar Turmas →"
                />
              </div>
            )}

            {/* ── Step 4: Pedagógico ── */}
            {step === 4 && (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Cadastre o(s) coordenador(es) pedagógico(s). A senha será gerada automaticamente (<span style={{ color: "#f0c040" }}>CódigoPerfil@3primeirosDigitosCPF</span>) e enviada por e-mail.
                </p>
                {createdTurmas.length === 0 && (
                  <p className="text-xs px-3 py-2 rounded-xl" style={{ background: "rgba(248,113,113,0.08)", color: "#f87171" }}>
                    Nenhuma turma criada nesta sessão. O vínculo com turma poderá ser feito depois.
                  </p>
                )}
                <div className="space-y-3">
                  {pedagogicos.map((u, i) => (
                    <div key={i} className="p-3 rounded-xl space-y-2"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>Pedagógico {i + 1}</span>
                        {pedagogicos.length > 1 && (
                          <button onClick={() => removeRow(setPedagogicos, i)}
                            className="text-xs px-2 py-0.5 rounded"
                            style={{ color: "#f87171", background: "rgba(248,113,113,0.1)" }}>remover</button>
                        )}
                      </div>
                      <FormField label="Nome" value={u.name}
                        placeholder="Maria Santos"
                        onChange={(v) => updateRow(setPedagogicos, i, { name: v })} />
                      <FormField label="E-mail" value={u.email}
                        type="email" placeholder="coordenacao@escola.edu.br"
                        onChange={(v) => updateRow(setPedagogicos, i, { email: v })} />
                      <FormField label="CPF *" value={u.cpf}
                        placeholder="000.000.000-00"
                        onChange={(v) => updateRow(setPedagogicos, i, { cpf: v })} />
                      {createdTurmas.length > 0 && (
                        <div>
                          <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Turmas (selecione uma ou mais)</label>
                          <div className="flex flex-wrap gap-2">
                            {createdTurmas.map((t) => {
                              const sel = u.class_ids.includes(t.id);
                              return (
                                <button key={t.id} type="button"
                                  onClick={() => updateRow(setPedagogicos, i, { class_ids: sel ? u.class_ids.filter((id) => id !== t.id) : [...u.class_ids, t.id] })}
                                  className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                                  style={{ background: sel ? "rgba(240,192,64,0.2)" : "rgba(255,255,255,0.06)", color: sel ? "#f0c040" : "rgba(255,255,255,0.4)", border: `1px solid ${sel ? "rgba(240,192,64,0.4)" : "rgba(255,255,255,0.1)"}` }}>
                                  {sel ? "✓ " : ""}{t.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => addRow(setPedagogicos, EMPTY_USER)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: "rgba(240,192,64,0.08)", color: "#f0c040", border: "1px dashed rgba(240,192,64,0.3)" }}>
                  + Adicionar Coordenador
                </button>
                <WizardActions
                  onSave={() => handleSaveUsers(pedagogicos, "pedagogico", 5, "pedagogicos", turmasApi.addPedagogico)}
                  saveLabel="Salvar Pedagógico →"
                />
              </div>
            )}

            {/* ── Step 5: Professores ── */}
            {step === 5 && (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Cadastre os professores. A senha será gerada automaticamente (<span style={{ color: "#f0c040" }}>CódigoPerfil@3primeirosDigitosCPF</span>) e enviada por e-mail.
                </p>
                {createdTurmas.length === 0 && (
                  <p className="text-xs px-3 py-2 rounded-xl" style={{ background: "rgba(248,113,113,0.08)", color: "#f87171" }}>
                    Nenhuma turma criada nesta sessão. O vínculo com turma poderá ser feito depois.
                  </p>
                )}
                <div className="space-y-3">
                  {professores.map((u, i) => (
                    <div key={i} className="p-3 rounded-xl space-y-2"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>Professor {i + 1}</span>
                        {professores.length > 1 && (
                          <button onClick={() => removeRow(setProfessores, i)}
                            className="text-xs px-2 py-0.5 rounded"
                            style={{ color: "#f87171", background: "rgba(248,113,113,0.1)" }}>remover</button>
                        )}
                      </div>
                      <FormField label="Nome" value={u.name}
                        placeholder="João Silva"
                        onChange={(v) => updateRow(setProfessores, i, { name: v })} />
                      <FormField label="E-mail" value={u.email}
                        type="email" placeholder="professor@escola.edu.br"
                        onChange={(v) => updateRow(setProfessores, i, { email: v })} />
                      <FormField label="CPF *" value={u.cpf}
                        placeholder="000.000.000-00"
                        onChange={(v) => updateRow(setProfessores, i, { cpf: v })} />
                      {createdTurmas.length > 0 && (
                        <div>
                          <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Turmas (selecione uma ou mais)</label>
                          <div className="flex flex-wrap gap-2">
                            {createdTurmas.map((t) => {
                              const sel = u.class_ids.includes(t.id);
                              return (
                                <button key={t.id} type="button"
                                  onClick={() => updateRow(setProfessores, i, { class_ids: sel ? u.class_ids.filter((id) => id !== t.id) : [...u.class_ids, t.id] })}
                                  className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                                  style={{ background: sel ? "rgba(240,192,64,0.2)" : "rgba(255,255,255,0.06)", color: sel ? "#f0c040" : "rgba(255,255,255,0.4)", border: `1px solid ${sel ? "rgba(240,192,64,0.4)" : "rgba(255,255,255,0.1)"}` }}>
                                  {sel ? "✓ " : ""}{t.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => addRow(setProfessores, EMPTY_USER)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: "rgba(240,192,64,0.08)", color: "#f0c040", border: "1px dashed rgba(240,192,64,0.3)" }}>
                  + Adicionar Professor
                </button>
                <WizardActions
                  onSave={() => handleSaveUsers(professores, "professor", 6, "professores", turmasApi.addProfessor)}
                  saveLabel="Salvar Professores →"
                />
              </div>
            )}

            {/* ── Step 6: Alunos ── */}
            {step === 6 && (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Cadastre os alunos. A senha será gerada automaticamente (<span style={{ color: "#f0c040" }}>CódigoPerfil@3primeirosDigitosCPF</span>) e enviada por e-mail.
                </p>
                {createdTurmas.length === 0 && (
                  <p className="text-xs px-3 py-2 rounded-xl" style={{ background: "rgba(248,113,113,0.08)", color: "#f87171" }}>
                    Nenhuma turma criada nesta sessão. O vínculo com turma poderá ser feito depois.
                  </p>
                )}
                <div className="space-y-3">
                  {alunos.map((u, i) => (
                    <div key={i} className="p-3 rounded-xl space-y-2"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>Aluno {i + 1}</span>
                        {alunos.length > 1 && (
                          <button onClick={() => removeRow(setAlunos, i)}
                            className="text-xs px-2 py-0.5 rounded"
                            style={{ color: "#f87171", background: "rgba(248,113,113,0.1)" }}>remover</button>
                        )}
                      </div>
                      <FormField label="Nome" value={u.name}
                        placeholder="Pedro Alves"
                        onChange={(v) => updateRow(setAlunos, i, { name: v })} />
                      <FormField label="E-mail" value={u.email}
                        type="email" placeholder="pedro@email.com"
                        onChange={(v) => updateRow(setAlunos, i, { email: v })} />
                      <FormField label="CPF *" value={u.cpf}
                        placeholder="000.000.000-00"
                        onChange={(v) => updateRow(setAlunos, i, { cpf: v })} />
                      {createdTurmas.length > 0 && (
                        <SelectField label="Turma"
                          value={u.class_id}
                          options={createdTurmas.map((t) => ({ value: t.id, label: t.name }))}
                          onChange={(v) => updateRow(setAlunos, i, { class_id: v })} />
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => addRow(setAlunos, EMPTY_ALUNO)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: "rgba(240,192,64,0.08)", color: "#f0c040", border: "1px dashed rgba(240,192,64,0.3)" }}>
                  + Adicionar Aluno
                </button>
                <WizardActions
                  onSave={handleSaveAlunos}
                  saveLabel="Salvar Alunos →"
                />
              </div>
            )}

            {/* ── Step 7: Concluído ── */}
            {step === 7 && (
              <div className="text-center space-y-5 py-4">
                <div className="text-6xl">🚀</div>
                <div>
                  <h3 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                    Unidade pronta para decolar!
                  </h3>
                  <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                    A unidade foi criada com sucesso. Confira o que foi cadastrado:
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-left">
                  {[
                    { icon: "👑",  label: "Administrador", value: summary.admin },
                    { icon: "📚", label: "Turmas",         value: summary.turmas },
                    { icon: "🧑‍💼", label: "Pedagógico",   value: summary.pedagogicos },
                    { icon: "👨‍🏫", label: "Professores",   value: summary.professores },
                    { icon: "👨‍🚀", label: "Alunos",        value: summary.alunos },
                  ].map((s) => (
                    <div key={s.label} className="px-4 py-3 rounded-2xl"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <p className="text-lg">{s.icon}</p>
                      <p className="text-xl font-bold text-white mt-1">{s.value}</p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{s.label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Você pode complementar o cadastro a qualquer momento pela lista de usuários e turmas.
                </p>
                <button onClick={closeWizard}
                  className="w-full py-3 rounded-2xl font-bold text-sm"
                  style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif" }}>
                  Concluir ✓
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EDIT MODAL (simple) ──────────────────────────────── */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditModal(null); }}>
          <div className="w-full max-w-lg rounded-3xl p-6 space-y-4 overflow-y-auto"
            style={{ background: "#0d1a3a", border: "1px solid rgba(240,192,64,0.2)", maxHeight: "90vh" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                Editar Unidade
              </h2>
              <button onClick={() => setEditModal(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>✕</button>
            </div>
            <div className="space-y-3">
              <FormField label="Nome da Unidade *" value={editForm.name}
                placeholder="Ex: Colégio Cristão Central"
                onChange={(v) => setEditForm((p) => ({ ...p, name: v }))} />
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Cidade *" value={editForm.city}
                  placeholder="Curitiba"
                  onChange={(v) => setEditForm((p) => ({ ...p, city: v }))} />
                <FormField label="Estado" value={editForm.state}
                  placeholder="PR"
                  onChange={(v) => setEditForm((p) => ({ ...p, state: v }))} />
              </div>
              <FormField label="Endereço" value={editForm.address}
                placeholder="Rua das Missões, 100"
                onChange={(v) => setEditForm((p) => ({ ...p, address: v }))} />
              <FormField label="CEP" value={editForm.zip_code}
                placeholder="80000-000"
                onChange={(v) => setEditForm((p) => ({ ...p, zip_code: v }))} />
              <p className="text-xs font-bold pt-1" style={{ color: "rgba(255,255,255,0.5)" }}>Responsável pela unidade</p>
              <FormField label="Nome do Diretor" value={editForm.manager_name}
                placeholder="Roberto Alves"
                onChange={(v) => setEditForm((p) => ({ ...p, manager_name: v }))} />
              <div className="grid grid-cols-2 gap-3">
                <FormField label="E-mail do Diretor" value={editForm.manager_email}
                  type="email" placeholder="diretor@escola.edu.br"
                  onChange={(v) => setEditForm((p) => ({ ...p, manager_email: v }))} />
                <FormField label="WhatsApp" value={editForm.manager_whatsapp}
                  placeholder="41999990000"
                  onChange={(v) => setEditForm((p) => ({ ...p, manager_whatsapp: v }))} />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditModal(null)}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                Cancelar
              </button>
              <button onClick={handleEdit} disabled={!editForm.name.trim() || !editForm.city.trim() || saving}
                className="flex-1 py-3 rounded-2xl font-bold text-sm disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif" }}>
                {saving ? "Salvando…" : "Salvar →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CSV IMPORT MODAL ────────────────────────────────── */}
      {csvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeCsvModal(); }}>
          <div className="w-full max-w-2xl rounded-3xl p-6 space-y-5 overflow-y-auto"
            style={{ background: "#0d1a3a", border: "1px solid rgba(240,192,64,0.2)", maxHeight: "92vh" }}>

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                  📥 Importar Unidades via CSV
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Cadastre múltiplas unidades de uma só vez
                </p>
              </div>
              <button onClick={closeCsvModal}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>✕</button>
            </div>

            {/* Modelo */}
            <div className="rounded-2xl p-4 space-y-3"
              style={{ background: "rgba(240,192,64,0.05)", border: "1px solid rgba(240,192,64,0.15)" }}>
              <p className="text-sm font-bold" style={{ color: "#f0c040" }}>Modelo de Planilha</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                Baixe o modelo, preencha os dados e faça o upload. Colunas obrigatórias:
                <span className="font-mono" style={{ color: "#f0c040" }}> nome_unidade</span>,
                <span className="font-mono" style={{ color: "#f0c040" }}> cidade</span>.
                As demais colunas são opcionais.
              </p>
              <div className="font-mono text-xs px-3 py-2 rounded-xl overflow-x-auto"
                style={{ background: "rgba(0,0,0,0.3)", color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap" }}>
                nome_unidade · cidade · estado · endereco · cep · nome_diretor · email_diretor · whatsapp_diretor · cpf_diretor · nome_admin · email_admin · cpf_admin
              </div>
              <button onClick={downloadCsvTemplate}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm"
                style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif" }}>
                ⬇️ Baixar Modelo .CSV
              </button>
            </div>

            {/* Upload */}
            {!csvResults && (
              <div>
                <label className="block w-full cursor-pointer rounded-2xl py-8 text-center"
                  style={{ border: "2px dashed rgba(240,192,64,0.3)", background: "rgba(240,192,64,0.03)" }}>
                  <input type="file" accept=".csv,text/csv" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvFile(f); e.target.value = ''; }} />
                  <p className="text-3xl mb-2">📂</p>
                  <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>
                    Clique para selecionar o arquivo CSV
                  </p>
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Suporte a vírgula (,) e ponto-e-vírgula (;) como separadores
                  </p>
                </label>
              </div>
            )}

            {/* Preview */}
            {csvRows.length > 0 && !csvResults && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-white">
                  {csvRows.length} unidade{csvRows.length !== 1 ? "s" : ""} encontrada{csvRows.length !== 1 ? "s" : ""} no arquivo
                </p>
                <div className="rounded-2xl overflow-hidden"
                  style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,0.05)" }}>
                        {["#", "Unidade", "Cidade/UF", "Diretor", "Admin"].map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-semibold"
                            style={{ color: "rgba(255,255,255,0.5)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.slice(0, 10).map((r, i) => (
                        <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                          <td className="px-3 py-2" style={{ color: "rgba(255,255,255,0.3)" }}>{i + 1}</td>
                          <td className="px-3 py-2 font-semibold text-white max-w-[140px] truncate">
                            {r['nome_unidade'] || r['nome'] || <span style={{ color: "#f87171" }}>—</span>}
                          </td>
                          <td className="px-3 py-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                            {r['cidade']}{r['estado'] ? `/${r['estado']}` : ''}
                          </td>
                          <td className="px-3 py-2 max-w-[120px] truncate" style={{ color: "rgba(255,255,255,0.5)" }}>
                            {r['nome_diretor'] || '—'}
                          </td>
                          <td className="px-3 py-2 max-w-[120px] truncate" style={{ color: "rgba(255,255,255,0.5)" }}>
                            {r['nome_admin'] || '—'}
                          </td>
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
                  <button onClick={() => setCsvRows([])}
                    className="flex-1 py-3 rounded-2xl font-semibold text-sm"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                    Trocar arquivo
                  </button>
                  <button onClick={handleCsvImport} disabled={csvImporting}
                    className="flex-1 py-3 rounded-2xl font-bold text-sm disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif" }}>
                    {csvImporting ? "Importando…" : `Importar ${csvRows.length} Unidade${csvRows.length !== 1 ? "s" : ""} →`}
                  </button>
                </div>
              </div>
            )}

            {/* Results */}
            {csvResults && (
              <div className="space-y-3">
                {(() => {
                  const ok  = csvResults.filter((r) => r.success).length;
                  const err = csvResults.filter((r) => !r.success).length;
                  return (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl py-4 text-center"
                        style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)" }}>
                        <p className="text-2xl font-bold" style={{ color: "#34d399" }}>{ok}</p>
                        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Importadas com sucesso</p>
                      </div>
                      <div className="rounded-2xl py-4 text-center"
                        style={{ background: err > 0 ? "rgba(248,113,113,0.08)" : "rgba(52,211,153,0.04)", border: `1px solid ${err > 0 ? "rgba(248,113,113,0.2)" : "rgba(52,211,153,0.1)"}` }}>
                        <p className="text-2xl font-bold" style={{ color: err > 0 ? "#f87171" : "#34d399" }}>{err}</p>
                        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Com erro</p>
                      </div>
                    </div>
                  );
                })()}
                {csvResults.some((r) => !r.success) && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold" style={{ color: "#f87171" }}>Linhas com erro:</p>
                    {csvResults.filter((r) => !r.success).map((r) => (
                      <div key={r.row} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                        style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)" }}>
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>Linha {r.row}</span>
                        <span className="font-semibold text-white">{r.name}</span>
                        <span style={{ color: "#f87171" }}>— {r.error}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={closeCsvModal}
                  className="w-full py-3 rounded-2xl font-bold text-sm"
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
