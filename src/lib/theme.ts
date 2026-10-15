"use client";

import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

export function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const saved = localStorage.getItem("sakunota_theme") || localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch (_) {}
  return "dark"; // Default is dark (Dark Blue Pro)
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "light") {
    root.classList.remove("dark");
    root.classList.add("light");
    root.style.colorScheme = "light";
  } else {
    root.classList.add("dark");
    root.classList.remove("light");
    root.style.colorScheme = "dark";
  }
  try {
    localStorage.setItem("sakunota_theme", theme);
    localStorage.setItem("theme", theme);
  } catch (_) {}
  window.dispatchEvent(new CustomEvent("sakunota-theme-change", { detail: theme }));
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const initial = getInitialTheme();
    setThemeState(initial);
    applyTheme(initial);

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<Theme>;
      if (customEvent.detail) {
        setThemeState(customEvent.detail);
      }
    };

    window.addEventListener("sakunota-theme-change", handleThemeChange);
    return () => window.removeEventListener("sakunota-theme-change", handleThemeChange);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setThemeState(next);
    applyTheme(next);
  };

  return {
    theme,
    isDark: theme === "dark",
    toggleTheme,
    setTheme: (t: Theme) => {
      setThemeState(t);
      applyTheme(t);
    },
    mounted,
  };
}
