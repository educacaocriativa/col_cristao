"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clearSession, ROLE_LABELS, type UserRole } from "../../_lib/auth";
import { useRouter } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number;
}

interface SidebarNavProps {
  items: NavItem[];
  role: UserRole;
  userName: string;
  schoolName?: string;
  avatarInitials: string;
}

export default function SidebarNav({
  items,
  role,
  userName,
  schoolName,
  avatarInitials,
}: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  return (
    <aside
      className="flex flex-col h-full w-64 shrink-0"
      style={{
        background: "linear-gradient(180deg, #0a1638 0%, #0d1f4a 100%)",
        borderRight: "1px solid rgba(240,192,64,0.12)",
      }}
    >
      {/* Logo / escola */}
      <div
        className="flex items-center gap-3 px-5 py-5"
        style={{ borderBottom: "1px solid rgba(240,192,64,0.1)" }}
      >
        {/* Escudo mini */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-lg shrink-0"
          style={{ background: "linear-gradient(135deg, #f0c040, #eab308)", color: "#0a1638" }}
        >
          C
        </div>
        <div className="overflow-hidden">
          <p className="text-xs font-bold truncate" style={{ color: "#f0c040" }}>
            Colégio Cristão
          </p>
          {schoolName && (
            <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
              {schoolName}
            </p>
          )}
        </div>
      </div>

      {/* Avatar + perfil */}
      <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(240,192,64,0.08)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
            style={{ background: "rgba(240,192,64,0.15)", border: "2px solid rgba(240,192,64,0.4)", color: "#f0c040" }}
          >
            {avatarInitials}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold truncate text-white">{userName}</p>
            <p className="text-xs" style={{ color: "rgba(240,192,64,0.7)" }}>
              {ROLE_LABELS[role]}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative"
              style={{
                background: isActive ? "rgba(240,192,64,0.12)" : "transparent",
                color: isActive ? "#f0c040" : "rgba(255,255,255,0.6)",
              }}
            >
              {/* Active indicator */}
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                  style={{ background: "#f0c040" }}
                />
              )}
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-sm font-medium flex-1">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                  style={{ background: "#f0c040", color: "#0a1638" }}
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-5" style={{ borderTop: "1px solid rgba(240,192,64,0.08)" }}>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 mt-3"
          style={{ color: "rgba(255,255,255,0.35)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.1)";
            e.currentTarget.style.color = "#fca5a5";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "rgba(255,255,255,0.35)";
          }}
        >
          <span className="text-lg">🚪</span>
          <span className="text-sm font-medium">Encerrar Missão</span>
        </button>
      </div>
    </aside>
  );
}
