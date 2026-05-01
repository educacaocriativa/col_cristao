"use client";

import DashboardLayout from "../_components/DashboardLayout";
import { type NavItem } from "../_components/SidebarNav";

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard/general",                      label: "Comando Central",     icon: "🌌" },
  { href: "/dashboard/general/unidades",             label: "Unidades da Rede",    icon: "🏛" },
  { href: "/dashboard/general/unidades-excluidas",   label: "Unidades Excluídas",  icon: "🗑" },
  { href: "/dashboard/general/usuarios",             label: "Usuários",            icon: "👥" },
  { href: "/dashboard/general/relatorios",           label: "Relatórios da Rede",  icon: "📊" },
  { href: "/dashboard/general/bncc",                 label: "BNCC / Currículo",    icon: "🎯" },
  { href: "/dashboard/general/livros",               label: "Livros",              icon: "📚" },
  { href: "/dashboard/general/config",               label: "Configurações",       icon: "⚙️" },
];

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard/general":                      { title: "Comando Central",    subtitle: "Visão global da rede Colégio Cristão" },
  "/dashboard/general/unidades":             { title: "Unidades da Rede",   subtitle: "Todas as unidades escolares" },
  "/dashboard/general/unidades-excluidas":   { title: "Unidades Excluídas", subtitle: "Unidades removidas — restaure quando precisar" },
  "/dashboard/general/usuarios":             { title: "Usuários",           subtitle: "Gestão de contas e acessos" },
  "/dashboard/general/relatorios":           { title: "Relatórios da Rede", subtitle: "Dados consolidados da rede" },
  "/dashboard/general/bncc":                 { title: "BNCC / Currículo",   subtitle: "Habilidades e competências" },
  "/dashboard/general/livros":               { title: "Livros",             subtitle: "Cadastre PDFs por unidade, ano e perfil" },
  "/dashboard/general/config":               { title: "Configurações",      subtitle: "Configurações globais da plataforma" },
};

export default function GeneralLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout
      allowedRoles={["super_admin"]}
      navItems={NAV_ITEMS}
      pageTitles={PAGE_TITLES}
      fallbackTitleKey="/dashboard/general"
      loadingEmoji="🌌"
      loadingText="Acessando Comando Central..."
      notificationsCount={7}
    >
      {children}
    </DashboardLayout>
  );
}
