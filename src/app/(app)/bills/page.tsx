"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock, Pencil, Plus, Radio, Receipt, Sparkles, Trash2, Zap } from "lucide-react";
import type { Bill } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useBills } from "@/hooks/data";
import { useToast } from "@/contexts/ToastContext";
import { billStatus, deleteBill, markBillUnpaid, payBill, type BillStatus } from "@/lib/firebase/bills";
import { money } from "@/lib/currency";
import { dateLabel } from "@/lib/dates";
import { computeSubscriptionMetrics } from "@/lib/forecast";
import { EmptyState, PageLoader } from "@/components/ui/feedback";
import { FadeUp, NeuButton, SectionHead, Segmented } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/overlay";
import { BillForm } from "@/components/bills/BillForm";

const STATUS_STYLE: Record<BillStatus, { chip: string; label: string }> = {
  upcoming: { chip: "!text-teal", label: "Upcoming" },
  "due-soon": { chip: "!text-amber", label: "Due soon" },
  overdue: { chip: "!text-danger", label: "Overdue" },
  paid: { chip: "!text-faint", label: "Paid" },
};

type ViewTab = "all" | "bills" | "subscriptions" | "intelligence";

export default function BillsPage() {
  const { profile } = useAuth();
  const { householdId, memberUids, loading } = useHousehold();
  const { items: bills } = useBills(householdId);
  const toast = useToast();

  const [tab, setTab] = useState<ViewTab>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);
  const [confirming, setConfirming] = useState<Bill | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);

  const subMetrics = useMemo(() => computeSubscriptionMetrics(bills), [bills]);

  const { pending, paid } = useMemo(() => {
    const filtered = bills.filter((b) => {
      const isSub =
        b.isSubscription ||
        b.recurring === "monthly" ||
        b.recurring === "yearly" ||
        b.name.toLowerCase().includes("netflix") ||
        b.name.toLowerCase().includes("spotify") ||
        b.name.toLowerCase().includes("wifi") ||
        b.name.toLowerCase().includes("internet");

      if (tab === "bills") return !isSub;
      if (tab === "subscriptions") return isSub;
      return true;
    });

    const sorted = [...filtered].sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
    return {
      pending: sorted.filter((b) => !b.paid),
      paid: sorted.filter((b) => b.paid).reverse(),
    };
  }, [bills, tab]);

  if (loading) return <PageLoader label="Loading bills & subscriptions…" />;

  async function doDelete() {
    if (!confirming || !householdId) return;
    setDeleting(true);
    try {
      await deleteBill(householdId, confirming.id);
      toast.success("Bill deleted");
      setConfirming(null);
    } catch {
      toast.error("Couldn't delete the bill.");
    } finally {
      setDeleting(false);
    }
  }

  async function doPay(bill: Bill) {
    if (!householdId || !profile) return;
    setPaying(bill.id);
    try {
      await payBill(householdId, bill, profile.uid, memberUids);
      toast.success(`${bill.name} paid — expense recorded`);
    } catch {
      toast.error("Couldn't record the payment. Try again.");
    } finally {
      setPaying(null);
    }
  }

  const totalPending = pending.reduce((s, b) => s + b.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
        <SectionHead
          title="Bills & Subscriptions"
          subtitle={
            pending.length
              ? `${pending.length} upcoming · ${money(totalPending)} due`
              : "All caught up on bills and subscriptions!"
          }
          action={
            <NeuButton
              variant="primary"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus size={16} aria-hidden /> Add Bill / Sub
            </NeuButton>
          }
        />
      </FadeUp>

      {/* Subscription Intelligence Quick Summary */}
      <FadeUp delay={0.04}>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="neu-card-sm flex flex-col gap-1 p-4">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-faint">Monthly Subscriptions</span>
            <span className="display-number text-[20px] text-ink">{money(subMetrics.totalMonthlyEquivalent)}</span>
            <span className="text-[11px] text-sub">Monthly run-rate</span>
          </div>

          <div className="neu-card-sm flex flex-col gap-1 p-4">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-faint">Annualized Cost</span>
            <span className="display-number text-[20px] text-ink">{money(subMetrics.totalAnnualEquivalent)}</span>
            <span className="text-[11px] text-sub">Yearly commitment</span>
          </div>

          <div className="neu-card-sm flex flex-col gap-1 p-4">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-faint">Active Services</span>
            <span className="display-number text-[20px] text-teal">{subMetrics.activeCount}</span>
            <span className="text-[11px] text-sub">Recurring services</span>
          </div>

          <div className="neu-card-sm flex flex-col gap-1 p-4">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-faint">Renewing in 7 Days</span>
            <span className={`display-number text-[20px] ${subMetrics.renewingIn7DaysCount > 0 ? "text-amber" : "text-teal"}`}>
              {subMetrics.renewingIn7DaysCount}
            </span>
            <span className="text-[11px] text-sub">Due in next 7 days</span>
          </div>
        </div>
      </FadeUp>

      {/* Tabs */}
      <FadeUp delay={0.06}>
        <Segmented
          ariaLabel="Bills View Tab"
          value={tab}
          onChange={setTab}
          options={[
            { value: "all", label: "All Items" },
            { value: "bills", label: "One-Time & Utilities" },
            { value: "subscriptions", label: "Subscriptions" },
            { value: "intelligence", label: "Subscription Intelligence" },
          ]}
        />
      </FadeUp>

      {tab === "intelligence" ? (
        <FadeUp delay={0.08} className="flex flex-col gap-5">
          <div className="neu-card p-5">
            <h3 className="mb-2 flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
              <Sparkles size={17} className="text-teal" aria-hidden /> Subscription Intelligence & Optimization
            </h3>
            <p className="mb-4 text-[13px] text-sub">
              Household recurring services normalized to monthly and annual equivalents to prevent subscription creep.
            </p>

            {subMetrics.items.length === 0 ? (
              <EmptyState
                icon={<Radio size={24} />}
                title="No active subscriptions detected"
                description="Add Netflix, Spotify, broadband, or iCloud to track renewal dates and annualized spending."
              />
            ) : (
              <div className="space-y-3">
                {subMetrics.items.map(({ bill, monthlyEquivalent, annualEquivalent, status }) => (
                  <div key={bill.id} className="neu-card-sm flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="neu-inset-sm flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-teal">
                        <Zap size={16} aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[14.5px] font-semibold text-ink">{bill.name}</p>
                        <p className="text-[12px] text-sub">
                          Billed {bill.recurring} · Due {dateLabel(bill.dueDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[11px] font-medium text-faint">Monthly</p>
                        <p className="display-number text-[14px] text-ink">{money(monthlyEquivalent)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-medium text-faint">Annual</p>
                        <p className="display-number text-[14px] text-sub">{money(annualEquivalent)}</p>
                      </div>
                      <span
                        className={`neu-chip !cursor-default !text-[11px] ${
                          status === "due-soon"
                            ? "!text-amber bg-amber/10"
                            : status === "overdue"
                            ? "!text-danger bg-danger/10"
                            : "!text-teal bg-mint/20"
                        }`}
                      >
                        {status === "due-soon" ? "Renewing soon" : status === "overdue" ? "Overdue" : "Active"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FadeUp>
      ) : (
        <FadeUp delay={0.08}>
          {bills.length === 0 ? (
            <div className="neu-card">
              <EmptyState
                icon={<Receipt size={26} />}
                title="Track what's due"
                description="Rent, internet, electricity, subscriptions — with reminders before they hit."
                action={
                  <NeuButton
                    variant="primary"
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                  >
                    Add your first bill
                  </NeuButton>
                }
              />
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {pending.length > 0 && (
                <div className="grid gap-3 md:grid-cols-2">
                  {pending.map((b) => {
                    const status = billStatus(b);
                    return (
                      <div key={b.id} className="neu-card flex items-center gap-4 p-4">
                        <span
                          className={`neu-inset-sm flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${STATUS_STYLE[status].chip}`}
                        >
                          <Receipt size={18} aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-[14.5px] font-semibold text-ink">{b.name}</p>
                            {b.recurring !== "none" && (
                              <span className="neu-chip !cursor-default !py-0.5 !px-2 !text-[10px]">{b.recurring}</span>
                            )}
                            {b.isSubscription && (
                              <span className="neu-chip !cursor-default !py-0.5 !px-2 !text-[10px] !text-teal">Sub</span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[12px] text-sub">
                            Due {dateLabel(b.dueDate)} ·{" "}
                            <span className={`font-bold ${STATUS_STYLE[status].chip.replace("!", "")}`}>
                              {STATUS_STYLE[status].label}
                            </span>
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="display-number text-[15px] text-ink">{money(b.amount)}</span>
                          <div className="flex gap-1">
                            <NeuButton
                              variant="ghost"
                              size="sm"
                              className="!p-1.5"
                              aria-label={`Edit ${b.name}`}
                              onClick={() => {
                                setEditing(b);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil size={13} />
                            </NeuButton>
                            <NeuButton
                              variant="ghost"
                              size="sm"
                              className="!p-1.5 text-danger"
                              aria-label={`Delete ${b.name}`}
                              onClick={() => setConfirming(b)}
                            >
                              <Trash2 size={13} />
                            </NeuButton>
                            <NeuButton size="sm" variant="primary" loading={paying === b.id} onClick={() => doPay(b)}>
                              Pay
                            </NeuButton>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {paid.length > 0 && (
                <section aria-label="Paid bills">
                  <h3 className="mb-2 ml-1 font-display text-[13px] font-bold uppercase tracking-wider text-sub">
                    Paid
                  </h3>
                  <div className="neu-card divide-y divide-[var(--c-border)] p-1.5">
                    {paid.slice(0, 12).map((b) => (
                      <div key={b.id} className="flex items-center gap-3 px-3 py-2.5">
                        <CheckCircle2 size={16} className="shrink-0 text-teal" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-[13.5px] text-sub line-through decoration-faint">
                          {b.name}
                        </span>
                        <span className="text-[11.5px] text-faint">
                          {b.paidAt
                            ? dateLabel(new Date(b.paidAt.toDate?.() ?? new Date()).toISOString().slice(0, 10))
                            : b.dueDate}
                        </span>
                        <span className="text-[12.5px] font-medium text-sub">{money(b.amount)}</span>
                        <NeuButton
                          variant="ghost"
                          size="sm"
                          className="!p-1 !text-[11px]"
                          onClick={() =>
                            householdId &&
                            markBillUnpaid(householdId, b.id).then(() => toast.info("Marked unpaid"))
                          }
                        >
                          Undo
                        </NeuButton>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </FadeUp>
      )}

      <BillForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />
      <ConfirmDialog
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        onConfirm={doDelete}
        loading={deleting}
        title="Delete bill?"
        message={`"${confirming?.name}" will be removed. Already-recorded payments stay in transactions.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
