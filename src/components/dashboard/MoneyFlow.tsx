"use client";

import { useMemo, useState } from "react";
import { lastMonths, monthLabelShort } from "@/lib/dates";
import { monthTotals } from "@/lib/finance";
import type { Transaction } from "@/types";
import { MoneyFlowChart, type FlowPoint } from "@/components/charts/NeuCharts";
import { Segmented, SectionHead } from "@/components/ui/primitives";

type Period = "1M" | "3M" | "6M" | "1Y";

/** Money flow — income vs expenses in a recessed chart well (PRD §23). */
export function MoneyFlow({ transactions, currentMonth }: { transactions: Transaction[]; currentMonth: string }) {
  const [period, setPeriod] = useState<Period>("3M");
  const months = period === "1M" ? 1 : period === "3M" ? 3 : period === "6M" ? 6 : 12;

  const data = useMemo<FlowPoint[]>(() => {
    return lastMonths(currentMonth, months).map((m) => {
      const t = monthTotals(transactions, m);
      return { label: monthLabelShort(m).replace(" ", "\u2009"), income: t.income, expense: t.expense };
    });
  }, [transactions, months, currentMonth]);

  return (
    <section aria-label="Money flow">
      <SectionHead
        title="Money Flow"
        subtitle="Income vs expenses"
        action={
          <Segmented
            ariaLabel="Period"
            value={period}
            onChange={setPeriod}
            options={(["1M", "3M", "6M", "1Y"] as Period[]).map((p) => ({ value: p, label: p }))}
          />
        }
      />
      <div className="neu-card p-4 pb-2 sm:p-5">
        <div className="neu-inset p-3 pr-1 sm:p-4 sm:pr-2">
          <MoneyFlowChart data={data} height={248} />
        </div>
        <div className="mt-3 flex items-center gap-5 px-2 pb-1 text-[12px] font-semibold text-sub">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-teal" aria-hidden /> Income
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-orange" aria-hidden /> Expenses
          </span>
        </div>
      </div>
    </section>
  );
}
