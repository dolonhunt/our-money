"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useNotifications } from "@/hooks/data";
import { NAV_ITEMS } from "./nav";
import { SyncBadge } from "./SyncBadge";
import { Avatar } from "@/components/ui/primitives";

/** Desktop left navigation with household header (PRD §12). */
export function Sidebar() {
  const pathname = usePathname();
  const { profile, logout } = useAuth();
  const { household, members } = useHousehold();
  const { items: notifications } = useNotifications(household?.id ?? null, profile?.uid ?? null);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col gap-5 p-5 lg:flex" aria-label="Main navigation">
      <div className="neu-card flex flex-col gap-4 p-5">
        {/* Couple / household header */}
        <Link href="/couple" className="flex items-center gap-3" aria-label="Open couple page">
          <span className="flex -space-x-2.5">
            {members.slice(0, 2).map((m, i) => (
              <Avatar key={m.uid} name={m.displayName} photoURL={m.photoURL} size={38} ring={i === 0 ? "mint" : "peach"} />
            ))}
            {members.length < 2 && <span className="neu-inset-sm flex h-[38px] w-[38px] items-center justify-center rounded-full text-faint">＋</span>}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-[15px] font-semibold text-ink">{household?.name ?? "Our Money"}</span>
            <span className="block text-[12px] text-sub">{members.length} member{members.length === 1 ? "" : "s"}</span>
          </span>
        </Link>
        <SyncBadge />
      </div>

      <nav className="neu-card flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="neu-nav-item"
              data-active={active}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={18} strokeWidth={active ? 2.4 : 2} aria-hidden />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge === "notifications" && unread > 0 && (
                <span className="neu-inset-sm flex h-6 min-w-6 items-center justify-center rounded-full bg-teal px-1.5 text-[11px] font-bold text-white" style={{ boxShadow: "none" }}>
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Profile section at bottom (PRD §12) */}
      <div className="neu-card flex items-center gap-3 p-4">
        <Avatar name={profile?.displayName ?? "?"} photoURL={profile?.photoURL} size={38} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{profile?.displayName}</p>
          <p className="truncate text-[12px] text-sub">{profile?.email}</p>
        </div>
        <button
          onClick={() => logout()}
          className="neu-btn !rounded-xl !p-2.5"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut size={16} aria-hidden />
        </button>
      </div>
    </aside>
  );
}
