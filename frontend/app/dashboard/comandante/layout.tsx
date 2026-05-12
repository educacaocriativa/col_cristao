"use client";

import DashboardLayout from "../_components/DashboardLayout";
import { type NavItem } from "../_components/SidebarNav";

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard/comandante",                label: "Base de Operações",    icon: "🏛" },
  { href: "/dashboard/comandante/turmas",         label: "Turmas",               icon: "🚀" },
  { href: "/dashboard/comandante/disciplinas",    label: "Disciplinas",          icon: "📚" },
  { href: "/dashboard/comandante/cronograma",     label: "Cronograma",           icon: "📅" },
  { href: "/dashboard/comandante/professores",    label: "Professores",          icon: "👨‍🏫" },
  { href: "/dashboard/comandante/alunos",         label: "Alunos",               icon: "👨‍🚀" },
  { href: "/dashboard/comandante/vincular-alunos", label: "Vincular Alunos",      icon: "🔗" },
  { href: "/dashboard/comandante/loja",           label: "Loja Galáctica",       icon: "🛍️" },
  { href: "/dashboard/comandante/relatorios",     label: "Relatórios",           icon: "📊" },
  { href: "/dashboard/comandante/comunicados",    label: "Comunicados",          icon: "📢" },
  { href: "/dashboard/comandante/calendario",     label: "Calendário Escolar",   icon: "🗓" },
  { href: "/dashboard/comandante/livros",         label: "Meu Livro",            icon: "📖" },
  { href: "/dashboard/comandante/provas",         label: "Provas",               icon: "📄" },
];

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard/comandante":                { title: "Base de Operações",  subtitle: "Administração da unidade escolar" },
  "/dashboard/comandante/turmas":         { title: "Turmas",             subtitle: "Gestão de turmas e disciplinas" },
  "/dashboard/comandante/disciplinas":    { title: "Disciplinas",        subtitle: "Missões de conhecimento da unidade" },
  "/dashboard/comandante/professores":    { title: "Professores",        subtitle: "Corpo docente da unidade" },
  "/dashboard/comandante/alunos":            { title: "Alunos",             subtitle: "Cosmonautas matriculados" },
  "/dashboard/comandante/vincular-alunos":   { title: "Vincular Alunos",    subtitle: "Associe alunos às turmas" },
  "/dashboard/comandante/loja":        { title: "Loja Galáctica",     subtitle: "Produtos e compras dos alunos" },
  "/dashboard/comandante/relatorios":  { title: "Relatórios",         subtitle: "Relatórios de desempenho" },
  "/dashboard/comandante/comunicados": { title: "Comunicados",        subtitle: "Avisos para toda a comunidade" },
  "/dashboard/comandante/cronograma":   { title: "Cronograma de Aulas",subtitle: "Horário semanal e frequência por bimestre" },
  "/dashboard/comandante/calendario":  { title: "Calendário Escolar", subtitle: "Eventos e datas importantes" },
  "/dashboard/comandante/livros":      { title: "Meu Livro",          subtitle: "Material didático em PDF" },
  "/dashboard/comandante/provas":      { title: "Provas",             subtitle: "PDFs de provas disponíveis para baixar" },
};

export default function ComandanteLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout
      allowedRoles={["admin", "super_admin"]}
      navItems={NAV_ITEMS}
      pageTitles={PAGE_TITLES}
      fallbackTitleKey="/dashboard/comandante"
      loadingEmoji="🏛"
      loadingText="Acessando base de operações..."
      notificationsCount={5}
    >
      {children}
    </DashboardLayout>
  );
}
