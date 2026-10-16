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
  // Theme toggle deactivated by user design requirement (Clean Putih-Biru theme only)
  return null;
}
