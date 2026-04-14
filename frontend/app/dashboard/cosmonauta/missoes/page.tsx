"use client";

import Link from "next/link";
import { trilhasApi } from "../../../_lib/api";
import { useQuery } from "../../../_lib/useQuery";

interface Trail {
  id: string;
  subject_id: string;
  subject_name: string;
  subject_color: string;
  subject_icon: string;
  step_count: number;
  completed_steps: number;
}

interface SubjectGroup {
  subject_id: string;
  subject_name: string;
  subject_color: string;
  subject_icon: string;
  trail_count: number;
  total_steps: number;
  completed_steps: number;
}

export default function MissoesPage() {
  const { data: trails, loading } = useQuery<Trail[]>(
    () => trilhasApi.list() as Promise<Trail[]>,
    []
  );

  // Group trails by subject
  const subjects: SubjectGroup[] = [];
  const seen = new Set<string>();
  for (const t of trails ?? []) {
    if (!seen.has(t.subject_id)) {
      seen.add(t.subject_id);
      const group = (trails ?? []).filter((x) => x.subject_id === t.subject_id);
      subjects.push({
        subject_id: t.subject_id,
        subject_name: t.subject_name,
        subject_color: t.subject_color,
        subject_icon: t.subject_icon,
        trail_count: group.length,
        total_steps: group.reduce((s, x) => s + Number(x.step_count), 0),
        completed_steps: group.reduce((s, x) => s + Number(x.completed_steps ?? 0), 0),
      });
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
          Escolha uma disciplina para ver suas trilhas de aprendizagem
        </p>
      </div>

      {loading && (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto"
            style={{ borderColor: "#f0c040", borderTopColor: "transparent" }} />
        </div>
      )}

      {!loading && subjects.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <span className="text-6xl">🌌</span>
          <p className="text-lg font-bold text-white">Nenhuma missão disponível ainda</p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Aguarde seu professor criar trilhas de aprendizagem para sua turma.
          </p>
        </div>
      )}

      {!loading && subjects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {subjects.map((subj) => {
            const progress = subj.total_steps > 0
              ? Math.round((subj.completed_steps / subj.total_steps) * 100)
              : 0;
            return (
              <Link
                key={subj.subject_id}
                href={`/dashboard/cosmonauta/missoes/${subj.subject_id}`}
                className="flex flex-col rounded-2xl overflow-hidden transition-all duration-200"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${subj.subject_color}25` }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = `${subj.subject_color}12`;
                  el.style.borderColor = `${subj.subject_color}50`;
                  el.style.transform = "translateY(-3px)";
                  el.style.boxShadow = `0 8px 24px ${subj.subject_color}20`;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = "rgba(255,255,255,0.03)";
                  el.style.borderColor = `${subj.subject_color}25`;
                  el.style.transform = "translateY(0)";
                  el.style.boxShadow = "none";
                }}
              >
                {/* Header */}
                <div className="px-5 py-5 flex items-center gap-3 relative overflow-hidden"
                  style={{ background: `${subj.subject_color}15` }}>
                  <div className="absolute right-0 bottom-0 opacity-10 text-6xl pointer-events-none select-none"
                    style={{ lineHeight: 1 }} aria-hidden="true">
                    {subj.subject_icon}
                  </div>
                  <span className="text-3xl relative z-10">{subj.subject_icon}</span>
                  <div className="relative z-10">
                    <h3 className="text-base font-bold text-white">{subj.subject_name}</h3>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                      {subj.trail_count} trilha{subj.trail_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {/* Body */}
                <div className="px-4 py-4 flex-1 space-y-3">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col items-center gap-1 p-2 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.05)" }}>
                      <span className="text-lg">🛤️</span>
                      <p className="text-sm font-bold text-white">{subj.trail_count}</p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)", fontSize: "10px" }}>Trilhas</p>
                    </div>
                    <div className="flex flex-col items-center gap-1 p-2 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.05)" }}>
                      <span className="text-lg">⭐</span>
                      <p className="text-sm font-bold text-white">{subj.total_steps}</p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)", fontSize: "10px" }}>Etapas</p>
                    </div>
                  </div>

                  {/* Progress */}
                  {subj.total_steps > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>Progresso</span>
                        <span className="text-xs font-bold" style={{ color: subj.subject_color }}>{progress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${progress}%`, background: subj.subject_color }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <div className="px-4 pb-4">
                  <div className="w-full py-2.5 rounded-xl text-center text-xs font-bold"
                    style={{ background: `${subj.subject_color}20`, color: subj.subject_color }}>
                    {progress > 0 ? "Continuar Missão →" : "Iniciar Missão →"}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
