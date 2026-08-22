"use client";

import { useMemo, useState } from "react";
import { BarChart3, Users2 } from "lucide-react";
import type { Ownership } from "@/types";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useBudgets, useTransactions } from "@/hooks/data";
import { addMonths, currentMonth, monthLabel } from "@/lib/dates";
import { activeTransactions, budgetProgress, categoryBreakdown, monthTotals } from "@/lib/finance";
import { money, pct } from "@/lib/currency";
import { EmptyState, PageLoader } from "@/components/ui/feedback";
import { FadeUp, NeuButton, SectionHead, Segmented } from "@/components/ui/primitives";
import { ProgressBar } from "@/components/ui/progress";
import { MoneyFlowChart } from "@/components/charts/NeuCharts";
import { Avatar } from "@/components/ui/primitives";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Tab = "summary" | "categories" | "couple" | "budgets";

export default function ReportsPage() {
  const { householdId, categories, members, loading } = useHousehold();
  const [month, setMonth] = useState(currentMonth());
  const [tab, setTab] = useState<Tab>("summary");
  const { items: transactions } = useTransactions(householdId);
  const { items: budgets } = useBudgets(householdId, month);

  const totals = useMemo(() => monthTotals(transactions, month), [transactions, month]);
  const prevTotals = useMemo(() => monthTotals(transactions, addMonths(month, -1)), [transactions, month]);
  const breakdown = useMemo(() => categoryBreakdown(transactions, month), [transactions, month]);
  const prevBreakdown = useMemo(() => categoryBreakdown(transactions, addMonths(month, -1)), [transactions, month]);
  const budgetRows = useMemo(() => budgets.map((b) => ({ ...budgetProgress(b, transactions, month), name: categories.find((c) => c.id === b.categoryId)?.name ?? "Budget" })), [budgets, transactions, categories, month]);

  const coupleRows = useMemo(() => {
    const rows = members.map((m) => ({ member: m, paid: 0, personal: 0, shared: 0 }));
    const byUid = Object.fromEntries(rows.map((r) => [r.member.uid, r]));
    for (const t of activeTransactions(transactions)) {
      if (t.type !== "expense") continue;
      if (t.date.slice(0, 7) !== month) continue;
      const payer = t.paidBy === "both" ? null : byUid[t.paidBy];
      if (payer) payer.paid += t.amount;
      if (t.ownership === "personal" && payer) payer.personal += t.amount;
      if (t.ownership === "shared") {
        // count shared spend to every member row for context
        for (const r of rows) r.shared += t.amount / rows.length;
      }
    }
    return rows;
  }, [transactions, members, month]);

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
    { value: "couple" as Tab, label: "Couple" },
    { value: "budgets" as Tab, label: "Budgets" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
        <SectionHead
          title="Reports"
          subtitle="How are we doing financially together?"
          action={
            <div className="neu-pill flex items-center gap-1 !py-1.5">
              <NeuButton variant="ghost" size="sm" className="!rounded-full !p-1.5" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}>
                <ChevronLeft size={15} />
              </NeuButton>
              <span className="min-w-[96px] text-center font-display text-[12.5px] font-semibold text-ink">{monthLabel(month)}</span>
              <NeuButton variant="ghost" size="sm" className="!rounded-full !p-1.5" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))} disabled={month >= currentMonth()}>
                <ChevronRight size={15} />
              </NeuButton>
            </div>
          }
        />
      </FadeUp>

      <FadeUp delay={0.04}>
        <Segmented ariaLabel="Report section" value={tab} onChange={setTab} options={tabOptions} />
      </FadeUp>

      {tab === "summary" && (
        <FadeUp className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Income" value={money(totals.income)} sub={`${totals.income - prevTotals.income >= 0 ? "+" : ""}${money(totals.income - prevTotals.income)} vs last month`} />
            <Stat label="Expenses" value={money(totals.expense)} sub={`${totals.expense - prevTotals.expense >= 0 ? "+" : ""}${money(totals.expense - prevTotals.expense)} vs last month`} />
            <Stat label="Savings" value={money(totals.net)} sub={`Rate ${pct(totals.savingsRate * 100, 1)}`} />
            <Stat label="Top category" value={breakdown[0] ? categories.find((c) => c.id === breakdown[0].categoryId)?.name ?? "—" : "—"} sub={breakdown[0] ? money(breakdown[0].amount) : "No spending"} />
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
              <EmptyState icon={<BarChart3 size={24} />} title="Nothing to analyze yet" description="Add expenses this month to see the breakdown." />
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

      {tab === "categories" && (
        <FadeUp>
          <div className="neu-card p-5">
            <h3 className="mb-4 ml-1 font-display text-[15px] font-semibold text-ink">Category analysis — {monthLabel(month)}</h3>
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

      {tab === "couple" && (
        <FadeUp className="flex flex-col gap-6">
          <div className="neu-card p-5">
            <h3 className="mb-1 flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
              <Users2 size={17} className="text-teal" aria-hidden /> Couple contribution
            </h3>
            <p className="mb-4 ml-0.5 text-[12.5px] text-sub">Who paid for what this month — shared spending is split evenly for context.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {coupleRows.map((r) => {
                const totalPaid = coupleRows.reduce((s, x) => s + x.paid, 0) || 1;
                return (
                  <div key={r.member.uid} className="neu-inset flex flex-col gap-3 p-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.member.displayName} photoURL={r.member.photoURL} size={40} ring={members[0]?.uid === r.member.uid ? "mint" : "peach"} />
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-ink">{r.member.displayName}</p>
                        <p className="text-[11.5px] text-sub">{r.member.role === "owner" ? "Owner" : "Member"}</p>
                      </div>
                      <span className="ml-auto display-number text-[17px] text-ink">{money(r.paid)}</span>
                    </div>
                    <ProgressBar value={r.paid / totalPaid} />
                    <div className="flex justify-between text-[11.5px] text-sub">
                      <span>Personal {money(r.personal)}</span>
                      <span>{Math.round((r.paid / totalPaid) * 100)}% of paid expenses</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="neu-card p-5">
            <h3 className="mb-4 ml-1 font-display text-[15px] font-semibold text-ink">Shared vs personal</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <SplitBar label="Shared spending" value={ownershipSplit.shared} total={ownershipSplit.shared + ownershipSplit.personal} tint="teal" />
              <SplitBar label="Personal spending" value={ownershipSplit.personal} total={ownershipSplit.shared + ownershipSplit.personal} tint="peach" />
            </div>
          </div>
        </FadeUp>
      )}

      {tab === "budgets" && (
        <FadeUp>
          <div className="neu-card p-5">
            <h3 className="mb-4 ml-1 font-display text-[15px] font-semibold text-ink">Budget performance — {monthLabel(month)}</h3>
            {budgetRows.length === 0 ? (
              <EmptyState icon={<BarChart3 size={24} />} title="No budgets set" description="Set budgets to compare plan vs actual spending." />
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
                        <td className={`py-2.5 text-right font-semibold ${r.remaining < 0 ? "text-danger" : "text-sub"}`}>{money(r.remaining)}</td>
                        <td className="py-2.5 pr-1 text-right">
                          <span className={`font-bold ${r.status === "over" ? "text-danger" : r.status === "healthy" ? "text-teal" : "text-orange"}`}>{Math.round(r.ratio * 100)}%</span>
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

function SplitBar({ label, value, total, tint }: { label: string; value: number; total: number; tint: "teal" | "peach" }) {
  const share = total > 0 ? value / total : 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-[13px]">
        <span className="font-semibold text-ink">{label}</span>
        <span className="text-sub">{money(value)} · {pct(share * 100, 0)}</span>
      </div>
      <ProgressBar value={share} status={tint === "teal" ? "healthy" : "approaching"} />
    </div>
  );
}
