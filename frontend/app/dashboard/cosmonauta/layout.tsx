"use client";

import DashboardLayout from "../_components/DashboardLayout";
import { type NavItem } from "../_components/SidebarNav";

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard/cosmonauta",             label: "Centro de Controle",   icon: "🛸" },
  { href: "/dashboard/cosmonauta/missoes",     label: "Minhas Missões",       icon: "🚀" },
  { href: "/dashboard/cosmonauta/expedicoes",  label: "Expedições",           icon: "📋", badge: 3 },
  { href: "/dashboard/cosmonauta/canal",       label: "Canal de Comunicação", icon: "💬", badge: 2 },
  { href: "/dashboard/cosmonauta/notas",       label: "Log de Desempenho",    icon: "⭐" },
  { href: "/dashboard/cosmonauta/loja",        label: "Loja Galáctica",       icon: "🛍️" },
  { href: "/dashboard/cosmonauta/comunicados", label: "Comunicados",          icon: "📢", badge: 1 },
  { href: "/dashboard/cosmonauta/livros",      label: "Meu Livro",            icon: "📚" },
];

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard/cosmonauta":             { title: "Centro de Controle",   subtitle: "Visão geral da sua missão educacional" },
  "/dashboard/cosmonauta/missoes":     { title: "Minhas Missões",       subtitle: "Trilhas de aprendizagem por disciplina" },
  "/dashboard/cosmonauta/expedicoes":  { title: "Expedições",           subtitle: "Atividades e provas disponíveis" },
  "/dashboard/cosmonauta/canal":       { title: "Canal de Comunicação", subtitle: "Rede social da sua turma" },
  "/dashboard/cosmonauta/notas":       { title: "Log de Desempenho",    subtitle: "Suas notas e progresso bimestral" },
  "/dashboard/cosmonauta/loja":        { title: "Loja Galáctica",       subtitle: "Troque seus Estelares por prêmios" },
  "/dashboard/cosmonauta/comunicados": { title: "Comunicados",          subtitle: "Mensagens e avisos da escola" },
  "/dashboard/cosmonauta/livros":      { title: "Meu Livro",            subtitle: "Material didático em PDF" },
};

export default function CosmonautaLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout
      allowedRoles={["aluno"]}
      navItems={NAV_ITEMS}
      pageTitles={PAGE_TITLES}
      fallbackTitleKey="/dashboard/cosmonauta"
      loadingEmoji="🛸"
      loadingText="Iniciando módulo de navegação..."
      notificationsCount={6}
    >
      {children}
    </DashboardLayout>
  );
}
