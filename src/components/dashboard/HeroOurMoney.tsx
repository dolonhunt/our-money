"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { money, pct, signedMoney } from "@/lib/currency";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Avatar } from "@/components/ui/primitives";
import type { HouseholdMember } from "@/types";

export function HeroOurMoney({
  balance,
  income,
  expense,
  net,
  savingsRate,
  incomeDelta,
  expenseDelta,
  members,
  children,
}: {
  balance: number;
  income: number;
  expense: number;
  net: number;
  savingsRate: number;
  incomeDelta: number | null;
  expenseDelta: number | null;
  members?: HouseholdMember[];
  children?: ReactNode;
}) {
  const { currency, showDual, format } = useCurrency();

  return (
    <section className="relative overflow-hidden rounded-[26px] p-6 sm:p-8 bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] text-white shadow-neuPop" aria-label="Our money overview">
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full border-[26px] border-white/5" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-white/5" aria-hidden />
      <div className="pointer-events-none absolute right-40 top-10 h-10 w-10 rounded-full bg-white/10" aria-hidden />

      {members && members.length > 0 && (
        <div className="absolute top-6 right-6 flex -space-x-2">
          {members.slice(0, 2).map((m, i) => (
            <Avatar key={m.uid} name={m.displayName} photoURL={m.photoURL} size={36} ring={i === 0 ? "mint" : "peach"} />
          ))}
          {members.length < 2 && <span className="neu-inset-sm flex h-[36px] w-[36px] items-center justify-center rounded-full text-white/50 bg-white/10">＋</span>}
        </div>
      )}

      <p className="font-display text-[12px] font-semibold uppercase tracking-[0.22em] text-white/70">Our money</p>
      <motion.p
        key={balance}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="display-number mt-2 text-[44px] text-white sm:text-[56px]"
      >
        {money(balance)}
      </motion.p>
      {showDual && (
        <p className="text-xs font-mono text-white/75 -mt-1 mb-1">
          ≈ {format(balance, { fromCurrency: "BDT", targetCurrency: currency === "BDT" ? "USD" : currency })}
        </p>
      )}
      <p className="mt-1 text-[13px] font-medium text-white/80">Available balance</p>

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <HeroChip label="Income" value={money(income)} delta={incomeDelta} good />
        <HeroChip label="Expenses" value={money(expense)} delta={expenseDelta} />
        <HeroChip label="Savings" value={money(net)} plain={signedMoney(net)} />
        <HeroChip label="Savings rate" value={pct(savingsRate * 100, 1)} plain={pct(savingsRate * 100, 1)} />
      </div>

      {/* Subtle sparkline */}
      <div className="absolute bottom-0 left-0 right-0 h-12 opacity-30 pointer-events-none">
        <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full">
          <path d="M0,20 L0,15 L10,12 L20,16 L30,10 L40,14 L50,8 L60,11 L70,5 L80,9 L90,2 L100,6 L100,20 Z" fill="rgba(255,255,255,0.2)" />
          <path d="M0,15 L10,12 L20,16 L30,10 L40,14 L50,8 L60,11 L70,5 L80,9 L90,2 L100,6" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5" />
        </svg>
      </div>

      {children}
    </section>
  );
}

function HeroChip({ label, value, delta, good, plain }: { label: string; value: string; delta?: number | null; good?: boolean; plain?: string }) {
  return (
    <div className="flex min-w-[118px] flex-col gap-0.5 px-4 py-2.5 rounded-[14px] bg-white/10 backdrop-blur-sm border border-white/5">
      <span className="text-[10.5px] font-bold uppercase tracking-wider text-white/60">{label}</span>
      <span className="font-display text-[15px] font-semibold text-white">{plain ?? value}</span>
      {delta != null && (
        <span className={`text-[11px] font-semibold ${delta >= 0 === Boolean(good) ? "text-mint" : "text-peach"}`}>
          {delta >= 0 ? "+" : ""}
          {delta.toFixed(1)}% vs last month
        </span>
      )}
    </div>
  );
}
