"use client";

import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

export function getInitialTheme(): Theme {
  return "light"; // Enforce Clean Putih-Biru theme
}

export function applyTheme(_theme: Theme = "light") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("dark");
  root.classList.add("light");
  root.style.colorScheme = "light";
  try {
    localStorage.setItem("sakunota_theme", "light");
    localStorage.setItem("theme", "light");
  } catch (_) {}
}

export function useTheme() {
  const [theme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    applyTheme("light");
  }, []);

  const toggleTheme = () => {
    applyTheme("light");
  };

  return {
    theme: "light" as Theme,
    isDark: false,
    toggleTheme,
    setTheme: (_t: Theme) => {
      applyTheme("light");
    },
    mounted,
  };
}
