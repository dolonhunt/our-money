"use client";

import { AlertTriangle, LogOut, RefreshCw } from "lucide-react";
import { Logo } from "@/components/brand";
import { NeuButton } from "@/components/ui/primitives";
import { useAuth } from "@/contexts/AuthContext";

interface SafeErrorViewProps {
  onRetry?: () => void;
  message?: string;
}

export function SafeErrorView({ onRetry, message }: SafeErrorViewProps) {
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6" role="alert">
      <div className="neu-card flex w-full max-w-md flex-col items-center gap-5 p-8 text-center sm:p-10">
        <Logo size={48} />
        
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
          <AlertTriangle size={28} aria-hidden />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="font-display text-xl font-bold tracking-tight text-ink">
            Unable to load money space
          </h1>
          <p className="text-sm leading-relaxed text-sub">
            {message ||
              "A connection or permission error prevented loading your financial space. Your data is safe and untouched."}
          </p>
        </div>

        <div className="mt-2 flex w-full flex-col gap-3">
          {onRetry && (
            <NeuButton variant="primary" size="lg" onClick={onRetry} className="w-full">
              <RefreshCw size={16} aria-hidden /> Try again
            </NeuButton>
          )}
          <button
            type="button"
            onClick={logout}
            className="neu-btn inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-sub hover:text-ink"
          >
            <LogOut size={16} aria-hidden /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
