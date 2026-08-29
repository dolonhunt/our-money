"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, Banknote, ChevronLeft, ChevronRight, Receipt, Target, TrendingDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useQuickAdd } from "@/contexts/QuickAddContext";
import { useActivity, useBills, useBudgets, useGoals, useTransactions } from "@/hooks/data";
import { addMonths, currentMonth, monthLabel } from "@/lib/dates";
import { availableBalance, deltaPct, monthTotals } from "@/lib/finance";
import { money, pct } from "@/lib/currency";
import { PageLoader, Skeleton } from "@/components/ui/feedback";
import { FadeUp, NeuButton } from "@/components/ui/primitives";
import { HeroOurMoney } from "@/components/dashboard/HeroOurMoney";
import { MoneyFlow } from "@/components/dashboard/MoneyFlow";
import { SpendingBreakdown } from "@/components/dashboard/SpendingBreakdown";
import { BudgetsSummary, GoalsSummary } from "@/components/dashboard/BudgetsGoalsSummary";
import { TogetherFeed } from "@/components/dashboard/TogetherFeed";
import { materializeRecurringTransactions } from "@/lib/firebase/transactions";
import { checkBudgetAlerts } from "@/lib/firebase/budgets";
import { checkBillReminders } from "@/lib/firebase/bills";

export default function DashboardPage() {
  const { profile } = useAuth();
  const { householdId, household, members, memberUids, categories, loading: hhLoading } = useHousehold();
  const { open } = useQuickAdd();

  const [month, setMonth] = useState(currentMonth());
  const { items: transactions, loading: txLoading } = useTransactions(householdId);
  const { items: budgets, loading: budgetsLoading } = useBudgets(householdId, month);
  const { items: goals } = useGoals(householdId);
  const { items: activity } = useActivity(householdId);
  const { items: bills } = useBills(householdId);

  // Generate due recurring instances once per session (idempotent, PRD §42)
  const materialized = useRef(false);
  useEffect(() => {
    if (!householdId || materialized.current) return;
    materialized.current = true;
    materializeRecurringTransactions(householdId).catch(() => undefined);
  }, [householdId]);

  // Budget threshold + bill reminder alerts — once data settles (PRD §47)
  const alertsKey = `${householdId}|${month}|${transactions.length}|${budgets.length}|${bills.length}`;
  const alertsDone = useRef<string | null>(null);
  useEffect(() => {
    if (!householdId || txLoading || budgetsLoading || alertsDone.current === alertsKey) return;
    alertsDone.current = alertsKey;
    const categoryNames = Object.fromEntries(categories.map((c) => [c.id, c.name]));
    checkBudgetAlerts(householdId, budgets, transactions, memberUids, categoryNames, month).catch(() => undefined);
    checkBillReminders(householdId, bills, memberUids).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertsKey, txLoading, budgetsLoading]);

  const totals = useMemo(() => monthTotals(transactions, month), [transactions, month]);
  const prev = useMemo(() => monthTotals(transactions, addMonths(month, -1)), [transactions, month]);
  const balance = useMemo(() => availableBalance(transactions, []), [transactions]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    const name = profile?.displayName?.split(" ")[0] ?? "there";
    const time = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    return { text: `${time}, ${name}`, couple: household?.name ?? "Our Money" };
  }, [profile, household]);

  if (hhLoading) return <PageLoader label="Loading your dashboard…" />;

  const quickActions = [
    { label: "Expense", icon: <TrendingDown size={18} />, tint: "text-orange", onClick: () => open("expense") },
    { label: "Income", icon: <Banknote size={18} />, tint: "text-teal", onClick: () => open("income") },
    { label: "Transfer", icon: <ArrowLeftRight size={18} />, tint: "text-teal", onClick: () => open("transfer") },
    { label: "Bill", icon: <Receipt size={18} />, tint: "text-orange", onClick: () => open("bill") },
    { label: "Goal", icon: <Target size={18} />, tint: "text-teal", onClick: () => open("contribution") },
  ];

  return (
    <div className="flex flex-col gap-8 lg:gap-10">
      {/* Header: greeting + month selector (PRD §20) */}
      <FadeUp>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[24px] font-semibold tracking-tight text-ink md:text-[28px]">{greeting.text}</h1>
            <p className="mt-0.5 text-[13.5px] text-sub">
              {greeting.couple} · {members.length === 2 ? "both of you are in sync" : "invite your partner from the Couple page"}
            </p>
          </div>
          <div className="neu-pill flex items-center gap-1 !py-1.5" role="group" aria-label="Month selector">
            <NeuButton variant="ghost" size="sm" className="!rounded-full !p-1.5" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}>
              <ChevronLeft size={16} />
            </NeuButton>
            <span className="min-w-[118px] text-center font-display text-[13.5px] font-semibold text-ink">{monthLabel(month)}</span>
            <NeuButton variant="ghost" size="sm" className="!rounded-full !p-1.5" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))} disabled={month >= currentMonth()}>
              <ChevronRight size={16} />
            </NeuButton>
          </div>
        </div>
      </FadeUp>

      {/* Hero + overview (PRD §21, §26, §68) */}
      <FadeUp delay={0.05}>
        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          {txLoading ? (
            <Skeleton className="h-[300px]" />
          ) : (
            <HeroOurMoney
              balance={balance}
              income={totals.income}
              expense={totals.expense}
              net={totals.net}
              savingsRate={totals.savingsRate}
              incomeDelta={deltaPct(totals.income, prev.income)}
              expenseDelta={deltaPct(totals.expense, prev.expense)}
            />
          )}
          <FadeUp delay={0.12} className="flex flex-col gap-4">
            <OverviewTile label="Our Income" value={money(totals.income)} delta={deltaPct(totals.income, prev.income)} good tint="teal" loading={txLoading} />
            <OverviewTile label="Our Spending" value={money(totals.expense)} delta={deltaPct(totals.expense, prev.expense)} tint="peach" loading={txLoading} />
            <OverviewTile label="Our Savings" value={`${money(totals.net)} · ${pct(totals.savingsRate * 100, 0)}`} delta={deltaPct(totals.net, prev.net)} good tint="teal" loading={txLoading} />
          </FadeUp>
        </div>
      </FadeUp>

      {/* Quick actions (PRD §13) */}
      <FadeUp delay={0.1}>
        <div className="grid grid-cols-5 gap-2.5 lg:hidden" aria-label="Quick actions">
          {quickActions.map((a) => (
            <button key={a.label} onClick={a.onClick} className="neu-btn flex flex-col items-center gap-1.5 !rounded-2xl px-1 py-3.5 text-[10.5px] font-semibold">
              <span className={`neu-inset-sm flex h-9 w-9 items-center justify-center rounded-full ${a.tint}`}>{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>
        <div className="hidden gap-2.5 lg:flex" aria-label="Quick actions">
          {quickActions.map((a) => (
            <NeuButton key={a.label} onClick={a.onClick} className="!rounded-2xl">
              <span className={a.tint}>{a.icon}</span> Add {a.label}
            </NeuButton>
          ))}
        </div>
      </FadeUp>

      {/* Money flow + spending (PRD §23–26) */}
      <div className="grid gap-8 xl:grid-cols-2">
        <FadeUp delay={0.05}>
          <MoneyFlow transactions={transactions} currentMonth={month} />
        </FadeUp>
        <FadeUp delay={0.1}>
          <SpendingBreakdown transactions={transactions} categories={categories} month={month} />
        </FadeUp>
      </div>

      {/* Budgets + goals (PRD §27–28) */}
      <div className="grid gap-8 xl:grid-cols-2">
        <FadeUp delay={0.05}>
          <BudgetsSummary budgets={budgets} transactions={transactions} categories={categories} month={month} />
        </FadeUp>
        <FadeUp delay={0.1}>
          <GoalsSummary goals={goals} />
        </FadeUp>
      </div>

      {/* Together activity (PRD §29) */}
      <FadeUp delay={0.05}>
        <TogetherFeed activity={activity} members={members} />
      </FadeUp>
    </div>
  );
}

function OverviewTile({ label, value, delta, good, tint, loading }: { label: string; value: string; delta: number | null; good?: boolean; tint: "teal" | "peach"; loading?: boolean }) {
  if (loading) return <Skeleton className="h-[92px] flex-1" />;
  return (
    <div className="neu-card-sm flex flex-1 items-center gap-4 p-4">
      <span className={`neu-inset-sm flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tint === "teal" ? "text-teal" : "text-orange"}`}>
        <span className="h-4 w-4 rounded-full border-[3.5px] border-current" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-bold uppercase tracking-wider text-faint">{label}</p>
        <p className="display-number truncate text-[20px] text-ink">{value}</p>
      </div>
      {delta != null && (
        <span className={`text-[11.5px] font-bold ${delta >= 0 === Boolean(good) ? "metric-up" : "metric-down"}`}>
          {delta >= 0 ? "+" : ""}
          {delta.toFixed(1)}%
        </span>
      )}
    </div>
  );
}
