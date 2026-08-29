"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Wallet } from "lucide-react";
import { NAV_ITEMS } from "./nav";
import { useNotifications } from "@/hooks/data";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuickAdd } from "@/contexts/QuickAddContext";

/**
 * Mobile bottom navigation: Home | Money | + | Goals | More (PRD §13).
 * The center + opens the quick-add sheet.
 */
export function MobileNav() {
  const pathname = usePathname();
  const { open } = useQuickAdd();
  const { household } = useHousehold();
  const { profile } = useAuth();
  const { items: notifications } = useNotifications(household?.id ?? null, profile?.uid ?? null);
  const unread = notifications.filter((n) => !n.read).length;
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = NAV_ITEMS.filter((n) => n.primary);
  const home = primary[0];
  const money = primary[1];
  const goals = primary[2];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <AnimatePresence>
        {moreOpen && (
          <motion.button
            className="fixed inset-0 z-[60] bg-[rgba(38,50,56,0.35)] backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {moreOpen && (
          <motion.nav
            aria-label="More pages"
            className="fixed inset-x-3 bottom-[92px] z-[70] lg:hidden"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 18, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="neu-card grid grid-cols-3 gap-1.5 p-3">
              {NAV_ITEMS.filter((n) => !n.primary).map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="neu-nav-item !flex-col !gap-1.5 !px-2 !py-3 text-center text-[11.5px]"
                    data-active={isActive(item.href)}
                  >
                    <span className="relative">
                      <Icon size={20} aria-hidden />
                      {item.badge === "notifications" && unread > 0 && (
                        <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-teal px-1 text-[9.5px] font-bold text-white">
                          {unread > 9 ? "9+" : unread}
                        </span>
                      )}
                    </span>
                    <span className="w-full truncate">{item.label.split(" ")[0]}</span>
                  </Link>
                );
              })}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      <nav
        className="fixed inset-x-0 bottom-0 z-[75] flex items-stretch justify-around gap-1 px-3 pb-[max(env(safe-area-inset-bottom),10px)] pt-1 lg:hidden"
        aria-label="Mobile navigation"
      >
        <div className="neu-card flex w-full max-w-md items-stretch justify-around gap-1 !rounded-[26px] p-2">
          <NavTab href={home.href} label={home.label} icon={<home.icon size={20} />} active={isActive(home.href)} />
          <NavTab href={money.href} label="Money" icon={<money.icon size={20} />} active={isActive(money.href)} />
          <button
            onClick={() => open()}
            className="neu-btn-primary relative -mt-7 flex h-14 w-14 shrink-0 flex-col items-center justify-center !rounded-full text-white shadow-lg"
            aria-label="Quick add"
          >
            <span className="text-2xl font-light leading-none">+</span>
          </button>
          <NavTab href={goals.href} label={goals.label} icon={<goals.icon size={20} />} active={isActive(goals.href)} />
          <NavTab
            href="#more"
            label="More"
            icon={
              <span className="relative">
                <Wallet size={20} aria-hidden />
                {unread > 0 && <span className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-peach" aria-hidden />}
              </span>
            }
            active={moreOpen}
            onClick={(e) => {
              e.preventDefault();
              setMoreOpen((v) => !v);
            }}
          />
        </div>
      </nav>
    </>
  );
}

function NavTab({
  href,
  label,
  icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick?: (e: MouseEvent) => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="neu-nav-item !flex-col !gap-0.5 !px-3 !py-2 text-[10.5px]"
      data-active={active}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
