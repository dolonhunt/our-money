"use client";

import { useMemo } from "react";
import { ArrowLeftRight } from "lucide-react";
import type { Transaction } from "@/types";
import { useHousehold } from "@/contexts/HouseholdContext";
import { Avatar, NeuButton } from "@/components/ui/primitives";
import { DynamicIcon } from "@/components/ui/icon";
import { dateLabel } from "@/lib/dates";
import { signedMoney } from "@/lib/currency";
import Link from "next/link";

export function RecentTransactions({ transactions }: { transactions: Transaction[] }) {
  const { categories, members } = useHousehold();

  const recent = useMemo(() => {
    return transactions
      .filter((t) => !t.deletedAt)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 5);
  }, [transactions]);

  const catOf = (id: string) => categories.find((c) => c.id === id);
  const memberOf = (uid: string | null) => members.find((m) => m.uid === uid);

  if (recent.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">Recent Transactions</h2>
        <Link href="/transactions" className="text-sm font-semibold text-teal hover:underline">
          View all
        </Link>
      </div>
      <div className="neu-card overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-[13.5px] border-collapse">
            <thead>
              <tr className="border-b border-[var(--c-border)] text-faint">
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Name</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] hidden sm:table-cell">Category</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] hidden md:table-cell">Paid By</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] hidden lg:table-cell">Date</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--c-border)]">
              {recent.map((t) => {
                const cat = catOf(t.categoryId);
                const who = memberOf(t.paidBy === "both" ? t.createdBy : t.paidBy);
                return (
                  <tr key={t.id} className="transition-colors hover:bg-[rgba(138,206,209,0.04)]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="neu-inset-sm flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ color: t.type === "income" ? "var(--c-teal)" : t.type === "transfer" ? "var(--c-text-sub)" : "var(--c-orange)" }}>
                          {t.type === "transfer" ? <ArrowLeftRight size={14} aria-hidden /> : <DynamicIcon name={cat?.icon ?? "CircleEllipsis"} size={14} />}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-ink truncate">{t.description || cat?.name}</span>
                          <div className="flex items-center gap-1.5 mt-0.5 sm:hidden">
                            <span className="text-[11px] text-sub truncate">{cat?.name}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {t.type !== "transfer" && cat ? (
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: cat.color }} aria-hidden />
                          <span className="text-sub truncate max-w-[120px]">{cat.name}</span>
                        </div>
                      ) : (
                        <span className="text-sub">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {who ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={who.displayName} photoURL={who.photoURL} size={24} />
                          <span className="text-sub truncate max-w-[100px]">{who.displayName.split(" ")[0]}</span>
                        </div>
                      ) : (
                        <span className="text-sub">Both</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-sub whitespace-nowrap">
                      {dateLabel(t.date)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {t.type !== "transfer" && t.ownership === "personal" && <span className="neu-chip !cursor-default !py-0.5 !px-1.5 !text-[9px]">Personal</span>}
                        <span className={`display-number font-semibold ${t.type === "income" ? "metric-up" : t.type === "expense" ? "metric-down" : "text-sub"}`}>
                          {signedMoney(t.type === "income" ? t.amount : -t.amount)}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
