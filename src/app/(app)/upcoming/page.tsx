"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  Receipt,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useAccounts, useBills, useGoals, useTransactions } from "@/hooks/data";
import { useToast } from "@/contexts/ToastContext";
import { money } from "@/lib/currency";
import { dateLabel, dayLabel, todayISO } from "@/lib/dates";
import { computeUpcomingTimeline, type UpcomingTimelineItem } from "@/lib/forecast";
import { billStatus, markBillUnpaid, payBill } from "@/lib/firebase/bills";
import { EmptyState, PageLoader } from "@/components/ui/feedback";
import { FadeUp, NeuButton, SectionHead, Segmented } from "@/components/ui/primitives";
import { BillForm } from "@/components/bills/BillForm";
import { GoalForm } from "@/components/goals/GoalForm";
import type { Bill } from "@/types";

const STATUS_PILL: Record<UpcomingTimelineItem["status"], { chip: string; label: string }> = {
  "due-today": { chip: "!text-danger font-bold bg-danger/10", label: "Due today" },
  "due-soon": { chip: "!text-amber font-bold bg-amber/10", label: "Due soon" },
  overdue: { chip: "!text-danger font-bold bg-danger/15", label: "Overdue" },
  upcoming: { chip: "!text-teal bg-mint/20", label: "Upcoming" },
  paid: { chip: "!text-faint bg-neutral-200/50 dark:bg-neutral-800/50", label: "Paid" },
};

type TimelineFilter = "all" | "outflows" | "inflows" | "goals";

export default function UpcomingPage() {
  const { profile } = useAuth();
  const { householdId, memberUids, loading } = useHousehold();
  const { items: bills } = useBills(householdId);
  const { items: txs } = useTransactions(householdId);
  const { items: goals } = useGoals(householdId);
  const { items: accounts } = useAccounts(householdId);
  const toast = useToast();

  const [filter, setFilter] = useState<TimelineFilter>("all");
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  const { items, committedOutflows30d, expectedInflows30d, net30dCommitment } = useMemo(
    () => computeUpcomingTimeline(bills, txs, goals, accounts),
    [bills, txs, goals, accounts]
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filter === "outflows") return item.direction === "outflow" && item.sourceType !== "goal";
      if (filter === "inflows") return item.direction === "inflow";
      if (filter === "goals") return item.sourceType === "goal";
      return true;
    });
  }, [items, filter]);

  // Group items by date
  const groupedByDate = useMemo(() => {
    const map = new Map<string, UpcomingTimelineItem[]>();
    for (const item of filteredItems) {
      const list = map.get(item.date) ?? [];
      list.push(item);
      map.set(item.date, list);
    }
    return Array.from(map.entries());
  }, [filteredItems]);

  if (loading) return <PageLoader label="Calculating future commitments…" />;

  async function handlePayBill(bill: Bill) {
    if (!householdId || !profile) return;
    setPayingId(bill.id);
    try {
      await payBill(householdId, bill, profile.uid, memberUids);
      toast.success(`${bill.name} marked as paid`);
    } catch {
      toast.error("Could not record payment. Please try again.");
    } finally {
      setPayingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
        <SectionHead
          title="Upcoming & Commitments"
          subtitle="How much money is already committed to the near future?"
          action={
            <div className="flex gap-2">
              <NeuButton variant="ghost" size="sm" onClick={() => setGoalModalOpen(true)}>
                <Target size={15} aria-hidden /> Goal
              </NeuButton>
              <NeuButton variant="primary" size="sm" onClick={() => setBillModalOpen(true)}>
                <Plus size={15} aria-hidden /> Bill / Commitment
              </NeuButton>
            </div>
          }
        />
      </FadeUp>

      {/* 30-Day Forward Commitment Hero Cards */}
      <FadeUp delay={0.04}>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="neu-card-sm flex flex-col gap-1.5 p-5 border-l-4 border-l-rose-400">
            <div className="flex items-center justify-between text-faint">
              <span className="text-[11px] font-bold uppercase tracking-wider">30-Day Committed Outflows</span>
              <ArrowDownRight size={16} className="text-danger" aria-hidden />
            </div>
            <p className="display-number text-[24px] text-ink">{money(committedOutflows30d)}</p>
            <p className="text-[11.5px] text-sub">Bills, subscriptions & scheduled outflows</p>
          </div>

          <div className="neu-card-sm flex flex-col gap-1.5 p-5 border-l-4 border-l-teal">
            <div className="flex items-center justify-between text-faint">
              <span className="text-[11px] font-bold uppercase tracking-wider">30-Day Expected Inflows</span>
              <ArrowUpRight size={16} className="text-teal" aria-hidden />
            </div>
            <p className="display-number text-[24px] text-teal">{money(expectedInflows30d)}</p>
            <p className="text-[11.5px] text-sub">Salaries & scheduled recurring deposits</p>
          </div>

          <div className="neu-card-sm flex flex-col gap-1.5 p-5 border-l-4 border-l-sky-400">
            <div className="flex items-center justify-between text-faint">
              <span className="text-[11px] font-bold uppercase tracking-wider">Net 30-Day Position</span>
              <Clock size={16} className="text-sky-500" aria-hidden />
            </div>
            <p className={`display-number text-[24px] ${net30dCommitment >= 0 ? "text-teal" : "text-danger"}`}>
              {net30dCommitment >= 0 ? `+${money(net30dCommitment)}` : `-${money(Math.abs(net30dCommitment))}`}
            </p>
            <p className="text-[11.5px] text-sub">Projected liquidity buffer after obligations</p>
          </div>
        </div>
      </FadeUp>

      {/* Filter bar */}
      <FadeUp delay={0.08}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            ariaLabel="Timeline Filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All Items" },
              { value: "outflows", label: "Bills & Outflows" },
              { value: "inflows", label: "Income & Inflows" },
              { value: "goals", label: "Goal Milestones" },
            ]}
          />
          <span className="text-[12.5px] font-medium text-sub">
            {filteredItems.length} commitment{filteredItems.length === 1 ? "" : "s"} scheduled
          </span>
        </div>
      </FadeUp>

      {/* Timeline Stream */}
      <FadeUp delay={0.12}>
        {filteredItems.length === 0 ? (
          <div className="neu-card p-6">
            <EmptyState
              icon={<Calendar size={28} />}
              title="No upcoming obligations scheduled"
              description="Add recurring bills, subscriptions, or savings goals to plan future cash flow."
              action={
                <NeuButton variant="primary" onClick={() => setBillModalOpen(true)}>
                  Add an upcoming bill
                </NeuButton>
              }
            />
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {groupedByDate.map(([date, dateItems]) => {
              const isToday = date === todayISO();
              return (
                <section key={date} aria-label={dateLabel(date)}>
                  <div className="mb-2 flex items-center justify-between px-1">
                    <h3 className="flex items-center gap-2 font-display text-[13px] font-bold uppercase tracking-wider text-sub">
                      {isToday && <span className="h-2 w-2 rounded-full bg-teal animate-pulse" />}
                      {dayLabel(date)}
                    </h3>
                    <span className="text-[11.5px] font-medium text-faint">{dateLabel(date)}</span>
                  </div>

                  <div className="neu-card divide-y divide-[var(--c-border)] p-1.5">
                    {dateItems.map((item) => {
                      const pill = STATUS_PILL[item.status];
                      return (
                        <div
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] px-3.5 py-3 transition-colors hover:bg-[rgba(138,206,209,0.06)] sm:flex-nowrap"
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <span
                              className={`neu-inset-sm flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                                item.direction === "inflow"
                                  ? "text-teal"
                                  : item.sourceType === "goal"
                                  ? "text-sky-500"
                                  : "text-rose-500"
                              }`}
                            >
                              {item.direction === "inflow" ? (
                                <TrendingUp size={17} aria-hidden />
                              ) : item.sourceType === "goal" ? (
                                <Target size={17} aria-hidden />
                              ) : (
                                <Receipt size={17} aria-hidden />
                              )}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-[14.5px] font-semibold text-ink">{item.title}</p>
                                <span className={`neu-chip !cursor-default !py-0.5 !px-2 !text-[10px] ${pill.chip}`}>
                                  {pill.label}
                                </span>
                                {item.ownership === "personal" && (
                                  <span className="neu-chip !cursor-default !py-0.5 !px-2 !text-[10px]">Personal</span>
                                )}
                              </div>
                              <p className="mt-0.5 text-[12px] text-sub">
                                {item.accountName ? `From ${item.accountName} · ` : ""}
                                {item.direction === "inflow" ? "Expected deposit" : "Planned payment"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center">
                            <span
                              className={`display-number text-[16px] ${
                                item.direction === "inflow" ? "text-teal" : "text-ink"
                              }`}
                            >
                              {item.direction === "inflow" ? `+${money(item.amount)}` : `-${money(item.amount)}`}
                            </span>

                            {item.sourceType === "bill" && (item.rawItem as Bill) && (
                              <div>
                                {(item.rawItem as Bill).paid ? (
                                  <NeuButton
                                    variant="ghost"
                                    size="sm"
                                    className="!p-1.5 !text-[11.5px]"
                                    onClick={() =>
                                      householdId &&
                                      markBillUnpaid(householdId, item.rawItem!.id).then(() =>
                                        toast.info("Marked unpaid")
                                      )
                                    }
                                  >
                                    Undo
                                  </NeuButton>
                                ) : (
                                  <NeuButton
                                    variant="primary"
                                    size="sm"
                                    loading={payingId === item.rawItem!.id}
                                    onClick={() => handlePayBill(item.rawItem as Bill)}
                                  >
                                    <CheckCircle2 size={13} aria-hidden /> Pay
                                  </NeuButton>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </FadeUp>

      <BillForm open={billModalOpen} onClose={() => setBillModalOpen(false)} />
      <GoalForm open={goalModalOpen} onClose={() => setGoalModalOpen(false)} />
    </div>
  );
}
