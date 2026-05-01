"use client";

import DashboardLayout from "../_components/DashboardLayout";
import { type NavItem } from "../_components/SidebarNav";

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard/navegador",               label: "Centro de Navegação",  icon: "🧭" },
  { href: "/dashboard/navegador/turmas",         label: "Turmas e Módulos",     icon: "🚀" },
  { href: "/dashboard/navegador/desempenho",     label: "Desempenho IA",        icon: "📊" },
  { href: "/dashboard/navegador/atividades",     label: "Expedições",           icon: "📋" },
  { href: "/dashboard/navegador/comunicados",    label: "Comunicados",          icon: "📢" },
  { href: "/dashboard/navegador/bncc",           label: "BNCC e Habilidades",   icon: "🎯" },
  { href: "/dashboard/navegador/livros",         label: "Meu Livro",            icon: "📖" },
];

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard/navegador":            { title: "Centro de Navegação",  subtitle: "Visão pedagógica da missão" },
  "/dashboard/navegador/turmas":     { title: "Turmas e Módulos",     subtitle: "Acompanhe todas as turmas" },
  "/dashboard/navegador/desempenho": { title: "Desempenho IA",        subtitle: "Análise de desempenho por IA" },
  "/dashboard/navegador/atividades": { title: "Expedições",           subtitle: "Atividades de todas as turmas" },
  "/dashboard/navegador/comunicados":{ title: "Comunicados",          subtitle: "Avisos e comunicações" },
  "/dashboard/navegador/bncc":       { title: "BNCC e Habilidades",   subtitle: "Mapeamento curricular" },
  "/dashboard/navegador/livros":     { title: "Meu Livro",            subtitle: "Material didático em PDF" },
};

export default function NavegadorLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout
      allowedRoles={["pedagogico", "admin", "super_admin"]}
      navItems={NAV_ITEMS}
      pageTitles={PAGE_TITLES}
      fallbackTitleKey="/dashboard/navegador"
      loadingEmoji="🧭"
      loadingText="Calibrando instrumentos de navegação..."
      notificationsCount={3}
    >
      {children}
    </DashboardLayout>
  );
}
