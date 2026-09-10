"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileSpreadsheet, Plus } from "lucide-react";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useQuickAdd } from "@/contexts/QuickAddContext";
import { useTransactions } from "@/hooks/data";
import { PageLoader } from "@/components/ui/feedback";
import { FadeUp, NeuButton, SectionHead } from "@/components/ui/primitives";
import { TransactionList, type TxFilters } from "@/components/transactions/TransactionList";
import { CSVImportExportModal } from "@/components/transactions/CSVImportExportModal";
import { monthRange, todayISO } from "@/lib/dates";

function TransactionsInner() {
  const params = useSearchParams();
  const { householdId, loading } = useHousehold();
  const { open } = useQuickAdd();
  const { items: transactions } = useTransactions(householdId);
  const [preset, setPreset] = useState<Partial<TxFilters>>({});
  const [csvOpen, setCsvOpen] = useState(false);
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
            <div className="flex gap-2">
              <NeuButton variant="ghost" size="sm" onClick={() => setCsvOpen(true)}>
                <FileSpreadsheet size={15} aria-hidden /> CSV
              </NeuButton>
              <NeuButton variant="primary" size="sm" onClick={() => open("expense")}>
                <Plus size={15} aria-hidden /> Add
              </NeuButton>
            </div>
          }
        />
      </FadeUp>
      <FadeUp delay={0.06}>
        <TransactionList transactions={scoped} presetFilters={preset} />
      </FadeUp>

      <CSVImportExportModal
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        transactions={transactions}
      />
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
