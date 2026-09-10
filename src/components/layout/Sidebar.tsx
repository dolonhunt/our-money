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
      <div className="flex items-center gap-2 px-3 pt-2">
        <div className="relative flex h-7 w-9 items-center justify-center">
          <div className="absolute left-0 h-6 w-6 rounded-full bg-mint mix-blend-multiply opacity-90"></div>
          <div className="absolute right-0 h-6 w-6 rounded-full bg-teal mix-blend-multiply opacity-90"></div>
        </div>
        <span className="font-display text-lg font-bold tracking-tight text-ink">Our Money</span>
      </div>

      <nav className="neu-card flex flex-1 flex-col overflow-y-auto p-3">
        {(() => {
          const groups: Record<string, typeof NAV_ITEMS> = {};
          NAV_ITEMS.forEach(item => {
            const g = item.group || "none";
            if (!groups[g]) groups[g] = [];
            groups[g].push(item);
          });
          
          return Object.entries(groups).map(([group, items], i) => (
            <div key={group} className={i > 0 && group !== "Together" ? "mt-5" : (group === "Together" ? "mt-3" : "")}>
              {group === "Together" && (
                <div className="my-4 mx-2 h-px bg-line opacity-50" />
              )}
              {group !== "none" && (
                <div className="mb-2 px-3 text-[10.5px] font-bold uppercase tracking-[0.15em] text-faint">
                  {group}
                </div>
              )}
              <div className="flex flex-col gap-1">
                {items.map((item) => {
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
              </div>
            </div>
          ));
        })()}
      </nav>

      {/* Couple Identity Card at bottom (PRD §12, Phase 1 Dashboard) */}
      <div className="neu-card flex flex-col gap-4 p-5">
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
        <div className="flex items-center justify-between">
          <SyncBadge />
          <button
            onClick={() => logout()}
            className="text-[12px] font-semibold text-sub hover:text-ink transition-colors"
            aria-label="Sign out"
            title="Sign out"
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
