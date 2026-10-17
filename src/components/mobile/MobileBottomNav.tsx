"use client";

import React from "react";

export type MobileTab = "home" | "menu" | "meja" | "nota" | "lainnya";

interface MobileBottomNavProps {
  currentTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  occupiedTablesCount?: number;
  enableTables?: boolean;
}

export default function MobileBottomNav({
  currentTab,
  onTabChange,
  occupiedTablesCount = 0,
  enableTables = true,
}: MobileBottomNavProps) {
  const allTabs = [
    { id: "home" as MobileTab, label: "Home", icon: "/icons/icon-home.png" },
    { id: "menu" as MobileTab, label: "Menu", icon: "/icons/icon-kasir.png" },
    { id: "meja" as MobileTab, label: "Meja", icon: "/icons/icon-meja.png", badge: occupiedTablesCount > 0 ? occupiedTablesCount : undefined },
    { id: "nota" as MobileTab, label: "Nota", icon: "/icons/icon-transaksi.png" },
    { id: "lainnya" as MobileTab, label: "Lainnya", icon: "/icons/icon-pengaturan.png" },
  ];

  const tabs = enableTables ? allTabs : allTabs.filter(t => t.id !== "meja");

  return (
    <nav className={`fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-md border-t border-line z-30 px-2 py-1.5 grid ${enableTables ? 'grid-cols-5' : 'grid-cols-4'} items-center select-none`}>
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center min-h-[48px] py-1.5 rounded-xl text-[10px] font-bold transition-all relative ${
              isActive
                ? "text-accent-text font-black scale-105"
                : "text-muted hover:text-fg"
            }`}
          >
            <div className="relative text-lg leading-none mb-1 flex items-center justify-center">
              {tab.icon.startsWith("/") ? (
                <img src={tab.icon} alt={tab.label} className="w-5 h-5 object-contain" />
              ) : (
                <span>{tab.icon}</span>
              )}
              {tab.badge !== undefined && (
                <span className="absolute -top-1.5 -right-2 bg-amber-500 text-slate-900 font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                  {tab.badge}
                </span>
              )}
            </div>
            <span className="truncate w-full text-center leading-tight">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
