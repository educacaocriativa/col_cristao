"use client";

import Link from "next/link";
import { ROLE_ICONS, ROLE_LABELS, type UserRole } from "../../_lib/auth";

type Props = {
  role: UserRole;
  title?: string;
  description?: string;
  primaryActionHref?: string;
  primaryActionLabel?: string;
};

const DEFAULT_MESSAGES: Record<UserRole, { title: string; description: string }> = {
  super_admin: {
    title: "Sua rede está pronta para decolar",
    description: "Cadastre unidades e gestores para começar a acompanhar indicadores da rede.",
  },
  admin: {
    title: "Sua base orbital está pronta",
    description: "Cadastre turmas, professores e alunos para ativar os painéis desta unidade.",
  },
  pedagogico: {
    title: "Aguardando dados das turmas",
    description: "Quando as turmas e diários de classe forem alimentados pelos professores, eles aparecerão aqui.",
  },
  professor: {
    title: "Seu cockpit está pronto",
    description: "Assim que a coordenação vincular turmas ao seu perfil, elas aparecerão aqui.",
  },
  aluno: {
    title: "Sua jornada está sendo preparada",
    description: "Quando o professor publicar atividades e materiais, eles aparecerão neste painel.",
  },
  pais: {
    title: "Acompanhamento em preparação",
    description: "Assim que a unidade vincular o aluno ao seu perfil, o acompanhamento aparecerá aqui.",
  },
};

export default function NonDemoPlaceholder({
  role,
  title,
  description,
  primaryActionHref,
  primaryActionLabel,
}: Props) {
  const defaults = DEFAULT_MESSAGES[role];
  return (
    <div className="p-6">
      <div
        className="rounded-3xl flex flex-col items-center text-center py-16 px-6"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(240,192,64,0.15)",
        }}
      >
        <div className="text-6xl mb-4">{ROLE_ICONS[role]}</div>
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-2"
          style={{ color: "rgba(240,192,64,0.8)" }}
        >
          {ROLE_LABELS[role]}
        </p>
        <h2
          className="text-2xl font-bold text-white max-w-md"
          style={{ fontFamily: "'Space Grotesk',sans-serif" }}
        >
          {title ?? defaults.title}
        </h2>
        <p
          className="text-sm mt-2 max-w-md"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          {description ?? defaults.description}
        </p>
        {primaryActionHref && primaryActionLabel && (
          <Link
            href={primaryActionHref}
            className="mt-6 px-6 py-3 rounded-xl font-bold text-sm"
            style={{
              background: "linear-gradient(135deg,#f0c040,#eab308)",
              color: "#0a1638",
              fontFamily: "'Space Grotesk',sans-serif",
            }}
          >
            {primaryActionLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
