"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { TransactionType } from "@/types";

export type QuickAddKind = TransactionType | "bill" | "contribution" | "menu";

interface QuickAddApi {
  open: (kind?: QuickAddKind) => void;
  close: () => void;
  kind: QuickAddKind | null;
}

const QuickAddContext = createContext<QuickAddApi | null>(null);

export function useQuickAdd(): QuickAddApi {
  const ctx = useContext(QuickAddContext);
  if (!ctx) throw new Error("useQuickAdd must be used within QuickAddProvider");
  return ctx;
}

export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [kind, setKind] = useState<QuickAddKind | null>(null);
  const open = useCallback((k: QuickAddKind = "menu") => setKind(k), []);
  const close = useCallback(() => setKind(null), []);
  const api = useMemo(() => ({ open, close, kind }), [open, close, kind]);
  return <QuickAddContext.Provider value={api}>{children}</QuickAddContext.Provider>;
}
