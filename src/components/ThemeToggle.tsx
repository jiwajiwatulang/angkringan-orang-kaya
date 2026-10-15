"use client";

import React from "react";
import { useTheme } from "@/lib/theme";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export default function ThemeToggle({
  className = "",
  showLabel = false,
  size = "md",
}: ThemeToggleProps) {
  const { isDark, toggleTheme, mounted } = useTheme();

  const baseSize = size === "sm" ? "p-1.5 text-xs" : "p-2 text-sm";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      title={isDark ? "Mode Terang (Light Mode)" : "Mode Gelap (Dark Mode)"}
      className={`rounded-xl border border-line bg-surface hover:bg-card text-fg active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm ${baseSize} ${className}`}
    >
      <span className="leading-none select-none">
        {!mounted ? "☀️" : isDark ? "☀️" : "🌙"}
      </span>
      {showLabel && (
        <span className="text-xs font-bold leading-none select-none">
          {!mounted ? "Tema" : isDark ? "Terang" : "Gelap"}
        </span>
      )}
    </button>
  );
}
