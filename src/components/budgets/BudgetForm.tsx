"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { Budget, Ownership } from "@/types";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useToast } from "@/contexts/ToastContext";
import { Field, NeuButton, NeuInput, NeuSelect, NeuTextarea, Segmented } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/overlay";
import { saveBudget } from "@/lib/firebase/budgets";
import { useAuth } from "@/contexts/AuthContext";

export function BudgetForm({ open, onClose, editing, month, onSaved }: { open: boolean; onClose: () => void; editing?: Budget | null; month: string; onSaved?: () => void }) {
  const { householdId, categories } = useHousehold();
  const { profile } = useAuth();
  const toast = useToast();

  const expenseCats = useMemo(() => categories.filter((c) => c.kind === "expense"), [categories]);
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? "");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [ownership, setOwnership] = useState<Ownership>(editing?.ownership ?? "shared");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!categoryId) return setError("Choose a category.");
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return setError("Enter a budget amount.");
    if (!householdId || !profile) return;
    setBusy(true);
    try {
      await saveBudget(householdId, profile.uid, { categoryId, month, amount: amt, ownership, notes }, editing?.id);
      toast.success(editing ? "Budget updated" : "Budget set");
      onSaved?.();
      onClose();
    } catch {
      setError("Couldn't save the budget. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit budget" : "Set budget"}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <Field label="Category" htmlFor="bg-cat">
          <NeuSelect id="bg-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Select category…</option>
            {expenseCats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NeuSelect>
        </Field>
        <Field label="Monthly limit (৳)" htmlFor="bg-amt" hint="Spending alerts start at 90% of this amount.">
          <NeuInput id="bg-amt" inputMode="decimal" placeholder="e.g. 25000" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
        </Field>
        <Field label="Visibility">
          <Segmented ariaLabel="Budget visibility" value={ownership} onChange={setOwnership} options={[{ value: "shared", label: "Shared" }, { value: "personal", label: "Personal" }]} />
        </Field>
        <Field label="Notes (optional)" htmlFor="bg-notes">
          <NeuTextarea id="bg-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why this limit?" maxLength={200} />
        </Field>
        {error && <p className="text-[13px] font-medium text-danger" role="alert">{error}</p>}
        <NeuButton type="submit" variant="primary" size="lg" loading={busy} className="w-full">
          {editing ? "Save changes" : "Set budget"}
        </NeuButton>
      </form>
    </Modal>
  );
}
