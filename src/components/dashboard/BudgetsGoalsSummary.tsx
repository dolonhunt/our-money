"use client";

import Link from "next/link";
import { Target, Wallet } from "lucide-react";
import type { Budget, Category, Goal, Transaction } from "@/types";
import { budgetProgress } from "@/lib/finance";
import { money } from "@/lib/currency";
import { ProgressBar, ProgressRing, StatusDot } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/feedback";
import { DynamicIcon } from "@/components/ui/icon";
import { SectionHead } from "@/components/ui/primitives";

/** Dashboard budgets overview with soft progress bars (PRD §27). */
export function BudgetsSummary({ budgets, transactions, categories, month }: { budgets: Budget[]; transactions: Transaction[]; categories: Category[]; month: string }) {
  const rows = budgets
    .map((b) => ({ ...budgetProgress(b, transactions, month), name: categories.find((c) => c.id === b.categoryId)?.name ?? "Budget", color: categories.find((c) => c.id === b.categoryId)?.color }))
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 4);

  return (
    <section aria-label="Budgets overview">
      <SectionHead
        title="Budgets"
        subtitle="This month"
        action={
          <Link href="/budgets" className="text-[13px] font-semibold text-teal hover:underline">
            Manage →
          </Link>
        }
      />
      <div className="neu-card flex flex-col gap-4 p-5">
        {rows.length === 0 ? (
          <EmptyState icon={<Wallet size={26} />} title="No budgets yet" description="Set monthly limits per category to stay on track together." />
        ) : (
          rows.map((r) => (
            <div key={r.budget.id}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
                  <span className="h-2 w-2 rounded-full" style={{ background: r.color ?? "var(--c-teal)" }} aria-hidden />
                  {r.name}
                </span>
                <span className="text-[12px] font-medium text-sub">
                  {money(r.spent)} / {money(r.budget.amount)}
                </span>
              </div>
              <ProgressBar value={r.ratio} status={r.status} />
              <div className="mt-1 flex items-center justify-between">
                <StatusDot status={r.status} />
                <span className="text-[11.5px] font-bold text-sub">{Math.round(r.ratio * 100)}%</span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

/** Dashboard goals overview with ring visualizations (PRD §28). */
export function GoalsSummary({ goals }: { goals: Goal[] }) {
  const rows = goals.slice(0, 3);
  return (
    <section aria-label="Goals overview">
      <SectionHead
        title="Goals"
        subtitle="Saving together"
        action={
          <Link href="/goals" className="text-[13px] font-semibold text-teal hover:underline">
            All goals →
          </Link>
        }
      />
      <div className="neu-card p-5">
        {rows.length === 0 ? (
          <EmptyState icon={<Target size={26} />} title="Dream together" description="Vacation, emergency fund, new home — start your first goal." />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-3">
            {rows.map((g) => {
              const ratio = g.targetAmount > 0 ? g.currentAmount / g.targetAmount : 0;
              return (
                <li key={g.id} className="flex items-center gap-4">
                  <ProgressRing value={ratio} size={84} thickness={8} color={ratio >= 1 ? "var(--c-teal-deep)" : "var(--c-teal)"}>
                    <DynamicIcon name={g.icon} size={17} className="text-teal" />
                  </ProgressRing>
                  <div className="min-w-0">
                    <p className="truncate font-display text-[14px] font-semibold text-ink">{g.name}</p>
                    <p className="mt-0.5 text-[12px] text-sub">
                      {money(g.currentAmount)} / {money(g.targetAmount)}
                    </p>
                    <p className="mt-0.5 text-[12px] font-bold text-teal">{Math.round(ratio * 100)}%</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
