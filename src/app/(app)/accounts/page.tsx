"use client";

import { useState, type ComponentType } from "react";
import { Banknote, CreditCard, Pencil, Plus, Smartphone, Vault, Wallet, Landmark } from "lucide-react";
import type { Account, AccountType } from "@/types";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useAccounts, useTransactions } from "@/hooks/data";
import { useQuickAdd } from "@/contexts/QuickAddContext";
import { accountBalance } from "@/lib/finance";
import { money } from "@/lib/currency";
import { EmptyState, PageLoader } from "@/components/ui/feedback";
import { FadeUp, NeuButton, SectionHead } from "@/components/ui/primitives";
import { AccountForm, ACCOUNT_TYPES } from "@/components/accounts/AccountForm";

const TYPE_ICON: Record<AccountType, ComponentType<{ size?: number; className?: string }>> = {
  cash: Banknote,
  bank: Landmark,
  mobile: Smartphone,
  credit: CreditCard,
  savings: Vault,
  other: Wallet,
};

export default function AccountsPage() {
  const { householdId, loading } = useHousehold();
  const { items: accounts } = useAccounts(householdId);
  const { items: transactions } = useTransactions(householdId);
  const { open } = useQuickAdd();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  if (loading) return <PageLoader label="Loading accounts…" />;

  const total = accounts.reduce((s, a) => s + accountBalance(a, transactions), 0);

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
        <SectionHead
          title="Accounts"
          subtitle={accounts.length ? `${accounts.length} accounts · ${money(total)} combined` : "Cash, banks, wallets & cards"}
          action={
            <div className="flex gap-2">
              <NeuButton onClick={() => open("transfer")}>Transfer</NeuButton>
              <NeuButton
                variant="primary"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus size={16} aria-hidden /> Account
              </NeuButton>
            </div>
          }
        />
      </FadeUp>

      <FadeUp delay={0.06}>
        {accounts.length === 0 ? (
          <div className="neu-card">
            <EmptyState
              icon={<Wallet size={26} />}
              title="No accounts yet"
              description="Add the accounts you actually use — balances update automatically from your transactions and transfers."
              action={
                <NeuButton
                  variant="primary"
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  Add your first account
                </NeuButton>
              }
            />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {accounts.map((a) => {
              const balance = accountBalance(a, transactions);
              const Icon = TYPE_ICON[a.type] ?? Wallet;
              const typeLabel = ACCOUNT_TYPES.find((t) => t.value === a.type)?.label ?? a.type;
              return (
                <button
                  key={a.id}
                  className="neu-card flex flex-col gap-4 p-5 text-left transition-transform hover:-translate-y-0.5"
                  onClick={() => {
                    setEditing(a);
                    setFormOpen(true);
                  }}
                  aria-label={`Edit ${a.name}, balance ${money(balance)}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`neu-inset-sm flex h-11 w-11 items-center justify-center rounded-full ${balance < 0 ? "text-orange" : "text-teal"}`}>
                      <Icon size={19} aria-hidden />
                    </span>
                    <span className="neu-chip !cursor-default !py-0.5 !px-2.5 !text-[10.5px]">{typeLabel}{a.ownership === "personal" ? " · Personal" : ""}</span>
                  </div>
                  <div>
                    <p className="font-display text-[15px] font-semibold text-ink">{a.name}</p>
                    <p className={`display-number mt-1 text-[26px] ${balance < 0 ? "text-orange" : "text-ink"}`}>{money(balance)}</p>
                  </div>
                  <p className="text-[11px] text-faint">
                    Started at {money(a.initialBalance)} · updated live from activity
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </FadeUp>

      <AccountForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />
      <span className="sr-only">
        <Pencil size={1} aria-hidden /> Tap any account to edit it.
      </span>
    </div>
  );
}
