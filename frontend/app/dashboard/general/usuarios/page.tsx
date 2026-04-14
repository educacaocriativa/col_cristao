"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usuariosApi, schoolsApi, impersonateApi } from "../../../_lib/api";
import { useQuery } from "../../../_lib/useQuery";
import { startImpersonation, ROLE_DASHBOARD, type AuthUser, type UserRole } from "../../../_lib/auth";

const ROLE_CONFIG = {
  super_admin: { label: "Comandante Geral", color: "#f87171", bg: "rgba(248,113,113,0.12)", icon: "🌌" },
  admin:       { label: "Comandante Base",  color: "#f0c040", bg: "rgba(240,192,64,0.12)",  icon: "🏛" },
  pedagogico:  { label: "Navegador",        color: "#a78bfa", bg: "rgba(139,92,246,0.12)",  icon: "🧭" },
  professor:   { label: "Piloto",           color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  icon: "👨‍🏫" },
  aluno:       { label: "Cosmonauta",       color: "#34d399", bg: "rgba(52,211,153,0.12)",  icon: "👨‍🚀" },
  pais:        { label: "Controle Missão",  color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  icon: "🌍" },
};
type Role = keyof typeof ROLE_CONFIG;

interface User {
  id: string; name: string; email: string; role: Role;
  school_name: string | null; active: boolean;
  last_login: string | null; created_at: string;
}
interface School { id: string; name: string; city: string; }

const EMPTY_FORM = { name: "", email: "", password: "", role: "professor" as Role, school_id: "", whatsapp: "" };

export default function UsuariosPage() {
  const router = useRouter();
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState({ ...EMPTY_FORM });

  const { data: users, loading, refetch } = useQuery<User[]>(
    () => usuariosApi.list() as Promise<User[]>, []
  );
  const { data: schools } = useQuery<School[]>(
    () => schoolsApi.list() as Promise<School[]>, []
  );

  const filtered = useMemo(() => (users ?? []).filter((u) =>
    (roleFilter === "all" || u.role === roleFilter) &&
    (!search || u.name.toLowerCase().includes(search.toLowerCase()) ||
     u.email.toLowerCase().includes(search.toLowerCase()))
  ), [users, search, roleFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: users?.length ?? 0 };
    (users ?? []).forEach((u) => { c[u.role] = (c[u.role] ?? 0) + 1; });
    return c;
  }, [users]);

  function openCreate() {
    setEditingUser(null);
    setForm({ ...EMPTY_FORM });
    setShowCreate(true);
  }

  function openEdit(u: User) {
    setEditingUser(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role, school_id: "", whatsapp: "" });
    setShowCreate(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) return;
    setSaving(true);
    try {
      if (editingUser) {
        const body: Record<string, string> = { name: form.name, email: form.email };
        if (form.password) body.password = form.password;
        if (form.whatsapp) body.whatsapp = form.whatsapp;
        await usuariosApi.update(editingUser.id, body);
      } else {
        await usuariosApi.create({
          name: form.name, email: form.email, role: form.role,
          password: form.password || undefined,
          school_id: form.school_id || undefined,
          whatsapp: form.whatsapp || undefined,
        });
      }
      setShowCreate(false);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar usuário.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u: User) {
    await usuariosApi.update(u.id, { active: !u.active });
    refetch();
  }

  async function handleDelete(u: User) {
    if (!confirm(`Remover o usuário "${u.name}"? Esta ação é irreversível.`)) return;
    await usuariosApi.delete(u.id);
    refetch();
  }

  async function handleImpersonate(u: User) {
    try {
      const res = await impersonateApi.start(u.id) as { token: string; user: AuthUser };
      startImpersonation(res.token, res.user);
      router.push(ROLE_DASHBOARD[res.user.role as UserRole]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao acessar como este usuário.");
    }
  }

  const activeCount   = (users ?? []).filter((u) => u.active).length;
  const inactiveCount = (users ?? []).filter((u) => !u.active).length;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            Usuários
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            {loading ? "Carregando…" : `${activeCount} ativos · ${inactiveCount} inativos`}
          </p>
        </div>
        <button onClick={openCreate}
          className="px-5 py-3 rounded-xl font-bold text-sm"
          style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif", boxShadow: "0 4px 20px rgba(240,192,64,0.3)" }}>
          + Novo Usuário
        </button>
      </div>

      {/* Role filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setRoleFilter("all")}
          className="px-4 py-2 rounded-xl text-xs font-bold"
          style={{ background: roleFilter === "all" ? "rgba(240,192,64,0.15)" : "rgba(255,255,255,0.05)", color: roleFilter === "all" ? "#f0c040" : "rgba(255,255,255,0.4)", border: `1px solid ${roleFilter === "all" ? "rgba(240,192,64,0.35)" : "rgba(255,255,255,0.08)"}` }}>
          Todos ({counts.all})
        </button>
        {(Object.keys(ROLE_CONFIG) as Role[]).map((r) => {
          const cfg = ROLE_CONFIG[r];
          return (
            <button key={r} onClick={() => setRoleFilter(r)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold"
              style={{ background: roleFilter === r ? cfg.bg : "rgba(255,255,255,0.05)", color: roleFilter === r ? cfg.color : "rgba(255,255,255,0.4)", border: `1px solid ${roleFilter === r ? cfg.color + "40" : "rgba(255,255,255,0.08)"}` }}>
              {cfg.icon} {cfg.label} ({counts[r] ?? 0})
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>🔍</span>
        <input type="text" placeholder="Buscar por nome ou e-mail…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-10">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto"
            style={{ borderColor: "#f0c040", borderTopColor: "transparent" }} />
        </div>
      )}

      {/* List */}
      {!loading && (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <p className="text-center py-10 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Nenhum usuário encontrado.</p>
          )}
          {filtered.map((u) => {
            const cfg = ROLE_CONFIG[u.role] ?? ROLE_CONFIG.professor;
            return (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${u.active ? "rgba(255,255,255,0.06)" : "rgba(248,113,113,0.12)"}` }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: cfg.bg, color: cfg.color }}>
                  {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{u.name}</p>
                  <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {u.email}{u.school_name ? ` · ${u.school_name}` : ""}
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold shrink-0"
                  style={{ background: cfg.bg, color: cfg.color }}>
                  {cfg.icon} {cfg.label}
                </span>
                {u.last_login && (
                  <span className="text-xs shrink-0 hidden sm:block" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {new Date(u.last_login).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </span>
                )}
                <span className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: u.active ? "#34d399" : "#f87171", boxShadow: `0 0 4px ${u.active ? "#34d399" : "#f87171"}` }} />
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(u)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                    style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)" }}>✏️</button>
                  <button onClick={() => toggleActive(u)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                    style={{ background: u.active ? "rgba(248,113,113,0.1)" : "rgba(52,211,153,0.1)", color: u.active ? "#f87171" : "#34d399" }}>
                    {u.active ? "🚫" : "✅"}
                  </button>
                  <button onClick={() => handleDelete(u)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                    style={{ background: "rgba(248,113,113,0.08)", color: "#f87171" }}>🗑</button>
                  {u.role !== "super_admin" && (
                    <button onClick={() => handleImpersonate(u)}
                      title="Entrar como este usuário"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                      style={{ background: "rgba(240,192,64,0.12)", color: "#f0c040" }}>🔑</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="w-full max-w-md rounded-3xl p-6 space-y-4"
            style={{ background: "#0d1a3a", border: "1px solid rgba(240,192,64,0.2)" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                {editingUser ? "Editar Usuário" : "Novo Usuário"}
              </h2>
              <button onClick={() => setShowCreate(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Nome completo *</label>
                <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Lucas Ferreira"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }} />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>E-mail *</label>
                <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="email@escola.edu.br"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }} />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {editingUser ? "Nova Senha (deixe vazio para manter)" : "Senha (padrão: Colegio@2025)"}
                </label>
                <input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }} />
              </div>

              {!editingUser && (
                <>
                  <div>
                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Perfil *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(ROLE_CONFIG) as Role[]).map((r) => {
                        const cfg = ROLE_CONFIG[r];
                        const active = form.role === r;
                        return (
                          <button key={r} type="button" onClick={() => setForm((p) => ({ ...p, role: r }))}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all"
                            style={{
                              background: active ? cfg.bg : "rgba(255,255,255,0.04)",
                              color: active ? cfg.color : "rgba(255,255,255,0.4)",
                              border: `1px solid ${active ? cfg.color + "50" : "rgba(255,255,255,0.08)"}`,
                            }}>
                            {cfg.icon} {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {schools && schools.length > 0 && (
                    <div>
                      <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Unidade</label>
                      <select value={form.school_id} onChange={(e) => setForm((p) => ({ ...p, school_id: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <option value="" style={{ background: "#0a1638" }}>Selecione a unidade…</option>
                        {schools.map((s) => (
                          <option key={s.id} value={s.id} style={{ background: "#0a1638" }}>{s.name} — {s.city}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 py-3.5 rounded-2xl font-semibold text-sm"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={!form.name.trim() || !form.email.trim() || saving}
                className="flex-1 py-3.5 rounded-2xl font-bold text-sm disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif" }}>
                {saving ? "Salvando…" : editingUser ? "Salvar →" : "Criar Usuário →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
