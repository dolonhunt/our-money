"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getLastSyncAt, subscribeSync } from "@/lib/sync";

export type SyncState = "connecting" | "synced" | "reconnecting";

export function useSyncStatus(): { state: SyncState; lastSyncAt: number | null } {
  const lastSyncAt = useSyncExternalStore(subscribeSync, getLastSyncAt, () => null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  const state: SyncState = !online ? "reconnecting" : lastSyncAt ? "synced" : "connecting";
  return { state, lastSyncAt };
}
