"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import type { Budget } from "@/types";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useBudgets, useTransactions } from "@/hooks/data";
import { useToast } from "@/contexts/ToastContext";
import { budgetProgress } from "@/lib/finance";
import { money } from "@/lib/currency";
import { addMonths, currentMonth, monthLabel } from "@/lib/dates";
import { PageLoader } from "@/components/ui/feedback";
import { FadeUp, NeuButton, SectionHead } from "@/components/ui/primitives";
import { ProgressBar, StatusDot } from "@/components/ui/progress";
import { ConfirmDialog } from "@/components/ui/overlay";
import { EmptyState } from "@/components/ui/feedback";
import { BudgetForm } from "@/components/budgets/BudgetForm";
import { deleteBudget } from "@/lib/firebase/budgets";

export default function BudgetsPage() {
  const { householdId, categories, loading } = useHousehold();
  const toast = useToast();
  const [month, setMonth] = useState(currentMonth());
  const { items: budgets } = useBudgets(householdId, month);
  const { items: transactions } = useTransactions(householdId);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [confirming, setConfirming] = useState<Budget | null>(null);
  const [deleting, setDeleting] = useState(false);

  const rows = useMemo(
    () =>
      budgets
        .map((b) => ({
          ...budgetProgress(b, transactions, month),
          name: categories.find((c) => c.id === b.categoryId)?.name ?? "Budget",
          color: categories.find((c) => c.id === b.categoryId)?.color,
        }))
        .sort((a, b) => b.ratio - a.ratio),
    [budgets, transactions, categories, month]
  );

  if (loading) return <PageLoader label="Loading budgets…" />;

  async function doDelete() {
    if (!confirming || !householdId) return;
    setDeleting(true);
    try {
      await deleteBudget(householdId, confirming.id);
      toast.success("Budget removed");
      setConfirming(null);
    } catch {
      toast.error("Couldn't remove the budget.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
        <SectionHead
          title="Budgets"
          subtitle="Monthly limits per category"
          action={
            <div className="flex items-center gap-2">
              <div className="neu-pill flex items-center gap-1 !py-1.5">
                <NeuButton variant="ghost" size="sm" className="!rounded-full !p-1.5" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}>
                  <ChevronLeft size={15} />
                </NeuButton>
                <span className="min-w-[92px] text-center font-display text-[12.5px] font-semibold text-ink">{monthLabel(month).replace(" ", "\u2009")}</span>
                <NeuButton variant="ghost" size="sm" className="!rounded-full !p-1.5" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))} disabled={month >= currentMonth()}>
                  <ChevronRight size={15} />
                </NeuButton>
              </div>
              <NeuButton
                variant="primary"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus size={16} aria-hidden /> Budget
              </NeuButton>
            </div>
          }
        />
      </FadeUp>

      <FadeUp delay={0.06}>
        {rows.length === 0 ? (
          <div className="neu-card">
            <EmptyState
              icon={<Wallet size={26} />}
              title="No budgets for this month"
              description="Set a limit for Food, Transport, Shopping — and both of you will get alerts before it runs out."
              action={
                <NeuButton
                  variant="primary"
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  Set your first budget
                </NeuButton>
              }
            />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((r) => (
              <div key={r.budget.id} className="neu-card flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: r.color ?? "var(--c-teal)" }} aria-hidden />
                    <span className="truncate font-display text-[15px] font-semibold text-ink">{r.name}</span>
                    {r.budget.ownership === "personal" && <span className="neu-chip !cursor-default !py-0.5 !px-2 !text-[10px]">Personal</span>}
                  </span>
                  <span className="flex gap-1">
                    <NeuButton variant="ghost" size="sm" className="!p-2" aria-label={`Edit ${r.name} budget`} onClick={() => { setEditing(r.budget); setFormOpen(true); }}>
                      <Pencil size={14} />
                    </NeuButton>
                    <NeuButton variant="ghost" size="sm" className="!p-2 text-danger" aria-label={`Delete ${r.name} budget`} onClick={() => setConfirming(r.budget)}>
                      <Trash2 size={14} />
                    </NeuButton>
                  </span>
                </div>
                <p className="font-display text-lg font-semibold text-ink">
                  {money(r.spent)} <span className="text-[13px] font-medium text-sub">/ {money(r.budget.amount)}</span>
                </p>
                <ProgressBar value={r.ratio} status={r.status} />
                <div className="flex items-center justify-between">
                  <StatusDot status={r.status} />
                  <span className="text-[12px] font-medium text-sub">
                    {r.remaining >= 0 ? `${money(r.remaining)} left` : `${money(-r.remaining)} over`} · {Math.round(r.ratio * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </FadeUp>

      <BudgetForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} month={month} />
      <ConfirmDialog
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        onConfirm={doDelete}
        loading={deleting}
        title="Remove budget?"
        message={`The ${categories.find((c) => c.id === confirming?.categoryId)?.name ?? ""} budget for ${monthLabel(month)} will be removed. Transactions stay untouched.`}
        confirmLabel="Remove"
      />
    </div>
  );
}
