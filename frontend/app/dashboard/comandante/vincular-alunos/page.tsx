"use client";

import { useState, useEffect } from "react";
import { useQuery } from "../../../_lib/useQuery";
import { alunosApi, turmasApi } from "../../../_lib/api";

interface Aluno { id: string; name: string; email: string; internal_enrollment: string | null; active: boolean; }
interface Turma { id: string; full_name: string; shift: string; }
interface AlunoTurma { id: string; name: string; }

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function VincularAlunosPage() {
  const [selectedTurma, setSelectedTurma] = useState("");
  const [search,        setSearch]        = useState("");
  const [checked,       setChecked]       = useState<Set<string>>(new Set());
  const [saving,        setSaving]        = useState(false);
  const [savedMsg,      setSavedMsg]      = useState("");

  // alunos já na turma (carregados quando uma turma é selecionada)
  const [alunosNaTurma, setAlunosNaTurma] = useState<Set<string>>(new Set());
  const [loadingTurma,  setLoadingTurma]  = useState(false);

  const { data: turmas }  = useQuery<Turma[]>(() => turmasApi.list() as Promise<Turma[]>, []);
  const { data: alunos, loading } = useQuery<Aluno[]>(() => alunosApi.list() as Promise<Aluno[]>, []);

  // Quando muda a turma, carrega quem já está nela e pré-marca
  useEffect(() => {
    setChecked(new Set());
    setSavedMsg("");
    if (!selectedTurma) { setAlunosNaTurma(new Set()); return; }
    setLoadingTurma(true);
    (turmasApi.getAlunos(selectedTurma) as Promise<AlunoTurma[]>)
      .then(lista => {
        const ids = new Set(lista.map(a => a.id));
        setAlunosNaTurma(ids);
        setChecked(new Set(ids)); // pré-marca quem já está
      })
      .catch(() => {})
      .finally(() => setLoadingTurma(false));
  }, [selectedTurma]);

  const filtered = (alunos ?? []).filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (a.internal_enrollment ?? "").includes(search)
  );

  function toggle(id: string) {
    setChecked(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function toggleAll() {
    if (filtered.every(a => checked.has(a.id))) {
      // desmarcar todos (exceto os já na turma — esses não podemos remover aqui)
      setChecked(new Set(alunosNaTurma));
    } else {
      setChecked(new Set(filtered.map(a => a.id)));
    }
  }

  const novosParaVincular = [...checked].filter(id => !alunosNaTurma.has(id));

  async function handleSave() {
    if (!selectedTurma || novosParaVincular.length === 0) return;
    setSaving(true);
    setSavedMsg("");
    let ok = 0;
    try {
      for (const alunoId of novosParaVincular) {
        try {
          await turmasApi.addAluno(selectedTurma, alunoId);
          ok++;
        } catch { /* pula erros individuais */ }
      }
      // atualiza lista de quem está na turma
      setAlunosNaTurma(prev => {
        const n = new Set(prev);
        novosParaVincular.forEach(id => n.add(id));
        return n;
      });
      setSavedMsg(`✅ ${ok} aluno${ok !== 1 ? "s" : ""} vinculado${ok !== 1 ? "s" : ""} com sucesso!`);
    } finally {
      setSaving(false);
    }
  }

  const turmaAtual = (turmas ?? []).find(t => t.id === selectedTurma);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
          Vincular Alunos
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
          Selecione uma turma e os alunos que irão ingressar nela
        </p>
      </div>

      {/* Seleção de turma */}
      <div className="rounded-2xl p-5 space-y-3"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <label className="text-xs font-semibold block" style={{ color: "rgba(255,255,255,0.5)" }}>
          🚀 Selecione a Turma
        </label>
        <select value={selectedTurma} onChange={e => setSelectedTurma(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
          <option value="" style={{ background: "#0a1638" }}>— Selecione uma turma —</option>
          {(turmas ?? []).map(t => (
            <option key={t.id} value={t.id} style={{ background: "#0a1638" }}>{t.full_name}</option>
          ))}
        </select>
        {turmaAtual && (
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            {alunosNaTurma.size} aluno{alunosNaTurma.size !== 1 ? "s" : ""} já nesta turma
          </p>
        )}
      </div>

      {/* Busca + selecionar todos */}
      {selectedTurma && (
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>🔍</span>
            <input type="text" placeholder="Buscar aluno…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
          </div>
          <button onClick={toggleAll}
            className="px-4 py-3 rounded-xl text-xs font-bold whitespace-nowrap"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
            {filtered.every(a => checked.has(a.id)) ? "Desmarcar todos" : "Marcar todos"}
          </button>
        </div>
      )}

      {/* Mensagem de sucesso */}
      {savedMsg && (
        <div className="px-4 py-3 rounded-2xl text-sm font-semibold"
          style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", color: "#34d399" }}>
          {savedMsg}
        </div>
      )}

      {/* Lista de alunos */}
      {!selectedTurma ? (
        <div className="text-center py-14 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="text-4xl mb-3">🚀</div>
          <p className="text-sm font-semibold text-white">Selecione uma turma para começar</p>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
            Escolha a turma no campo acima para ver os alunos disponíveis
          </p>
        </div>
      ) : loading || loadingTurma ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "#f0c040", borderTopColor: "transparent" }} />
        </div>
      ) : (
        <div className="space-y-2">
          {/* Legenda */}
          <div className="flex items-center gap-4 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ background: "#34d399" }} /> Já na turma
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ background: "#f0c040" }} /> Será vinculado
            </span>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "rgba(255,255,255,0.3)" }}>Nenhum aluno encontrado.</p>
          ) : filtered.map(a => {
            const jaEsta  = alunosNaTurma.has(a.id);
            const marcado = checked.has(a.id);
            const novo    = marcado && !jaEsta;
            return (
              <label key={a.id} className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer"
                style={{
                  background: novo ? "rgba(240,192,64,0.06)" : jaEsta ? "rgba(52,211,153,0.05)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${novo ? "rgba(240,192,64,0.2)" : jaEsta ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.06)"}`,
                }}>
                <input type="checkbox" checked={marcado} onChange={() => toggle(a.id)}
                  className="w-4 h-4 rounded accent-yellow-400" />
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: jaEsta ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.08)", color: jaEsta ? "#34d399" : "rgba(255,255,255,0.5)" }}>
                  {getInitials(a.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{a.name}</p>
                  <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {a.email}{a.internal_enrollment ? ` · Mat. ${a.internal_enrollment}` : ""}
                  </p>
                </div>
                {jaEsta && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0"
                    style={{ background: "rgba(52,211,153,0.12)", color: "#34d399" }}>
                    Já na turma
                  </span>
                )}
                {novo && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0"
                    style={{ background: "rgba(240,192,64,0.12)", color: "#f0c040" }}>
                    Novo
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}

      {/* Footer fixo */}
      {selectedTurma && novosParaVincular.length > 0 && (
        <div className="sticky bottom-0 pt-2 pb-1">
          <button onClick={handleSave} disabled={saving}
            className="w-full py-4 rounded-2xl font-bold text-base disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#f0c040,#eab308)", color: "#0a1638", fontFamily: "'Space Grotesk',sans-serif", boxShadow: "0 8px 32px rgba(240,192,64,0.35)" }}>
            {saving ? "Vinculando…" : `🔗 Vincular ${novosParaVincular.length} aluno${novosParaVincular.length !== 1 ? "s" : ""} à ${turmaAtual?.full_name}`}
          </button>
        </div>
      )}
    </div>
  );
}
