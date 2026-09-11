"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  CheckCircle2,
  Handshake,
  Percent,
  Sliders,
  TrendingUp,
  Users2,
  Save,
} from "lucide-react";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useTransactions } from "@/hooks/data";
import { addMonths, currentMonth } from "@/lib/dates";
import { money, pct } from "@/lib/currency";
import { updateHouseholdSettings } from "@/lib/firebase/households";
import { computeCoupleSettlement, type CoupleSettlementSummary } from "@/lib/settlement";
import type { HouseholdSplitRule, SplitMode } from "@/types";
import { NeuButton, Segmented } from "@/components/ui/primitives";
import { ProgressBar } from "@/components/ui/progress";
import { SettleUpModal } from "./SettleUpModal";

type PeriodChoice = "this_month" | "last_month" | "three_months" | "all_time";

export function CoupleBalanceCard() {
  const { householdId, household, members, me } = useHousehold();
  const { profile } = useAuth();
  const toast = useToast();
  const { currency: activeCurrency, showDual, format, rates } = useCurrency();
  const { items: transactions } = useTransactions(householdId);

  const [period, setPeriod] = useState<PeriodChoice>("this_month");
  const [settleOpen, setSettleOpen] = useState(false);
  const [savingRule, setSavingRule] = useState(false);

  // Active split rule in UI (defaults from household or 50/50)
  const [activeMode, setActiveMode] = useState<SplitMode>(household?.splitRule?.mode ?? "equal_50_50");
  const [customRatio0, setCustomRatio0] = useState<number>(
    household?.splitRule?.customRatio?.[members[0]?.uid] ?? 50
  );

  // Synchronize when household async data loads from Firestore
  useEffect(() => {
    if (household?.splitRule?.mode) {
      setActiveMode(household.splitRule.mode);
    }
    const m0Uid = members[0]?.uid;
    if (m0Uid && household?.splitRule?.customRatio?.[m0Uid] != null) {
      setCustomRatio0(household.splitRule.customRatio[m0Uid]);
    }
  }, [household?.splitRule, members]);

  // Filter transactions based on selected period
  const filteredTransactions = useMemo(() => {
    const thisM = currentMonth();
    const lastM = addMonths(thisM, -1);
    const threeM = addMonths(thisM, -2);

    return transactions.filter((t) => {
      const ym = t.date.slice(0, 7);
      if (period === "this_month") return ym === thisM;
      if (period === "last_month") return ym === lastM;
      if (period === "three_months") return ym >= threeM && ym <= thisM;
      return true; // all_time
    });
  }, [transactions, period]);

  // Active temporary or saved split rule
  const currentRule: HouseholdSplitRule = useMemo(() => {
    const m0Uid = members[0]?.uid;
    const m1Uid = members[1]?.uid;
    return {
      mode: activeMode,
      customRatio:
        m0Uid && m1Uid
          ? {
              [m0Uid]: customRatio0,
              [m1Uid]: 100 - customRatio0,
            }
          : undefined,
    };
  }, [activeMode, customRatio0, members]);

  // Compute settlement with active currency FX rates
  const summary: CoupleSettlementSummary = useMemo(() => {
    return computeCoupleSettlement(filteredTransactions, members, currentRule, rates);
  }, [filteredTransactions, members, currentRule, rates]);

  const solo = members.length < 2;

  async function handleSaveRule() {
    if (!householdId) return;
    setSavingRule(true);
    try {
      await updateHouseholdSettings(householdId, {
        splitRule: currentRule,
      });
      toast.success("Default split rule updated for the household!");
    } catch {
      toast.error("Couldn't save split rule.");
    } finally {
      setSavingRule(false);
    }
  }

  if (solo) {
    return null; // Only show settlement card when both partners are present
  }

  const [c0, c1] = summary.contributions;
  const m0Name = members[0]?.displayName?.split(" ")[0] ?? "Partner 1";
  const m1Name = members[1]?.displayName?.split(" ")[0] ?? "Partner 2";

  return (
    <div className="neu-card flex flex-col gap-5 p-6" aria-label="Couple Balance & Settlement">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="neu-inset-sm flex h-9 w-9 items-center justify-center rounded-full text-teal">
            <Users2 size={17} />
          </span>
          <div>
            <h3 className="font-display text-[16px] font-semibold text-ink">Couple Balance & Split</h3>
            <p className="text-[12px] text-sub">PRD §14 couple balance, split modes, and settlements</p>
          </div>
        </div>

        {/* Period filter */}
        <Segmented
          ariaLabel="Settlement Period"
          value={period}
          onChange={(v) => setPeriod(v as PeriodChoice)}
          options={[
            { value: "this_month", label: "This Month" },
            { value: "last_month", label: "Last Month" },
            { value: "three_months", label: "3 Months" },
            { value: "all_time", label: "All Time" },
          ]}
        />
      </div>

      {/* Split Mode Selector */}
      <div className="neu-inset flex flex-col gap-3 p-4 rounded-2xl bg-[rgba(138,206,209,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
            <Sliders size={13} className="text-teal" />
            Split Rule Mode
          </span>
          <div className="flex items-center gap-2">
            <Segmented
              ariaLabel="Split Mode"
              value={activeMode}
              onChange={(v) => setActiveMode(v as SplitMode)}
              options={[
                { value: "equal_50_50", label: "50 / 50 Equal" },
                { value: "income_proportional", label: "Income Ratio" },
                { value: "custom_ratio", label: "Custom %" },
              ]}
            />
            <NeuButton
              size="sm"
              variant="ghost"
              loading={savingRule}
              onClick={handleSaveRule}
              className="!px-2.5 !py-1 text-[11px] text-teal"
              title="Save this split rule as the household default"
            >
              <Save size={12} className="mr-1 inline" /> Save Default
            </NeuButton>
          </div>
        </div>

        {/* Mode context hints */}
        {activeMode === "equal_50_50" && (
          <p className="text-[11.5px] text-sub">
            Shared expenses are split 50% / 50% equally between both partners regardless of income.
          </p>
        )}

        {activeMode === "income_proportional" && (
          <div className="flex flex-col gap-1.5 text-[11.5px] text-sub">
            <p>
              Split proportionally according to each partner&apos;s recorded income for this period:
            </p>
            <div className="flex items-center gap-4 font-mono text-xs">
              <span>{m0Name}: {format(c0?.income ?? 0)} ({pct((c0?.targetRatio ?? 0.5) * 100, 0)})</span>
              <span>{m1Name}: {format(c1?.income ?? 0)} ({pct((c1?.targetRatio ?? 0.5) * 100, 0)})</span>
            </div>
          </div>
        )}

        {activeMode === "custom_ratio" && (
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex justify-between text-xs font-semibold text-ink">
              <span>{m0Name}: {customRatio0}%</span>
              <span>{m1Name}: {100 - customRatio0}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={customRatio0}
              onChange={(e) => setCustomRatio0(Number(e.target.value))}
              className="w-full accent-teal cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Breakdown Cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {summary.contributions.map((c) => {
          const isMe = c.member.uid === profile?.uid;
          return (
            <div key={c.member.uid} className="neu-inset flex flex-col gap-3 p-4 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-ink flex items-center gap-1.5">
                  {c.member.displayName} {isMe && <span className="text-[11px] text-faint font-normal">(you)</span>}
                </span>
                <span className="text-xs font-mono text-sub">Target: {pct(c.targetRatio * 100, 0)} ({format(c.targetShare)})</span>
              </div>

              <div>
                <div className="flex justify-between text-[11.5px] text-sub mb-1">
                  <span>Paid for shared</span>
                  <span className="font-bold text-ink display-number">{format(c.sharedPaid)}</span>
                </div>
                <ProgressBar
                  value={summary.totalShared > 0 ? c.sharedPaid / summary.totalShared : 0.5}
                />
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-[var(--c-border)]/40 text-[11.5px]">
                <span className="text-sub">Net position:</span>
                <span
                  className={`font-bold display-number ${
                    c.netBalance > 0
                      ? "metric-up"
                      : c.netBalance < 0
                        ? "metric-down"
                        : "text-sub"
                  }`}
                >
                  {c.netBalance > 0
                    ? `+${format(c.netBalance)} (overpaid)`
                    : c.netBalance < 0
                      ? `-${format(Math.abs(c.netBalance))} (underpaid)`
                      : "Balanced"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Settlement Callout */}
      <div className="neu-card flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-surface">
        <div className="flex items-center gap-3">
          <div
            className={`neu-inset-sm flex h-11 w-11 items-center justify-center rounded-full ${
              summary.isSettled ? "text-teal" : "text-orange"
            }`}
          >
            {summary.isSettled ? <CheckCircle2 size={22} /> : <Handshake size={22} />}
          </div>
          <div>
            {summary.isSettled ? (
              <>
                <p className="font-display text-sm font-bold text-ink">Everything is settled</p>
                <p className="text-xs text-sub">Both partners are even on shared expenses for this period.</p>
              </>
            ) : (
              <>
                <p className="font-display text-sm font-bold text-ink">
                  {summary.owesMember?.displayName.split(" ")[0]} owes {summary.owedMember?.displayName.split(" ")[0]}
                </p>
                <p className="text-xs text-sub">
                  Transfer <span className="font-bold text-teal">{format(summary.settleAmount)}</span>
                  {showDual && activeCurrency !== "BDT" && (
                    <span className="ml-1 text-[11px] font-mono text-faint">
                      (≈ ৳{Math.round(summary.settleAmount * 100) / 100})
                    </span>
                  )} to balance out.
                </p>
              </>
            )}
          </div>
        </div>

        <NeuButton
          variant={summary.isSettled ? "ghost" : "primary"}
          size="md"
          onClick={() => setSettleOpen(true)}
          className="flex items-center gap-2"
        >
          <Handshake size={16} />
          {summary.isSettled ? "Settlement Details" : `Settle Up (${format(summary.settleAmount)})`}
        </NeuButton>
      </div>

      {/* Settle Up Modal */}
      <SettleUpModal
        open={settleOpen}
        onClose={() => setSettleOpen(false)}
        summary={summary}
      />
    </div>
  );
}
