"use client";

import { useMemo, useState } from "react";
import { Bell, CheckCheck, Heart, Receipt, Target, Users, Wallet, BellRing } from "lucide-react";
import type { AppNotification, NotificationType } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useNotifications } from "@/hooks/data";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/firebase/notifications";
import { relativeTime } from "@/lib/dates";
import { EmptyState, PageLoader } from "@/components/ui/feedback";
import { FadeUp, NeuButton, SectionHead, Segmented } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/primitives";

type Filter = "all" | "unread" | NotificationType;

const TYPE_ICON: Record<NotificationType, React.ComponentType<{ size?: number; className?: string }>> = {
  partner: Users,
  budget: Wallet,
  bill: Receipt,
  goal: Target,
  household: Heart,
  system: Bell,
};

const TYPE_TINT: Record<NotificationType, string> = {
  partner: "text-teal",
  budget: "text-orange",
  bill: "text-amber",
  goal: "text-teal",
  household: "text-orange",
  system: "text-sub",
};

export default function NotificationsPage() {
  const { profile } = useAuth();
  const { householdId, members, loading } = useHousehold();
  const { items: notifications } = useNotifications(householdId, profile?.uid ?? null);
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(() => {
    if (filter === "all") return notifications;
    if (filter === "unread") return notifications.filter((n) => !n.read);
    return notifications.filter((n) => n.type === filter);
  }, [notifications, filter]);

  const unread = notifications.filter((n) => !n.read);

  if (loading) return <PageLoader label="Loading notifications…" />;

  async function open(n: AppNotification) {
    if (!n.read && householdId) await markNotificationRead(householdId, n.id).catch(() => undefined);
  }

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
        <SectionHead
          title="Notifications"
          subtitle={unread.length ? `${unread.length} unread` : "You're all caught up"}
          action={
            unread.length > 0 && householdId ? (
              <NeuButton size="sm" onClick={() => markAllNotificationsRead(householdId, profile!.uid, unread.map((n) => n.id)).catch(() => undefined)}>
                <CheckCheck size={14} aria-hidden /> Mark all read
              </NeuButton>
            ) : undefined
          }
        />
      </FadeUp>

      <FadeUp delay={0.04}>
        <Segmented
          ariaLabel="Notification filter"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "unread", label: `Unread${unread.length ? ` · ${unread.length}` : ""}` },
            { value: "partner", label: "Partner" },
            { value: "budget", label: "Budget" },
            { value: "bill", label: "Bills" },
            { value: "goal", label: "Goals" },
          ]}
        />
      </FadeUp>

      <FadeUp delay={0.08}>
        {visible.length === 0 ? (
          <div className="neu-card">
            <EmptyState
              icon={<BellRing size={26} />}
              title={filter === "all" ? "Nothing here yet" : "Nothing in this filter"}
              description="Partner activity, budget alerts, bill reminders and goal updates will appear here."
            />
          </div>
        ) : (
          <ul className="neu-card divide-y divide-[var(--c-border)] p-1.5">
            {visible.map((n) => {
              const Icon = TYPE_ICON[n.type] ?? Bell;
              const actor = members.find((m) => m.uid === n.actorId);
              return (
                <li key={n.id}>
                  <button
                    onClick={() => open(n)}
                    className={`flex w-full items-start gap-3 rounded-[18px] px-3 py-3.5 text-left transition-colors hover:bg-[rgba(138,206,209,0.08)] ${!n.read ? "bg-[rgba(138,206,209,0.07)]" : ""}`}
                    aria-label={`${n.title}. ${n.body}`}
                  >
                    {actor ? (
                      <Avatar name={actor.displayName} photoURL={actor.photoURL} size={36} />
                    ) : (
                      <span className={`neu-inset-sm flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${TYPE_TINT[n.type]}`}>
                        <Icon size={16} aria-hidden />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[13.5px] font-semibold text-ink">{n.title}</span>
                        {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-teal" aria-label="Unread" />}
                      </span>
                      <span className="mt-0.5 block text-[12.5px] leading-relaxed text-sub">{n.body}</span>
                      <span className="mt-0.5 block text-[11px] text-faint">{relativeTime(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </FadeUp>
    </div>
  );
}
