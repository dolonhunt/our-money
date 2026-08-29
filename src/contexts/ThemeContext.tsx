"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ThemeChoice = "light" | "dark" | "system";

interface ThemeApi {
  choice: ThemeChoice;
  resolved: "light" | "dark";
  setChoice: (c: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeApi | null>(null);

export function useTheme(): ThemeApi {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(choice: ThemeChoice): "light" | "dark" {
  const resolved = choice === "system" ? (systemPrefersDark() ? "dark" : "light") : choice;
  document.documentElement.dataset.theme = resolved;
  return resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>("light");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = (localStorage.getItem("theme") as ThemeChoice | null) ?? "light";
    setChoiceState(stored);
    setResolved(applyTheme(stored));
  }, []);

  useEffect(() => {
    if (choice !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolved(applyTheme("system"));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [choice]);

  const setChoice = useCallback((c: ThemeChoice) => {
    localStorage.setItem("theme", c);
    setChoiceState(c);
    setResolved(applyTheme(c));
  }, []);

  const api = useMemo(() => ({ choice, resolved, setChoice }), [choice, resolved, setChoice]);
  return <ThemeContext.Provider value={api}>{children}</ThemeContext.Provider>;
}
