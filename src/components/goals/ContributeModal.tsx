"use client";

import { useState } from "react";
import type { Goal } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useToast } from "@/contexts/ToastContext";
import { Field, NeuButton, NeuInput, NeuTextarea } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/overlay";
import { contributeToGoal } from "@/lib/firebase/goals";
import { todayISO } from "@/lib/dates";
import { money } from "@/lib/currency";

/** Either partner contributes; progress updates live for both (PRD §45). */
export function ContributeModal({ open, onClose, goal, onSaved }: { open: boolean; onClose: () => void; goal: Goal | null; onSaved?: () => void }) {
  const { householdId, memberUids } = useHousehold();
  const { profile } = useAuth();
  const toast = useToast();

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!goal) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return setError("Enter an amount.");
    if (!householdId || !profile) return;
    setBusy(true);
    try {
      await contributeToGoal(householdId, goal.id, profile.uid, memberUids, {
        amount: amt,
        date,
        note,
        actorName: profile.displayName,
      });
      toast.success(`${money(amt)} added to ${goal.name}`);
      setAmount("");
      setNote("");
      onSaved?.();
      onClose();
    } catch {
      setError("Couldn't add the contribution. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

  return (
    <Modal open={open} onClose={onClose} title={`Contribute — ${goal.name}`}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <div className="neu-inset flex items-baseline justify-between px-4 py-3">
          <span className="text-[12px] font-semibold text-sub">Still needed</span>
          <span className="display-number text-lg text-ink">{money(remaining)}</span>
        </div>
        <Field label="Amount (৳)" htmlFor="ct-amt" error={error}>
          <NeuInput id="ct-amt" inputMode="decimal" autoFocus placeholder="e.g. 5000" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} className="!text-lg !font-semibold" />
        </Field>
        <div className="flex flex-wrap gap-2">
          {[1000, 5000, 10000].map((v) => (
            <button key={v} type="button" className="neu-chip" onClick={() => setAmount(String(v))}>
              {money(v)}
            </button>
          ))}
          {remaining > 0 && (
            <button type="button" className="neu-chip" onClick={() => setAmount(String(Math.round(remaining)))}>
              Finish it
            </button>
          )}
        </div>
        <Field label="Date" htmlFor="ct-date">
          <NeuInput id="ct-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Note (optional)" htmlFor="ct-note">
          <NeuTextarea id="ct-note" placeholder="e.g. Freelance bonus" value={note} onChange={(e) => setNote(e.target.value)} maxLength={160} />
        </Field>
        <NeuButton type="submit" variant="primary" size="lg" loading={busy} className="w-full">
          Add {money(parseFloat(amount) || 0)}
        </NeuButton>
      </form>
    </Modal>
  );
}
