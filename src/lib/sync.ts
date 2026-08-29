/**
 * Tiny sync event bus: data hooks ping markSynced() on every realtime
 * snapshot; the SyncBadge renders "Synced / Updated just now / Reconnecting…"
 * from it plus navigator.onLine (PRD §31).
 */

type Listener = () => void;

const listeners = new Set<Listener>();
let lastSyncAt: number | null = null;

export function markSynced(): void {
  lastSyncAt = Date.now();
  listeners.forEach((l) => l());
}

export function subscribeSync(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLastSyncAt(): number | null {
  return lastSyncAt;
}
