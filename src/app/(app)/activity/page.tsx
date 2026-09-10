"use client";

import { useMemo, useState } from "react";
import { Activity as ActivityIcon, ArrowLeftRight, CreditCard, DollarSign, Filter, Heart, Receipt, Target, Users } from "lucide-react";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useActivity } from "@/hooks/data";
import { dateLabel, relativeTime } from "@/lib/dates";
import { EmptyState, PageLoader } from "@/components/ui/feedback";
import { Avatar, FadeUp, NeuButton, SectionHead, Segmented } from "@/components/ui/primitives";
import type { Activity } from "@/types";

type ActivityCategory = "all" | "transaction" | "budget" | "bill" | "goal" | "household";

function getActionIcon(action: string) {
  if (action.includes("transaction") || action.includes("expense") || action.includes("income")) {
    return <ArrowLeftRight size={15} className="text-teal" />;
  }
  if (action.includes("bill") || action.includes("subscription")) {
    return <Receipt size={15} className="text-orange" />;
  }
  if (action.includes("budget")) {
    return <CreditCard size={15} className="text-sky-500" />;
  }
  if (action.includes("goal")) {
    return <Target size={15} className="text-emerald-500" />;
  }
  if (action.includes("household") || action.includes("member")) {
    return <Users size={15} className="text-purple-500" />;
  }
  return <Heart size={15} className="text-teal" />;
}

export default function ActivityPage() {
  const { householdId, members, loading } = useHousehold();
  const { items: activities } = useActivity(householdId);
  const [filter, setFilter] = useState<ActivityCategory>("all");
  const [actorFilter, setActorFilter] = useState<string>("all");

  const memberMap = useMemo(() => new Map(members.map((m) => [m.uid, m])), [members]);

  const filtered = useMemo(() => {
    return activities.filter((act) => {
      if (actorFilter !== "all" && act.actorId !== actorFilter) return false;
      if (filter === "all") return true;
      if (filter === "transaction") return act.action.includes("transaction") || act.entityType === "transaction";
      if (filter === "bill") return act.action.includes("bill") || act.entityType === "bill";
      if (filter === "budget") return act.action.includes("budget") || act.entityType === "budget";
      if (filter === "goal") return act.action.includes("goal") || act.entityType === "goal";
      if (filter === "household") return act.action.includes("household") || act.entityType === "household";
      return true;
    });
  }, [activities, filter, actorFilter]);

  if (loading) return <PageLoader label="Loading household activity stream…" />;

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
        <SectionHead
          title="Shared Activity"
          subtitle="Real-time chronological timeline of what changed in your household money"
        />
      </FadeUp>

      {/* Filter bar */}
      <FadeUp delay={0.04}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            ariaLabel="Activity Category Filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All Activity" },
              { value: "transaction", label: "Transactions" },
              { value: "bill", label: "Bills & Subscriptions" },
              { value: "goal", label: "Goals" },
              { value: "household", label: "Household" },
            ]}
          />

          {members.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-sub">Actor:</span>
              <div className="flex gap-1">
                <NeuButton
                  size="sm"
                  variant={actorFilter === "all" ? "primary" : "ghost"}
                  onClick={() => setActorFilter("all")}
                >
                  Everyone
                </NeuButton>
                {members.map((m) => (
                  <NeuButton
                    key={m.uid}
                    size="sm"
                    variant={actorFilter === m.uid ? "primary" : "ghost"}
                    onClick={() => setActorFilter(m.uid)}
                  >
                    {m.displayName.split(" ")[0]}
                  </NeuButton>
                ))}
              </div>
            </div>
          )}
        </div>
      </FadeUp>

      {/* Activity Timeline List */}
      <FadeUp delay={0.08}>
        {filtered.length === 0 ? (
          <div className="neu-card p-6">
            <EmptyState
              icon={<ActivityIcon size={28} />}
              title="No activity recorded yet"
              description="New transactions, bills paid, budget updates, and goal contributions will appear live here."
            />
          </div>
        ) : (
          <div className="neu-card divide-y divide-[var(--c-border)] p-2">
            {filtered.map((item) => {
              const actor = memberMap.get(item.actorId);
              const eventDate = item.createdAt?.toDate ? item.createdAt.toDate() : null;
              const dateIso = eventDate ? eventDate.toISOString().slice(0, 10) : "";

              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3.5 rounded-[16px] px-3.5 py-3.5 transition-colors hover:bg-[rgba(138,206,209,0.06)]"
                >
                  <Avatar name={actor?.displayName ?? "Member"} photoURL={actor?.photoURL} size={38} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-1.5">
                      <span className="font-semibold text-ink text-[14px]">{actor?.displayName ?? "Partner"}</span>
                      <span className="text-[13.5px] text-sub">{item.description}</span>
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-[11.5px] text-faint">
                      <span className="flex items-center gap-1 font-medium">
                        {getActionIcon(item.action)}
                        <span className="capitalize">{item.entityType || "event"}</span>
                      </span>
                      <span>·</span>
                      <span>{relativeTime(item.createdAt)}</span>
                      {dateIso && <span>({dateLabel(dateIso)})</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </FadeUp>
    </div>
  );
}
