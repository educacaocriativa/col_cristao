"use client";

import { useState } from "react";

interface TopBarProps {
  title: string;
  subtitle?: string;
  notificationsCount?: number;
}

export default function TopBar({ title, subtitle, notificationsCount = 0 }: TopBarProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header
      className="flex items-center justify-between px-6 py-4 shrink-0 relative"
      style={{
        background: "rgba(10,22,56,0.8)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(240,192,64,0.08)",
        zIndex: 40,
      }}
    >
      {/* Title */}
      <div>
        <h1
          className="text-lg font-bold"
          style={{ color: "#ffffff", fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150"
          style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(240,192,64,0.1)"; e.currentTarget.style.color = "#f0c040"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
          aria-label="Pesquisar"
        >
          🔍
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 relative"
            style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(240,192,64,0.1)"; e.currentTarget.style.color = "#f0c040"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
            aria-label="Notificações"
          >
            🔔
            {notificationsCount > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: "#f0c040", color: "#0a1638", fontSize: "9px" }}
              >
                {notificationsCount > 9 ? "9+" : notificationsCount}
              </span>
            )}
          </button>

          {/* Dropdown de notificações */}
          {showNotifications && (
            <div
              className="absolute right-0 top-11 w-72 rounded-2xl z-50 overflow-hidden"
              style={{
                background: "#0d1f4a",
                border: "1px solid rgba(240,192,64,0.2)",
                boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
              }}
            >
              <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(240,192,64,0.1)" }}>
                <p className="text-sm font-semibold" style={{ color: "#f0c040" }}>
                  Transmissões Recebidas
                </p>
              </div>
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                {[
                  { icon: "📋", text: "Nova atividade de Matemática disponível", time: "há 10 min" },
                  { icon: "📢", text: "Reunião de pais na sexta-feira", time: "há 1 hora" },
                  { icon: "⭐", text: "Nota da prova de Português lançada", time: "há 2 horas" },
                ].map((n, i) => (
                  <div key={i} className="flex gap-3 px-4 py-3 transition-colors duration-150 cursor-pointer"
                    style={{ color: "rgba(255,255,255,0.7)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span className="text-base shrink-0 mt-0.5">{n.icon}</span>
                    <div>
                      <p className="text-xs">{n.text}</p>
                      <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5">
                <button className="w-full text-xs font-medium py-2 rounded-lg transition-colors duration-150"
                  style={{ color: "#f0c040", background: "rgba(240,192,64,0.08)" }}
                >
                  Ver todas as transmissões
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
