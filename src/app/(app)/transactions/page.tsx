"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useQuickAdd } from "@/contexts/QuickAddContext";
import { useTransactions } from "@/hooks/data";
import { PageLoader } from "@/components/ui/feedback";
import { FadeUp, NeuButton, SectionHead } from "@/components/ui/primitives";
import { TransactionList, type TxFilters } from "@/components/transactions/TransactionList";
import { monthRange, todayISO } from "@/lib/dates";

function TransactionsInner() {
  const params = useSearchParams();
  const { householdId, loading } = useHousehold();
  const { open } = useQuickAdd();
  const { items: transactions } = useTransactions(householdId);
  const [preset, setPreset] = useState<Partial<TxFilters>>({});
  const categoryParam = params.get("category");
  const monthParam = params.get("month");

  useEffect(() => {
    if (categoryParam) setPreset({ categoryId: categoryParam });
  }, [categoryParam]);

  if (loading) return <PageLoader label="Loading transactions…" />;

  // Month window from optional ?month= (default: current month)
  const month = monthParam ?? todayISO().slice(0, 7);
  const { start, end } = monthRange(month);
  const scoped = transactions.filter((t) => t.date >= start && t.date <= end);

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
        <SectionHead
          title="Transactions"
          subtitle={`${scoped.filter((t) => !t.deletedAt).length} this month · all money in and out`}
          action={
            <NeuButton variant="primary" onClick={() => open("expense")}>
              <Plus size={16} aria-hidden /> Add
            </NeuButton>
          }
        />
      </FadeUp>
      <FadeUp delay={0.06}>
        <TransactionList transactions={scoped} presetFilters={preset} />
      </FadeUp>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading transactions…" />}>
      <TransactionsInner />
    </Suspense>
  );
}
