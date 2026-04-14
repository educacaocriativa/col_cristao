"use client";

import DashboardLayout from "../_components/DashboardLayout";
import { type NavItem } from "../_components/SidebarNav";

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard/piloto",                  label: "Centro de Controle",   icon: "🛸" },
  { href: "/dashboard/piloto/turmas",           label: "Meus Módulos",         icon: "🚀", badge: 3 },
  { href: "/dashboard/piloto/lista-chamada",    label: "Lista de Chamada",     icon: "📊" },
  { href: "/dashboard/piloto/trilhas",          label: "Trilhas",              icon: "🛤️" },
  { href: "/dashboard/piloto/atividades",       label: "Expedições",           icon: "📋" },
  { href: "/dashboard/piloto/materiais",        label: "Biblioteca Galáctica", icon: "📚" },
  { href: "/dashboard/piloto/diario",           label: "Diário de Bordo",      icon: "📔" },
];

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard/piloto":                 { title: "Centro de Controle",   subtitle: "Visão geral das suas turmas" },
  "/dashboard/piloto/turmas":          { title: "Meus Módulos",         subtitle: "Turmas e disciplinas sob seu comando" },
  "/dashboard/piloto/lista-chamada":   { title: "Lista de Chamada",     subtitle: "Frequência completa por turma" },
  "/dashboard/piloto/trilhas":         { title: "Trilhas",              subtitle: "Trilhas de aprendizagem estilo Duolingo" },
  "/dashboard/piloto/atividades":      { title: "Expedições",           subtitle: "Gerencie atividades, provas e simulados" },
  "/dashboard/piloto/materiais":       { title: "Biblioteca Galáctica", subtitle: "Videoaulas e PDFs por disciplina" },
  "/dashboard/piloto/diario":          { title: "Diário de Bordo",      subtitle: "Registros pedagógicos diários" },
};

export default function PilotoLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout
      allowedRoles={["professor", "pedagogico", "admin", "super_admin"]}
      navItems={NAV_ITEMS}
      pageTitles={PAGE_TITLES}
      fallbackTitleKey="/dashboard/piloto"
      loadingEmoji="🚀"
      loadingText="Preparando cabine do piloto..."
      notificationsCount={2}
    >
      {children}
    </DashboardLayout>
  );
}
