"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi, CloudOff, CheckCircle2 } from "lucide-react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOffline(false);
      setJustReconnected(true);
      const timer = setTimeout(() => {
        setJustReconnected(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setJustReconnected(false);
    };

    // Initial check
    if (!navigator.onLine) {
      setIsOffline(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline && !justReconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-[90] max-w-[92vw] sm:max-w-md w-full px-2 animate-bounce-subtle pointer-events-none"
    >
      <div
        className={`pointer-events-auto neu-card flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300 ${
          isOffline
            ? "border-amber/40 bg-surface/95 text-ink"
            : "border-teal/40 bg-surface/95 text-ink"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`neu-inset-sm flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              isOffline ? "text-orange" : "text-teal"
            }`}
          >
            {isOffline ? <WifiOff size={15} /> : <CheckCircle2 size={15} />}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-ink truncate">
              {isOffline ? "Offline Mode Active" : "Connection Restored"}
            </p>
            <p className="text-[11px] text-sub truncate">
              {isOffline
                ? "Viewing cached records. Edits will sync when online."
                : "Back online — your household changes are syncing."}
            </p>
          </div>
        </div>

        <span
          className={`neu-pill shrink-0 !py-1 !px-2 text-[10px] font-bold ${
            isOffline ? "!text-orange" : "!text-teal"
          }`}
        >
          {isOffline ? "Offline" : "Synced"}
        </span>
      </div>
    </div>
  );
}
