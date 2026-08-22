"use client";

import Link from "next/link";
import { Bell, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useNotifications } from "@/hooks/data";
import { useQuickAdd } from "@/contexts/QuickAddContext";
import { SyncBadge } from "./SyncBadge";
import { Avatar, NeuButton } from "@/components/ui/primitives";

/** Compact mobile top bar: household identity + sync + notifications + add. */
export function AppHeader() {
  const { profile } = useAuth();
  const { household, members } = useHousehold();
  const { items: notifications } = useNotifications(household?.id ?? null, profile?.uid ?? null);
  const unread = notifications.filter((n) => !n.read).length;
  const { open } = useQuickAdd();

  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 bg-bg/80 px-4 py-3 backdrop-blur-md lg:hidden" aria-label="App header">
      <Link href="/couple" className="flex min-w-0 items-center gap-2.5" aria-label="Open couple page">
        <span className="flex -space-x-2">
          {members.slice(0, 2).map((m, i) => (
            <Avatar key={m.uid} name={m.displayName} photoURL={m.photoURL} size={30} ring={i === 0 ? "mint" : "peach"} />
          ))}
          {members.length < 2 && <span className="neu-inset-sm flex h-[30px] w-[30px] items-center justify-center rounded-full text-[13px] text-faint">＋</span>}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-display text-[14px] font-semibold leading-tight text-ink">{household?.name ?? "Our Money"}</span>
          <SyncBadge />
        </span>
      </Link>
      <div className="ml-auto flex items-center gap-2">
        <Link
          href="/notifications"
          className="neu-btn relative !rounded-full !p-2.5"
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        >
          <Bell size={18} aria-hidden />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-peach px-1 text-[9.5px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
        <NeuButton variant="primary" size="sm" className="!rounded-full" onClick={() => open("expense")} aria-label="Quick add transaction">
          <Plus size={18} aria-hidden />
        </NeuButton>
      </div>
    </header>
  );
}
