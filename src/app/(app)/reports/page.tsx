"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  HelpCircle,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users2,
  Zap,
} from "lucide-react";
import type { Ownership } from "@/types";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useAccounts, useBills, useBudgets, useGoals, useTransactions } from "@/hooks/data";
import { addMonths, currentMonth, monthLabel, todayISO } from "@/lib/dates";
import { activeTransactions, budgetProgress, categoryBreakdown, monthTotals } from "@/lib/finance";
import { money, pct } from "@/lib/currency";
import {
  computeFinancialHealth,
  computeSpendingInsights,
  generateCashFlowForecast,
} from "@/lib/forecast";
import { EmptyState, PageLoader } from "@/components/ui/feedback";
import { Avatar, FadeUp, NeuButton, SectionHead, Segmented } from "@/components/ui/primitives";
import { ProgressBar } from "@/components/ui/progress";
import { MoneyFlowChart } from "@/components/charts/NeuCharts";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

type Tab = "summary" | "categories" | "couple" | "budgets" | "forecast" | "health";
type CouplePeriod = "this_month" | "last_month" | "three_months" | "all_time";

export default function ReportsPage() {
  const { householdId, categories, members, loading } = useHousehold();
  const [month, setMonth] = useState(currentMonth());
  const [tab, setTab] = useState<Tab>("summary");
  const [couplePeriod, setCouplePeriod] = useState<CouplePeriod>("this_month");
  const [forecastDays, setForecastDays] = useState<30 | 60 | 90>(30);

  const { items: transactions } = useTransactions(householdId);
  const { items: budgets } = useBudgets(householdId, month);
  const { items: bills } = useBills(householdId);
  const { items: goals } = useGoals(householdId);
  const { items: accounts } = useAccounts(householdId);

  const totals = useMemo(() => monthTotals(transactions, month), [transactions, month]);
  const prevTotals = useMemo(() => monthTotals(transactions, addMonths(month, -1)), [transactions, month]);
  const breakdown = useMemo(() => categoryBreakdown(transactions, month), [transactions, month]);
  const prevBreakdown = useMemo(() => categoryBreakdown(transactions, addMonths(month, -1)), [transactions, month]);
  const budgetRows = useMemo(
    () =>
      budgets.map((b) => ({
        ...budgetProgress(b, transactions, month),
        name: categories.find((c) => c.id === b.categoryId)?.name ?? "Budget",
      })),
    [budgets, transactions, categories, month]
  );

  // Cash-Flow Forecast calculation
  const forecast = useMemo(
    () => generateCashFlowForecast(accounts, transactions, bills, goals, forecastDays),
    [accounts, transactions, bills, goals, forecastDays]
  );

  // Financial Health calculation
  const health = useMemo(
    () => computeFinancialHealth(accounts, transactions, budgets, bills, goals),
    [accounts, transactions, budgets, bills, goals]
  );

  // Spending Insights calculation
  const insights = useMemo(
    () => computeSpendingInsights(transactions, categories, budgets),
    [transactions, categories, budgets]
  );

  // Filtered transactions for couple calculation based on couplePeriod
  const coupleTransactions = useMemo(() => {
    const active = activeTransactions(transactions);
    const thisM = currentMonth();
    const lastM = addMonths(thisM, -1);
    const threeM = addMonths(thisM, -2);

    if (couplePeriod === "this_month") return active.filter((t) => t.date.slice(0, 7) === thisM);
    if (couplePeriod === "last_month") return active.filter((t) => t.date.slice(0, 7) === lastM);
    if (couplePeriod === "three_months") return active.filter((t) => t.date.slice(0, 7) >= threeM && t.date.slice(0, 7) <= thisM);
    return active;
  }, [transactions, couplePeriod]);

  // Couple contribution breakdown
  const coupleAnalysis = useMemo(() => {
    const rows = members.map((m) => ({ member: m, totalPaid: 0, sharedPaid: 0, personalPaid: 0 }));
    const byUid = Object.fromEntries(rows.map((r) => [r.member.uid, r]));
    let totalShared = 0;
    let totalPersonal = 0;

    for (const t of coupleTransactions) {
      if (t.type !== "expense") continue;
      if (t.ownership === "shared") {
        totalShared += t.amount;
        if (t.paidBy === "both") {
          for (const r of rows) {
            r.totalPaid += t.amount / (rows.length || 1);
            r.sharedPaid += t.amount / (rows.length || 1);
          }
        } else if (byUid[t.paidBy]) {
          byUid[t.paidBy].totalPaid += t.amount;
          byUid[t.paidBy].sharedPaid += t.amount;
        }
      } else {
        totalPersonal += t.amount;
        if (byUid[t.paidBy]) {
          byUid[t.paidBy].totalPaid += t.amount;
          byUid[t.paidBy].personalPaid += t.amount;
        }
      }
    }

    // Calculate contribution difference between member 0 and member 1
    const m0 = rows[0];
    const m1 = rows[1];
    let diff = 0;
    let higherPayer = "";
    let settleAmount = 0;

    if (m0 && m1) {
      diff = Math.abs(m0.sharedPaid - m1.sharedPaid);
      higherPayer = m0.sharedPaid >= m1.sharedPaid ? m0.member.displayName : m1.member.displayName;
      settleAmount = diff / 2;
    }

    return {
      rows,
      totalShared,
      totalPersonal,
      diff,
      higherPayer,
      settleAmount,
    };
  }, [coupleTransactions, members]);

  const ownershipSplit = useMemo(() => {
    const split: Record<Ownership, number> = { shared: 0, personal: 0 };
    for (const t of activeTransactions(transactions)) {
      if (t.type !== "expense" || t.date.slice(0, 7) !== month) continue;
      split[t.ownership] += t.amount;
    }
    return split;
  }, [transactions, month]);

  const flowData = useMemo(() => {
    const out: { label: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = addMonths(month, -i);
      const t = monthTotals(transactions, m);
      out.push({ label: monthLabel(m).split(" ")[0].slice(0, 3), income: t.income, expense: t.expense });
    }
    return out;
  }, [transactions, month]);

  if (loading) return <PageLoader label="Crunching numbers…" />;

  const tabOptions = [
    { value: "summary" as Tab, label: "Summary" },
    { value: "categories" as Tab, label: "Categories" },
    { value: "couple" as Tab, label: "Couple Balance" },
    { value: "budgets" as Tab, label: "Budgets" },
    { value: "forecast" as Tab, label: "Cash-Flow Forecast" },
    { value: "health" as Tab, label: "Health & Insights" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
        <SectionHead
          title="Financial Intelligence & Reports"
          subtitle="Household cash flow, couple balance, and forward-looking forecast"
          action={
            tab === "summary" || tab === "categories" || tab === "budgets" ? (
              <div className="neu-pill flex items-center gap-1 !py-1.5">
                <NeuButton
                  variant="ghost"
                  size="sm"
                  className="!rounded-full !p-1.5"
                  aria-label="Previous month"
                  onClick={() => setMonth(addMonths(month, -1))}
                >
                  <ChevronLeft size={15} />
                </NeuButton>
                <span className="min-w-[96px] text-center font-display text-[12.5px] font-semibold text-ink">
                  {monthLabel(month)}
                </span>
                <NeuButton
                  variant="ghost"
                  size="sm"
                  className="!rounded-full !p-1.5"
                  aria-label="Next month"
                  onClick={() => setMonth(addMonths(month, 1))}
                  disabled={month >= currentMonth()}
                >
                  <ChevronRight size={15} />
                </NeuButton>
              </div>
            ) : null
          }
        />
      </FadeUp>

      <FadeUp delay={0.04}>
        <Segmented ariaLabel="Report section" value={tab} onChange={setTab} options={tabOptions} />
      </FadeUp>

      {/* 1. Summary View */}
      {tab === "summary" && (
        <FadeUp className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Income"
              value={money(totals.income)}
              sub={`${totals.income - prevTotals.income >= 0 ? "+" : ""}${money(
                totals.income - prevTotals.income
              )} vs last month`}
            />
            <Stat
              label="Expenses"
              value={money(totals.expense)}
              sub={`${totals.expense - prevTotals.expense >= 0 ? "+" : ""}${money(
                totals.expense - prevTotals.expense
              )} vs last month`}
            />
            <Stat label="Net Savings" value={money(totals.net)} sub={`Savings Rate ${pct(totals.savingsRate * 100, 1)}`} />
            <Stat
              label="Top Category"
              value={breakdown[0] ? categories.find((c) => c.id === breakdown[0].categoryId)?.name ?? "—" : "—"}
              sub={breakdown[0] ? money(breakdown[0].amount) : "No spending"}
            />
          </div>

          <div className="neu-card p-5">
            <h3 className="mb-3 ml-1 font-display text-[15px] font-semibold text-ink">Cash flow — 6 months</h3>
            <div className="neu-inset p-3 sm:p-4">
              <MoneyFlowChart data={flowData} height={230} />
            </div>
          </div>

          <div className="neu-card p-5">
            <h3 className="mb-4 ml-1 font-display text-[15px] font-semibold text-ink">Top categories</h3>
            {breakdown.length === 0 ? (
              <EmptyState
                icon={<BarChart3 size={24} />}
                title="Nothing to analyze yet"
                description="Add expenses this month to see the breakdown."
              />
            ) : (
              <ul className="space-y-3">
                {breakdown.slice(0, 5).map((s) => {
                  const cat = categories.find((c) => c.id === s.categoryId);
                  return (
                    <li key={s.categoryId}>
                      <div className="mb-1 flex justify-between text-[13px]">
                        <span className="font-semibold text-ink">{cat?.name ?? "Other"}</span>
                        <span className="text-sub">
                          {money(s.amount)} · {pct(s.share * 100, 0)} · {s.count}×
                        </span>
                      </div>
                      <ProgressBar value={s.share} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </FadeUp>
      )}

      {/* 2. Categories View */}
      {tab === "categories" && (
        <FadeUp>
          <div className="neu-card p-5">
            <h3 className="mb-4 ml-1 font-display text-[15px] font-semibold text-ink">
              Category analysis — {monthLabel(month)}
            </h3>
            {breakdown.length === 0 ? (
              <EmptyState icon={<BarChart3 size={24} />} title="No expenses this month" />
            ) : (
              <ul className="space-y-2">
                {breakdown.map((s) => {
                  const cat = categories.find((c) => c.id === s.categoryId);
                  const prevAmount = prevBreakdown.find((p) => p.categoryId === s.categoryId)?.amount ?? 0;
                  const delta = prevAmount === 0 ? null : ((s.amount - prevAmount) / prevAmount) * 100;
                  return (
                    <li key={s.categoryId} className="neu-card-sm flex items-center gap-4 p-3.5">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: cat?.color ?? "#B9C4C9" }} aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">{cat?.name ?? "Other"}</span>
                      <span className="text-[12px] text-sub">{s.count}× · {pct(s.share * 100, 0)}</span>
                      {delta != null && (
                        <span className={`w-[72px] text-right text-[11.5px] font-bold ${delta <= 0 ? "metric-up" : "metric-down"}`}>
                          {delta >= 0 ? "+" : ""}
                          {delta.toFixed(0)}%
                        </span>
                      )}
                      <span className="w-[84px] text-right font-display text-[13.5px] font-semibold text-ink">{money(s.amount)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </FadeUp>
      )}

      {/* 3. Couple Balance (PRD §14) */}
      {tab === "couple" && (
        <FadeUp className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <Segmented
              ariaLabel="Couple Period Filter"
              value={couplePeriod}
              onChange={setCouplePeriod}
              options={[
                { value: "this_month", label: "This Month" },
                { value: "last_month", label: "Last Month" },
                { value: "three_months", label: "Last 3 Months" },
                { value: "all_time", label: "All Time" },
              ]}
            />
          </div>

          <div className="neu-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--c-border)] pb-4">
              <div>
                <h3 className="flex items-center gap-2 font-display text-[16px] font-semibold text-ink">
                  <Users2 size={18} className="text-teal" aria-hidden /> Shared Expense Settlement & Contribution
                </h3>
                <p className="mt-0.5 text-[12.5px] text-sub">
                  Total shared expenses: <strong className="text-ink">{money(coupleAnalysis.totalShared)}</strong>
                </p>
              </div>

              {members.length > 1 && coupleAnalysis.diff > 0 && (
                <div className="neu-inset-sm flex items-center gap-2 rounded-xl px-3.5 py-2">
                  <Heart size={15} className="text-teal" />
                  <span className="text-[12.5px] text-ink">
                    <strong>{coupleAnalysis.higherPayer}</strong> paid {money(coupleAnalysis.diff)} more. Settle up:{" "}
                    <span className="text-teal font-bold">{money(coupleAnalysis.settleAmount)}</span>
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {coupleAnalysis.rows.map((r) => {
                const totalShared = coupleAnalysis.totalShared || 1;
                return (
                  <div key={r.member.uid} className="neu-inset flex flex-col gap-3.5 p-5">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.member.displayName} photoURL={r.member.photoURL} size={44} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold text-ink">{r.member.displayName}</p>
                        <p className="text-[12px] text-sub">Paid for Shared: {money(r.sharedPaid)}</p>
                      </div>
                      <span className="display-number text-[18px] text-ink">{money(r.totalPaid)}</span>
                    </div>

                    <ProgressBar value={r.sharedPaid / totalShared} />
                    <div className="flex justify-between text-[12px] text-sub">
                      <span>Personal spend: {money(r.personalPaid)}</span>
                      <span className="font-semibold text-ink">
                        {Math.round((r.sharedPaid / totalShared) * 100)}% of shared
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="neu-card p-5">
            <h3 className="mb-4 ml-1 font-display text-[15px] font-semibold text-ink">Shared vs Personal Spending Split</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <SplitBar
                label="Shared spending"
                value={coupleAnalysis.totalShared}
                total={coupleAnalysis.totalShared + coupleAnalysis.totalPersonal}
                tint="teal"
              />
              <SplitBar
                label="Personal spending"
                value={coupleAnalysis.totalPersonal}
                total={coupleAnalysis.totalShared + coupleAnalysis.totalPersonal}
                tint="peach"
              />
            </div>
          </div>
        </FadeUp>
      )}

      {/* 4. Budgets View */}
      {tab === "budgets" && (
        <FadeUp>
          <div className="neu-card p-5">
            <h3 className="mb-4 ml-1 font-display text-[15px] font-semibold text-ink">
              Budget performance — {monthLabel(month)}
            </h3>
            {budgetRows.length === 0 ? (
              <EmptyState
                icon={<BarChart3 size={24} />}
                title="No budgets set"
                description="Set budgets to compare plan vs actual spending."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-[13px]">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-faint">
                      <th className="pb-2 pl-1 font-bold">Category</th>
                      <th className="pb-2 text-right font-bold">Budget</th>
                      <th className="pb-2 text-right font-bold">Actual</th>
                      <th className="pb-2 text-right font-bold">Remaining</th>
                      <th className="pb-2 pr-1 text-right font-bold">Used</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--c-border)]">
                    {budgetRows.map((r) => (
                      <tr key={r.budget.id}>
                        <td className="py-2.5 pl-1 font-semibold text-ink">{r.name}</td>
                        <td className="py-2.5 text-right text-sub">{money(r.budget.amount)}</td>
                        <td className="py-2.5 text-right text-ink">{money(r.spent)}</td>
                        <td className={`py-2.5 text-right font-semibold ${r.remaining < 0 ? "text-danger" : "text-sub"}`}>
                          {money(r.remaining)}
                        </td>
                        <td className="py-2.5 pr-1 text-right">
                          <span
                            className={`font-bold ${
                              r.status === "over"
                                ? "text-danger"
                                : r.status === "healthy"
                                ? "text-teal"
                                : "text-orange"
                            }`}
                          >
                            {Math.round(r.ratio * 100)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </FadeUp>
      )}

      {/* 5. Cash-Flow Forecast (PRD §10) */}
      {tab === "forecast" && (
        <FadeUp className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-[16px] font-semibold text-ink">Projected Cash-Flow</h3>
              <p className="text-[12.5px] text-sub">
                Forward-looking balance trajectory considering current funds, scheduled bills, recurring income, and goals.
              </p>
            </div>
            <Segmented
              ariaLabel="Forecast Horizon"
              value={forecastDays}
              onChange={setForecastDays}
              options={[
                { value: 30, label: "30 Days" },
                { value: 60, label: "60 Days" },
                { value: 90, label: "90 Days" },
              ]}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="neu-card-sm flex flex-col gap-1 p-4">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-faint">Current Balance</span>
              <span className="display-number text-[20px] text-ink">{money(forecast.currentBalance)}</span>
              <span className="text-[11px] text-sub">Today&apos;s combined funds</span>
            </div>

            <div className="neu-card-sm flex flex-col gap-1 p-4">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-faint">Projected Balance</span>
              <span className={`display-number text-[20px] ${forecast.projectedBalance >= 0 ? "text-teal" : "text-danger"}`}>
                {money(forecast.projectedBalance)}
              </span>
              <span className="text-[11px] text-sub">At end of {forecast.horizonDays} days</span>
            </div>

            <div className="neu-card-sm flex flex-col gap-1 p-4">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-faint">Lowest Projected Point</span>
              <span className={`display-number text-[20px] ${forecast.lowestBalance < 0 ? "text-danger" : "text-ink"}`}>
                {money(forecast.lowestBalance)}
              </span>
              <span className="text-[11px] text-sub">Occurring around {forecast.lowestDate}</span>
            </div>

            <div className="neu-card-sm flex flex-col gap-1 p-4">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-faint">Liquidity Health</span>
              <span
                className={`display-number text-[18px] capitalize ${
                  forecast.riskState === "comfortable"
                    ? "text-teal"
                    : forecast.riskState === "tight"
                    ? "text-amber"
                    : "text-danger"
                }`}
              >
                {forecast.riskState}
              </span>
              <span className="text-[11px] text-sub">
                {forecast.riskState === "comfortable"
                  ? "Comfortable buffer"
                  : forecast.riskState === "tight"
                  ? "Monitor closely"
                  : "Deficit risk detected"}
              </span>
            </div>
          </div>

          <div className="neu-card p-5">
            <h4 className="mb-3 font-display text-[15px] font-semibold text-ink">Projected Balance Curve</h4>
            <div className="neu-inset p-3 sm:p-4 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecast.daily}>
                  <defs>
                    <linearGradient id="forecastTeal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--c-teal)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--c-teal)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="dayLabel" stroke="var(--c-text-faint)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--c-text-faint)" fontSize={11} tickLine={false} tickFormatter={(v) => `৳${v / 1000}k`} />
                  <Tooltip
                    formatter={(val: unknown) => [money(Number(val) || 0), "Projected Balance"]}
                    contentStyle={{
                      background: "var(--c-surface)",
                      border: "1px solid var(--c-border)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="var(--c-teal)"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#forecastTeal)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </FadeUp>
      )}

      {/* 6. Health & Spending Insights (PRD §12 & §13) */}
      {tab === "health" && (
        <FadeUp className="flex flex-col gap-6">
          {/* Health Score Overview */}
          <div className="neu-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--c-border)] pb-5">
              <div className="flex items-center gap-4">
                <div className="neu-inset flex h-16 w-16 items-center justify-center rounded-2xl text-teal">
                  <ShieldCheck size={32} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-xl font-bold text-ink">Household Financial Health: {health.rating}</h3>
                    <span className="neu-chip !text-teal font-bold">{health.totalScore} / 100</span>
                  </div>
                  <p className="mt-1 text-[13px] text-sub">{health.topRecommendation}</p>
                </div>
              </div>
            </div>

            {/* 4 Pillars */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {health.pillars.map((p) => (
                <div key={p.title} className="neu-inset flex flex-col gap-2.5 p-4 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-ink text-[14px]">{p.title}</span>
                    <span
                      className={`text-[12px] font-bold ${
                        p.status === "excellent"
                          ? "text-teal"
                          : p.status === "good"
                          ? "text-emerald-500"
                          : p.status === "fair"
                          ? "text-amber"
                          : "text-danger"
                      }`}
                    >
                      {p.score} / {p.maxScore}
                    </span>
                  </div>
                  <ProgressBar value={p.score / p.maxScore} />
                  <p className="text-[12px] text-ink font-medium">{p.detail}</p>
                  <p className="text-[11.5px] text-sub">{p.tip}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Spending Insights Section */}
          <div className="neu-card p-6">
            <h3 className="mb-2 flex items-center gap-2 font-display text-[16px] font-semibold text-ink">
              <Lightbulb size={18} className="text-amber" aria-hidden /> Deterministic Spending Insights
            </h3>
            <p className="mb-4 text-[12.5px] text-sub">
              Actionable observations derived directly from your actual spending and category trends.
            </p>

            {insights.length === 0 ? (
              <EmptyState
                icon={<Sparkles size={24} />}
                title="Spending patterns stable"
                description="No unusual surges or budget risks detected for the current month."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {insights.map((ins) => (
                  <div key={ins.id} className="neu-card-sm flex items-start gap-3.5 p-4">
                    <span
                      className={`neu-inset-sm flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        ins.type === "warning"
                          ? "text-amber bg-amber/10"
                          : ins.type === "positive"
                          ? "text-teal bg-mint/20"
                          : "text-sky-500 bg-sky-500/10"
                      }`}
                    >
                      {ins.type === "warning" ? (
                        <AlertTriangle size={16} />
                      ) : (
                        <Lightbulb size={16} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink text-[14px]">{ins.title}</p>
                      <p className="mt-0.5 text-[12.5px] text-sub leading-relaxed">{ins.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FadeUp>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="neu-card-sm flex flex-col gap-1 p-5">
      <p className="text-[10.5px] font-bold uppercase tracking-wider text-faint">{label}</p>
      <p className="display-number text-[24px] text-ink">{value}</p>
      <p className="text-[11.5px] text-sub">{sub}</p>
    </div>
  );
}

function SplitBar({
  label,
  value,
  total,
  tint,
}: {
  label: string;
  value: number;
  total: number;
  tint: "teal" | "peach";
}) {
  const share = total > 0 ? value / total : 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-[13px]">
        <span className="font-semibold text-ink">{label}</span>
        <span className="text-sub">
          {money(value)} · {pct(share * 100, 0)}
        </span>
      </div>
      <ProgressBar value={share} status={tint === "teal" ? "healthy" : "approaching"} />
    </div>
  );
}
