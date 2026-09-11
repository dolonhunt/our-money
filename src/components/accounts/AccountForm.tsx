"use client";

import { useState, type FormEvent } from "react";
import type { Account, AccountType, Ownership } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useToast } from "@/contexts/ToastContext";
import { Field, NeuButton, NeuInput, NeuSelect, Segmented } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/overlay";
import { createAccount, updateAccount } from "@/lib/firebase/accounts";
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from "@/lib/currency";

export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "mobile", label: "Mobile Wallet" },
  { value: "credit", label: "Credit Card" },
  { value: "savings", label: "Savings" },
  { value: "other", label: "Other" },
];

export function AccountForm({ open, onClose, editing, onSaved }: { open: boolean; onClose: () => void; editing?: Account | null; onSaved?: () => void }) {
  const { householdId } = useHousehold();
  const { profile } = useAuth();
  const toast = useToast();

  const [name, setName] = useState(editing?.name ?? "");
  const [type, setType] = useState<AccountType>(editing?.type ?? "bank");
  const [currency, setCurrency] = useState<string>(editing?.currency ?? DEFAULT_CURRENCY);
  const [initialBalance, setInitialBalance] = useState(editing ? String(editing.initialBalance) : "");
  const [ownership, setOwnership] = useState<Ownership>(editing?.ownership ?? "shared");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Name the account.");
    if (!householdId || !profile) return;
    const bal = parseFloat(initialBalance) || 0;
    setBusy(true);
    try {
      if (editing) await updateAccount(householdId, editing.id, { name: name.trim(), type, currency, initialBalance: bal, ownership });
      else await createAccount(householdId, profile.uid, { name: name.trim(), type, currency, initialBalance: bal, ownership });
      toast.success(editing ? "Account updated" : "Account added");
      onSaved?.();
      onClose();
    } catch {
      setError("Couldn't save the account. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit account" : "Add account"}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <Field label="Name" htmlFor="ac-name">
          <NeuInput id="ac-name" placeholder="e.g. City Bank Joint" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type" htmlFor="ac-type">
            <NeuSelect id="ac-type" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </NeuSelect>
          </Field>
          <Field label="Currency" htmlFor="ac-cur">
            <NeuSelect id="ac-cur" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol.trim()})
                </option>
              ))}
            </NeuSelect>
          </Field>
        </div>
        <Field
          label={editing ? `Starting balance (${currency})` : `Current balance (${currency})`}
          htmlFor="ac-bal"
          hint={type === "credit" ? "For credit cards, enter what you owe as a positive number." : "Balances stay correct as you add transactions."}
        >
          <NeuInput id="ac-bal" inputMode="decimal" placeholder="e.g. 50000" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value.replace(/[^0-9.]/g, ""))} />
        </Field>
        <Field label="Visibility">
          <Segmented ariaLabel="Account visibility" value={ownership} onChange={setOwnership} options={[{ value: "shared", label: "Shared" }, { value: "personal", label: "Personal" }]} />
        </Field>
        {error && <p className="text-[13px] font-medium text-danger" role="alert">{error}</p>}
        <NeuButton type="submit" variant="primary" size="lg" loading={busy} className="w-full">
          {editing ? "Save changes" : "Add account"}
        </NeuButton>
      </form>
    </Modal>
  );
}
