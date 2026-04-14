"use client";

import DashboardLayout from "../_components/DashboardLayout";
import { type NavItem } from "../_components/SidebarNav";

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard/controle",              label: "Central da Missão",    icon: "🏠" },
  { href: "/dashboard/controle/notas",        label: "Boletim Escolar",      icon: "📊" },
  { href: "/dashboard/controle/frequencia",   label: "Frequência",           icon: "📅" },
  { href: "/dashboard/controle/comunicados",  label: "Comunicados",          icon: "📢", badge: 2 },
  { href: "/dashboard/controle/canal",        label: "Canal da Escola",      icon: "💬" },
];

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard/controle":             { title: "Central da Missão",    subtitle: "Acompanhe a jornada do seu cosmonauta" },
  "/dashboard/controle/notas":       { title: "Boletim Escolar",      subtitle: "Notas e desempenho por bimestre" },
  "/dashboard/controle/frequencia":  { title: "Frequência",           subtitle: "Presença e faltas registradas" },
  "/dashboard/controle/comunicados": { title: "Comunicados",          subtitle: "Avisos e informações da escola" },
  "/dashboard/controle/canal":       { title: "Canal da Escola",      subtitle: "Comunicação com professores e equipe" },
};

export default function ControleLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout
      allowedRoles={["pais"]}
      navItems={NAV_ITEMS}
      pageTitles={PAGE_TITLES}
      fallbackTitleKey="/dashboard/controle"
      loadingEmoji="🌍"
      loadingText="Conectando ao Controle de Missão..."
      notificationsCount={2}
    >
      {children}
    </DashboardLayout>
  );
}
