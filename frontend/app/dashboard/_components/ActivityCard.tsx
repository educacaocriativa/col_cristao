"use client";

import Link from "next/link";
import { type Activity } from "./mockData";

const TYPE_CONFIG = {
  prova:     { label: "Prova",     icon: "📝", bg: "rgba(239,68,68,0.15)",   color: "#f87171" },
  atividade: { label: "Atividade", icon: "📋", bg: "rgba(59,130,246,0.15)",  color: "#60a5fa" },
  simulado:  { label: "Simulado",  icon: "🎯", bg: "rgba(245,158,11,0.15)",  color: "#fbbf24" },
  tarefa:    { label: "Tarefa",    icon: "✏️", bg: "rgba(16,185,129,0.15)",  color: "#34d399" },
  leitura:   { label: "Leitura",   icon: "📖", bg: "rgba(139,92,246,0.15)",  color: "#a78bfa" },
};

const STATUS_CONFIG = {
  pending:     { label: "Pendente",    color: "#fbbf24" },
  in_progress: { label: "Em Andamento",color: "#60a5fa" },
  completed:   { label: "Concluída",   color: "#34d399" },
  late:        { label: "Atrasada",    color: "#f87171" },
};

interface ActivityCardProps {
  activity: Activity;
  compact?: boolean;
}

function formatDueDate(dateStr: string, time?: string): { text: string; urgent: boolean } {
  const due = new Date(dateStr + (time ? `T${time}` : "T23:59:00"));
  const now  = new Date();
  const diff = due.getTime() - now.getTime();
  const hours = diff / (1000 * 60 * 60);
  const days  = diff / (1000 * 60 * 60 * 24);

  if (diff < 0)      return { text: "Prazo encerrado", urgent: true };
  if (hours < 2)     return { text: `${Math.round(hours * 60)} min restantes`, urgent: true };
  if (hours < 24)    return { text: `${Math.round(hours)}h restantes`, urgent: true };
  if (days  < 3)     return { text: `${Math.ceil(days)} dias restantes`, urgent: true };

  const d = due.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return { text: time ? `${d} às ${time}` : d, urgent: false };
}

export default function ActivityCard({ activity, compact = false }: ActivityCardProps) {
  const typeConf   = TYPE_CONFIG[activity.type];
  const statusConf = STATUS_CONFIG[activity.status];
  const due        = formatDueDate(activity.dueDate, activity.dueTime);

  if (compact) {
    return (
      <Link
        href={`/dashboard/cosmonauta/expedicoes/${activity.id}`}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
      >
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
          style={{ background: typeConf.bg }}
        >
          {typeConf.icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate text-white">{activity.title}</p>
          <p className="text-xs truncate" style={{ color: activity.subjectColor }}>
            {activity.subject}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-medium" style={{ color: due.urgent ? "#f87171" : "rgba(255,255,255,0.4)" }}>
            {due.text}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/dashboard/cosmonauta/expedicoes/${activity.id}`}
      className="block rounded-2xl p-4 transition-all duration-200 group"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
        (e.currentTarget as HTMLElement).style.borderColor = `${activity.subjectColor}40`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
            style={{ background: typeConf.bg }}
          >
            {typeConf.icon}
          </span>
          <div>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: typeConf.bg, color: typeConf.color }}
            >
              {typeConf.label}
            </span>
          </div>
        </div>
        <span
          className="text-xs font-medium px-2 py-1 rounded-full"
          style={{ background: `${statusConf.color}15`, color: statusConf.color }}
        >
          {statusConf.label}
        </span>
      </div>

      <h3 className="text-sm font-semibold text-white mb-1 line-clamp-2">{activity.title}</h3>

      <div className="flex items-center gap-1.5 mb-3">
        <span className="w-2 h-2 rounded-full" style={{ background: activity.subjectColor }} />
        <span className="text-xs" style={{ color: activity.subjectColor }}>{activity.subject}</span>
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>•</span>
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          {activity.maxScore} pts
        </span>
        {activity.timeLimitMinutes && (
          <>
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>•</span>
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              ⏱ {activity.timeLimitMinutes} min
            </span>
          </>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span
          className="text-xs font-medium"
          style={{ color: due.urgent ? "#f87171" : "rgba(255,255,255,0.4)" }}
        >
          {due.urgent ? "⚠️ " : "📅 "}{due.text}
        </span>
        <span
          className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors duration-150"
          style={{ background: "#f0c040", color: "#0a1638" }}
        >
          Acessar →
        </span>
      </div>
    </Link>
  );
}
