"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { turmasApi } from "../../../../_lib/api";
import { useQuery } from "../../../../_lib/useQuery";
import { getInitials } from "../../../_lib/dashboardUtils";

interface Subject {
  id: string;
  subject_id: string;
  name: string;
  color: string;
  icon: string;
  teacher_name: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  internal_enrollment: string;
  birth_date: string;
}

interface TurmaDetail {
  id: string;
  name: string;
  full_name: string;
  shift: string;
  grade_level_name: string;
  segment: string;
  school_name: string;
  academic_year: number;
  subjects: Subject[];
  students: Student[];
  studentCount: number;
}

export default function TurmaDetailPage({ params }: { params: Promise<{ turmaId: string }> }) {
  const { turmaId } = use(params);
  const router = useRouter();

  const { data: turma, loading, error } = useQuery<TurmaDetail>(
    () => turmasApi.get(turmaId) as Promise<TurmaDetail>,
    [turmaId]
  );

  const actions = [
    { href: `/dashboard/piloto/turmas/${turmaId}/chamada`, icon: "📋", label: "Chamada",    color: "#f0c040", bg: "rgba(240,192,64,0.12)"  },
    { href: `/dashboard/piloto/turmas/${turmaId}/notas`,   icon: "⭐", label: "Notas",      color: "#34d399", bg: "rgba(52,211,153,0.12)"  },
    { href: `/dashboard/piloto/turmas/${turmaId}/diario`,  icon: "📔", label: "Diário",     color: "#a78bfa", bg: "rgba(139,92,246,0.12)"  },
    { href: `/dashboard/piloto/atividades/nova`,           icon: "✏️", label: "Nova Ativ.", color: "#60a5fa", bg: "rgba(59,130,246,0.12)"  },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto"
            style={{ borderColor: "#f0c040", borderTopColor: "transparent" }} />
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Carregando turma…</p>
        </div>
      </div>
    );
  }

  if (error || !turma) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <span className="text-5xl">🌌</span>
        <p className="text-white font-semibold">{error || "Turma não encontrada."}</p>
        <button onClick={() => router.back()} className="text-sm px-4 py-2 rounded-xl"
          style={{ background: "rgba(240,192,64,0.15)", color: "#f0c040" }}>
          ← Voltar
        </button>
      </div>
    );
  }

  const firstSubject = turma.subjects[0];
  const subjectColor = firstSubject?.color || "#f0c040";
  const subjectIcon  = firstSubject?.icon || "📚";

  return (
    <div className="p-6 space-y-6">
      {/* Back + header */}
      <div>
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-xs mb-3"
          style={{ color: "rgba(255,255,255,0.4)" }}>
          ← Turmas
        </button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: `${subjectColor}20` }}>
            {subjectIcon}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
              {turma.full_name}
            </h1>
            <p className="text-sm" style={{ color: subjectColor }}>
              {turma.shift} · {turma.school_name}
            </p>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: "👨‍🚀", label: "Alunos",      value: turma.studentCount,           color: "#60a5fa" },
          { icon: "📚", label: "Disciplinas", value: turma.subjects.length,         color: "#f0c040" },
          { icon: "🏫", label: "Segmento",    value: turma.segment.split(" ")[0],   color: "#a78bfa" },
          { icon: "📅", label: "Ano Letivo",  value: turma.academic_year || "—",    color: "#34d399" },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center py-4 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="text-xl mb-1">{s.icon}</span>
            <p className="text-xl font-bold leading-none" style={{ color: s.color, fontFamily: "'Space Grotesk',sans-serif" }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map((a) => (
          <Link key={a.href} href={a.href}
            className="flex flex-col items-center gap-2 py-4 rounded-2xl text-sm font-semibold transition-all duration-200"
            style={{ background: a.bg, color: a.color, border: `1px solid ${a.color}25` }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
            <span className="text-2xl">{a.icon}</span>
            {a.label}
          </Link>
        ))}
      </div>

      {/* Subjects */}
      {turma.subjects.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <span>📚</span> Disciplinas
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {turma.subjects.map((sub) => (
              <div key={sub.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: `${sub.color || "#f0c040"}12`, border: `1px solid ${sub.color || "#f0c040"}25` }}>
                <span className="text-lg">{sub.icon || "📚"}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{sub.name}</p>
                  <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{sub.teacher_name}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Students */}
      <section>
        <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <span>👨‍🚀</span> Cosmonautas da Turma
          <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
            style={{ background: "rgba(240,192,64,0.15)", color: "#f0c040" }}>
            {turma.students.length}
          </span>
        </h2>
        <div className="space-y-2">
          {turma.students.map((st) => (
            <div key={st.id}
              className="flex items-center gap-4 px-4 py-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: `${subjectColor}25`, color: subjectColor }}>
                {getInitials(st.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{st.name}</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Mat. {st.internal_enrollment}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
