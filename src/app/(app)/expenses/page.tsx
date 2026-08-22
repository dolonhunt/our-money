"use client";

import { Plus, TrendingDown } from "lucide-react";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useQuickAdd } from "@/contexts/QuickAddContext";
import { useTransactions } from "@/hooks/data";
import { monthTotals } from "@/lib/finance";
import { money } from "@/lib/currency";
import { currentMonth } from "@/lib/dates";
import { PageLoader } from "@/components/ui/feedback";
import { FadeUp, NeuButton, SectionHead } from "@/components/ui/primitives";
import { TransactionList } from "@/components/transactions/TransactionList";

export default function ExpensesPage() {
  const { householdId, loading } = useHousehold();
  const { open } = useQuickAdd();
  const { items: transactions } = useTransactions(householdId);

  if (loading) return <PageLoader label="Loading expenses…" />;

  const month = currentMonth();
  const totals = monthTotals(transactions, month);
  const expenseTx = transactions.filter((t) => t.type === "expense");

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
        <SectionHead
          title="Expenses"
          subtitle={`${money(totals.expense)} spent this month`}
          action={
            <NeuButton variant="peach" onClick={() => open("expense")}>
              <Plus size={16} aria-hidden /> Add expense
            </NeuButton>
          }
        />
      </FadeUp>
      <FadeUp delay={0.06}>
        <TransactionList transactions={expenseTx} presetFilters={{ type: "expense" }} presetLabel="Expenses" />
      </FadeUp>
      <span className="sr-only">
        <TrendingDown size={1} aria-hidden /> Track shared and personal spending across all categories.
      </span>
    </div>
  );
}
