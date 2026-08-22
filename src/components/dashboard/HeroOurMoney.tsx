"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { money, pct, signedMoney } from "@/lib/currency";

/**
 * "OUR MONEY" hero — raised panel, dominant balance, decorative rings,
 * mint/peach accents (PRD §21–22). The visual anchor of the dashboard.
 */
export function HeroOurMoney({
  balance,
  income,
  expense,
  net,
  savingsRate,
  incomeDelta,
  expenseDelta,
  children,
}: {
  balance: number;
  income: number;
  expense: number;
  net: number;
  savingsRate: number;
  incomeDelta: number | null;
  expenseDelta: number | null;
  children?: ReactNode;
}) {
  return (
    <section className="neu-card relative overflow-hidden p-6 sm:p-8" aria-label="Our money overview">
      {/* Decorative 3D rings — restrained, behind content (PRD §11) */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full border-[26px] border-mint/25" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-peach/15" aria-hidden />
      <div className="pointer-events-none absolute right-40 top-10 h-10 w-10 rounded-full bg-mint/40 shadow-neuSm" aria-hidden />

      <p className="font-display text-[12px] font-semibold uppercase tracking-[0.22em] text-sub">Our money</p>
      <motion.p
        key={balance}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="display-number mt-2 text-[44px] text-ink sm:text-[56px]"
      >
        {money(balance)}
      </motion.p>
      <p className="mt-1 text-[13px] font-medium text-sub">Available balance</p>

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <HeroChip label="Income" value={money(income)} delta={incomeDelta} good />
        <HeroChip label="Expenses" value={money(expense)} delta={expenseDelta} />
        <HeroChip label="Savings" value={money(net)} plain={signedMoney(net)} />
        <HeroChip label="Savings rate" value={pct(savingsRate * 100, 1)} plain={pct(savingsRate * 100, 1)} />
      </div>
      {children}
    </section>
  );
}

function HeroChip({ label, value, delta, good, plain }: { label: string; value: string; delta?: number | null; good?: boolean; plain?: string }) {
  return (
    <div className="neu-inset-sm flex min-w-[118px] flex-col gap-0.5 px-4 py-2.5">
      <span className="text-[10.5px] font-bold uppercase tracking-wider text-faint">{label}</span>
      <span className="font-display text-[15px] font-semibold text-ink">{plain ?? value}</span>
      {delta != null && (
        <span className={`text-[11px] font-semibold ${delta >= 0 === Boolean(good) ? "metric-up" : "metric-down"}`}>
          {delta >= 0 ? "+" : ""}
          {delta.toFixed(1)}% vs last month
        </span>
      )}
    </div>
  );
}
