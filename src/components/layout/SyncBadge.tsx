"use client";

import clsx from "clsx";
import { relativeShort } from "@/lib/syncTime";
import { useSyncStatus } from "@/hooks/useSyncStatus";

/** Live sync indicator: Synced / Updated just now / Reconnecting… (PRD §31). */
export function SyncBadge() {
  const { state, lastSyncAt } = useSyncStatus();
  const label =
    state === "reconnecting"
      ? "Reconnecting…"
      : state === "connecting"
        ? "Connecting…"
        : lastSyncAt
          ? relativeShort(lastSyncAt)
          : "Synced";
  return (
    <span
      className="neu-pill inline-flex items-center gap-2 !py-1.5 !px-3 text-[11.5px] font-semibold text-sub"
      role="status"
      aria-live="polite"
    >
      <span
        className={clsx(
          "h-2 w-2 rounded-full",
          state === "synced" && "animate-pulseDot bg-teal",
          state === "connecting" && "bg-faint",
          state === "reconnecting" && "animate-pulseDot bg-amber"
        )}
        aria-hidden
      />
      {state === "synced" && !lastSyncAt ? "● Live synced" : label}
    </span>
  );
}
