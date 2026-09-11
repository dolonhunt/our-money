import { useMemo } from "react";
import Link from "next/link";
import { Bell, Calendar, Plus, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useNotifications } from "@/hooks/data";
import { useQuickAdd } from "@/contexts/QuickAddContext";
import { SyncBadge } from "./SyncBadge";
import { Avatar, NeuButton } from "@/components/ui/primitives";
import { CurrencySwitcher } from "@/components/currency/CurrencySwitcher";

/** Top bar: Mobile (household + add) and Desktop (search + notifications + profile) */
export function AppHeader() {
  const { profile } = useAuth();
  const { household, members } = useHousehold();
  const { items: notifications } = useNotifications(household?.id ?? null, profile?.uid ?? null);
  const unread = notifications.filter((n) => !n.read).length;
  const { open } = useQuickAdd();
  const currentMonthLabel = useMemo(() => {
    const now = new Date();
    return now.toLocaleString("en-US", { month: "long", year: "numeric" });
  }, []);

  return (
    <>
      {/* Mobile Header */}
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
          <CurrencySwitcher compact />
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

      {/* Desktop Header */}
      <header className="sticky top-0 z-40 hidden lg:flex items-center justify-between gap-4 bg-bg/90 px-8 py-4 backdrop-blur-md" aria-label="Desktop app header">
        <div className="flex-1 max-w-md">
          <button className="neu-pill flex w-full items-center justify-between text-faint hover:text-sub transition-colors !py-2.5 !px-4">
            <span className="flex items-center gap-2 text-sm">
              <Search size={16} />
              Search transactions, categories, or anything...
            </span>
            <span className="neu-inset-sm px-1.5 py-0.5 text-[10px] font-bold rounded">⌘K</span>
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <CurrencySwitcher />
          <div className="hidden md:flex neu-pill items-center px-4 py-2 gap-2 text-[13px] font-bold text-ink tracking-wide">
            <Calendar size={14} className="text-sub" aria-hidden />
            <span>{currentMonthLabel}</span>
          </div>

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

          <Link href="/settings" className="flex items-center gap-2 pl-2">
            <Avatar name={profile?.displayName ?? "?"} photoURL={profile?.photoURL} size={36} />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-ink leading-tight">{profile?.displayName?.split(" ")[0]}</span>
              <span className="text-[11px] text-teal font-semibold leading-tight">Live Synced</span>
            </div>
          </Link>
        </div>
      </header>
    </>
  );
}
