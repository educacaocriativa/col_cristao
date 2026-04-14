"use client";

import { useState } from "react";
import { schoolsApi } from "../../../_lib/api";
import { useQuery } from "../../../_lib/useQuery";

interface DeletedSchool {
  id: string; name: string; city: string; state: string;
  address: string; zip_code: string;
  manager_name: string; manager_email: string; manager_whatsapp: string;
  created_at: string; deleted_at: string;
  student_count: number; teacher_count: number; admin_count: number;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function UnidadesExcluidasPage() {
  const [restoring, setRestoring] = useState<string | null>(null);

  const { data: schools, loading, refetch } = useQuery<DeletedSchool[]>(
    () => schoolsApi.listDeleted() as Promise<DeletedSchool[]>, []
  );

  async function handleRestore(s: DeletedSchool) {
    if (!confirm(`Restaurar a unidade "${s.name}"? Ela voltará a aparecer na lista principal como ativa.`)) return;
    setRestoring(s.id);
    try {
      await schoolsApi.restore(s.id);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao restaurar unidade.");
    } finally {
      setRestoring(null);
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
          style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}>
          🗑
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            Unidades Excluídas
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            {loading ? "Carregando…" : `${schools?.length ?? 0} unidade${(schools?.length ?? 0) !== 1 ? "s" : ""} na lixeira`}
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="px-4 py-3 rounded-2xl flex items-start gap-3"
        style={{ background: "rgba(240,192,64,0.06)", border: "1px solid rgba(240,192,64,0.15)" }}>
        <span className="text-lg shrink-0">ℹ️</span>
        <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
          Unidades excluídas ficam armazenadas aqui com todos os seus dados preservados (turmas, usuários, histórico).
          Restaure a qualquer momento para reativá-las na rede.
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto"
            style={{ borderColor: "#f0c040", borderTopColor: "transparent" }} />
        </div>
      )}

      {/* Empty state */}
      {!loading && (!schools || schools.length === 0) && (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <span className="text-6xl">✨</span>
          <p className="text-lg font-bold text-white">Nenhuma unidade excluída</p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Quando uma unidade for excluída ela aparecerá aqui.
          </p>
        </div>
      )}

      {/* List */}
      {!loading && schools && schools.length > 0 && (
        <div className="space-y-3">
          {schools.map((s) => (
            <div key={s.id} className="rounded-2xl overflow-hidden"
              style={{ background: "rgba(248,113,113,0.04)", border: "1px solid rgba(248,113,113,0.12)" }}>
              <div className="px-5 py-4 flex items-start gap-4">
                {/* Icon */}
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: "rgba(248,113,113,0.1)" }}>
                  🏛
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <p className="text-sm font-bold text-white">{s.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {s.city}/{s.state}{s.manager_name ? ` · ${s.manager_name}` : ""}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-3">
                    {[
                      { label: "Alunos",      value: s.student_count },
                      { label: "Professores", value: s.teacher_count },
                      { label: "Admins",      value: s.admin_count },
                    ].map((st) => (
                      <div key={st.label} className="px-3 py-1.5 rounded-lg text-center"
                        style={{ background: "rgba(255,255,255,0.05)" }}>
                        <p className="text-sm font-bold text-white">{st.value}</p>
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{st.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Dates */}
                  <div className="flex flex-wrap gap-4 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                    <span>Criada em: {formatDate(s.created_at)}</span>
                    <span style={{ color: "#f87171" }}>Excluída em: {formatDate(s.deleted_at)}</span>
                  </div>

                  {/* Contact */}
                  {s.manager_email && (
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                      👤 {s.manager_email}
                    </p>
                  )}
                </div>
              </div>

              {/* Footer with restore button */}
              <div className="px-5 pb-4 flex gap-2">
                <button
                  onClick={() => handleRestore(s)}
                  disabled={restoring === s.id}
                  className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl font-bold disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#34d399,#10b981)", color: "#022c22", fontFamily: "'Space Grotesk',sans-serif" }}>
                  {restoring === s.id ? "Restaurando…" : "↩ Restaurar Unidade"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
