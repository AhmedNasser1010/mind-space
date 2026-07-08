"use client";

import { useCallback, useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const select = useCallback(
    (mode: "light" | "dark") => {
      setTheme(mode);
    },
    [setTheme],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = theme === "system" ? resolvedTheme : theme;
  const Icon = mounted && activeTheme === "dark" ? Moon : Sun;

  return (
    <button
      onClick={() => select(activeTheme === "dark" ? "light" : "dark")}
      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      title="Toggle theme"
      aria-label="Toggle theme"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
