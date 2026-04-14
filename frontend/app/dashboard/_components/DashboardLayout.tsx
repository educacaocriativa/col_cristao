"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getStoredUser, isImpersonating, getOriginalUser, stopImpersonation, ROLE_DASHBOARD, type AuthUser, type UserRole } from "../../_lib/auth";
import SidebarNav, { type NavItem } from "./SidebarNav";
import TopBar from "./TopBar";
import { getInitials, getDeepestPageTitle } from "../_lib/dashboardUtils";

interface DashboardLayoutProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  navItems: NavItem[];
  pageTitles: Record<string, { title: string; subtitle: string }>;
  fallbackTitleKey: string;
  loadingEmoji: string;
  loadingText: string;
  notificationsCount?: number;
}

export default function DashboardLayout({
  children,
  allowedRoles,
  navItems,
  pageTitles,
  fallbackTitleKey,
  loadingEmoji,
  loadingText,
  notificationsCount = 0,
}: DashboardLayoutProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user, setUser]           = useState<AuthUser | null>(null);
  const [impersonating, setImpersonating] = useState(false);
  const [originalUser, setOriginalUser]   = useState<AuthUser | null>(null);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored || !allowedRoles.includes(stored.role as UserRole)) {
      router.replace("/login");
      return;
    }
    setUser(stored);
    setImpersonating(isImpersonating());
    setOriginalUser(getOriginalUser());
  }, [router, allowedRoles]);

  function handleStopImpersonation() {
    stopImpersonation();
    const orig = getOriginalUser() ?? getStoredUser();
    // After stop, stored user is restored — navigate to super_admin dashboard
    router.push(ROLE_DASHBOARD["super_admin"]);
  }

  if (!user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #0a1638 0%, #1b3a8f 100%)" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="text-5xl animate-bounce">{loadingEmoji}</div>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{loadingText}</p>
        </div>
      </div>
    );
  }

  const pageInfo = getDeepestPageTitle(pathname, pageTitles, fallbackTitleKey);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#060f2b" }}>
      <SidebarNav
        items={navItems}
        role={user.role as UserRole}
        userName={user.name}
        schoolName={user.schoolName}
        avatarInitials={getInitials(user.name)}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        {impersonating && (
          <div className="flex items-center justify-between px-4 py-2 shrink-0"
            style={{ background: "rgba(248,113,113,0.15)", borderBottom: "1px solid rgba(248,113,113,0.3)" }}>
            <p className="text-xs" style={{ color: "#fca5a5" }}>
              👤 Acessando como <strong>{user?.name}</strong> — {originalUser?.name} (Super Admin) está observando
            </p>
            <button
              onClick={handleStopImpersonation}
              className="text-xs font-bold px-3 py-1 rounded-lg"
              style={{ background: "rgba(240,192,64,0.15)", color: "#f0c040", border: "1px solid rgba(240,192,64,0.3)" }}>
              ← Voltar ao Super Admin
            </button>
          </div>
        )}
        <TopBar
          title={pageInfo.title}
          subtitle={pageInfo.subtitle}
          notificationsCount={notificationsCount}
        />
        <main
          className="flex-1 overflow-y-auto"
          style={{ background: "linear-gradient(180deg, #080e28 0%, #060f2b 100%)" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
