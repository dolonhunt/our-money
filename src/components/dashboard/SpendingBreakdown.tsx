"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { money, pct } from "@/lib/currency";
import type { Category, Transaction } from "@/types";
import { categoryBreakdown } from "@/lib/finance";
import { SpendingDonut } from "@/components/charts/NeuCharts";
import { EmptyState } from "@/components/ui/feedback";
import { PieChart } from "lucide-react";
import { SectionHead } from "@/components/ui/primitives";

/** "Where Our Money Goes" — donut + interactive legend (PRD §24–25). */
export function SpendingBreakdown({ transactions, categories, month }: { transactions: Transaction[]; categories: Category[]; month: string }) {
  const router = useRouter();

  const slices = useMemo(() => {
    return categoryBreakdown(transactions, month).map((s) => {
      const cat = categories.find((c) => c.id === s.categoryId);
      return {
        key: s.categoryId,
        name: cat?.name ?? "Other",
        value: s.amount,
        color: cat?.color ?? "#B9C4C9",
        count: s.count,
        share: s.share,
      };
    });
  }, [transactions, categories, month]);

  const total = slices.reduce((s, x) => s + x.value, 0);

  const openCategory = (categoryId: string) => router.push(`/transactions?category=${categoryId}`);

  return (
    <section aria-label="Spending breakdown">
      <SectionHead title="Where Our Money Goes" subtitle="This month by category" />
      <div className="neu-card p-5">
        {slices.length === 0 ? (
          <EmptyState
            icon={<PieChart size={26} />}
            title="Nothing spent yet"
            description="Expenses you add will light up this ring."
          />
        ) : (
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <div className="h-[220px] w-[220px] shrink-0 sm:h-[230px] sm:w-[230px]">
              <SpendingDonut
                slices={slices}
                centerLabel="Spent"
                centerValue={money(total)}
                onSliceClick={openCategory}
              />
            </div>
            <ul className="w-full min-w-0 flex-1 space-y-1.5" aria-label="Categories">
              {slices.map((s) => (
                <li key={s.key}>
                  <button
                    onClick={() => openCategory(s.key)}
                    className="neu-btn flex w-full items-center gap-3 !rounded-2xl px-3.5 py-2.5 text-left"
                    aria-label={`Open ${s.name} transactions`}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">{s.name}</span>
                    <span className="text-[11px] text-faint">{s.count}×</span>
                    <span className="w-12 text-right text-[12px] font-semibold text-sub">{pct(s.share * 100, 0)}</span>
                    <span className="w-[76px] text-right font-display text-[13.5px] font-semibold text-ink">{money(s.value)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
