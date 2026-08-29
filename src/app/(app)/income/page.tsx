"use client";

import { Banknote, Plus } from "lucide-react";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useQuickAdd } from "@/contexts/QuickAddContext";
import { useTransactions } from "@/hooks/data";
import { monthTotals } from "@/lib/finance";
import { money } from "@/lib/currency";
import { currentMonth } from "@/lib/dates";
import { PageLoader } from "@/components/ui/feedback";
import { FadeUp, NeuButton, SectionHead } from "@/components/ui/primitives";
import { TransactionList } from "@/components/transactions/TransactionList";

export default function IncomePage() {
  const { householdId, loading } = useHousehold();
  const { open } = useQuickAdd();
  const { items: transactions } = useTransactions(householdId);

  if (loading) return <PageLoader label="Loading income…" />;

  const month = currentMonth();
  const totals = monthTotals(transactions, month);
  const incomeTx = transactions.filter((t) => t.type === "income");

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
        <SectionHead
          title="Income"
          subtitle={`${money(totals.income)} earned this month`}
          action={
            <NeuButton variant="primary" onClick={() => open("income")}>
              <Plus size={16} aria-hidden /> Add income
            </NeuButton>
          }
        />
      </FadeUp>
      <FadeUp delay={0.06}>
        <TransactionList transactions={incomeTx} presetFilters={{ type: "income" }} presetLabel="Income" />
      </FadeUp>
      <span className="sr-only">
        <Banknote size={1} aria-hidden /> Salary, freelance, business, bonus, investment and other income.
      </span>
    </div>
  );
}
