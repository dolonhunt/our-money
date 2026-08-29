"use client";

import { useState, type FormEvent } from "react";
import type { Bill, Ownership, Recurring } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useToast } from "@/contexts/ToastContext";
import { Field, NeuButton, NeuInput, NeuSelect, Segmented } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/overlay";
import { saveBill } from "@/lib/firebase/bills";
import { addDays, todayISO } from "@/lib/dates";

export function BillForm({ open, onClose, editing, onSaved }: { open: boolean; onClose: () => void; editing?: Bill | null; onSaved?: () => void }) {
  const { householdId, categories, accounts } = useHousehold();
  const { profile } = useAuth();
  const toast = useToast();

  const [name, setName] = useState(editing?.name ?? "");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [dueDate, setDueDate] = useState(editing?.dueDate ?? addDays(todayISO(), 14));
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? "utilities");
  const [accountId, setAccountId] = useState(editing?.accountId ?? "");
  const [recurring, setRecurring] = useState<Recurring>(editing?.recurring ?? "monthly");
  const [reminderDays, setReminderDays] = useState(String(editing?.reminderDays ?? 3));
  const [ownership, setOwnership] = useState<Ownership>(editing?.ownership ?? "shared");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Name the bill.");
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return setError("Enter the amount.");
    if (!dueDate) return setError("Pick a due date.");
    if (!householdId || !profile) return;
    setBusy(true);
    try {
      await saveBill(
        householdId,
        profile.uid,
        { name: name.trim(), amount: amt, dueDate, categoryId: categoryId || null, accountId: accountId || null, recurring, reminderDays: Math.max(1, parseInt(reminderDays) || 3), ownership },
        editing?.id
      );
      toast.success(editing ? "Bill updated" : "Bill added");
      onSaved?.();
      onClose();
    } catch {
      setError("Couldn't save the bill. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit bill" : "Add bill"}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <Field label="Name" htmlFor="bl-name">
          <NeuInput id="bl-name" placeholder="e.g. Electricity" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (৳)" htmlFor="bl-amt" error={error?.includes("amount") ? error : undefined}>
            <NeuInput id="bl-amt" inputMode="decimal" placeholder="3200" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
          </Field>
          <Field label="Due date" htmlFor="bl-date">
            <NeuInput id="bl-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category" htmlFor="bl-cat">
            <NeuSelect id="bl-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">None</option>
              {categories.filter((c) => c.kind === "expense").map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NeuSelect>
          </Field>
          <Field label="Pay from" htmlFor="bl-acc">
            <NeuSelect id="bl-acc" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Choose later</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </NeuSelect>
          </Field>
        </div>
        <Field label="Repeats">
          <Segmented
            ariaLabel="Bill recurrence"
            value={recurring}
            onChange={setRecurring}
            options={[
              { value: "none", label: "One-time" },
              { value: "monthly", label: "Monthly" },
              { value: "weekly", label: "Weekly" },
              { value: "yearly", label: "Yearly" },
            ]}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Remind days before" htmlFor="bl-rem" hint="Notifications ahead of the due date.">
            <NeuInput id="bl-rem" inputMode="numeric" value={reminderDays} onChange={(e) => setReminderDays(e.target.value.replace(/[^0-9]/g, ""))} />
          </Field>
          <Field label="Visibility">
            <Segmented ariaLabel="Bill visibility" value={ownership} onChange={setOwnership} options={[{ value: "shared", label: "Shared" }, { value: "personal", label: "Personal" }]} />
          </Field>
        </div>
        {error && <p className="text-[13px] font-medium text-danger" role="alert">{error}</p>}
        <NeuButton type="submit" variant="primary" size="lg" loading={busy} className="w-full">
          {editing ? "Save changes" : "Add bill"}
        </NeuButton>
      </form>
    </Modal>
  );
}

export function BillFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <BillForm open={open} onClose={onClose} />;
}
