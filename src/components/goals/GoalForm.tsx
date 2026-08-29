"use client";

import { useState, type FormEvent } from "react";
import { Plane, ShieldCheck, Home, Car, TrendingUp, Heart, CircleEllipsis } from "lucide-react";
import type { Goal } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useToast } from "@/contexts/ToastContext";
import { Field, NeuButton, NeuInput, NeuTextarea } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/overlay";
import { createGoal, updateGoal } from "@/lib/firebase/goals";
import { todayISO } from "@/lib/dates";
import { money } from "@/lib/currency";

const GOAL_ICONS = [
  { name: "Plane", label: "Travel", Cmp: Plane },
  { name: "ShieldCheck", label: "Emergency", Cmp: ShieldCheck },
  { name: "Home", label: "Home", Cmp: Home },
  { name: "Car", label: "Car", Cmp: Car },
  { name: "TrendingUp", label: "Invest", Cmp: TrendingUp },
  { name: "Heart", label: "Wedding", Cmp: Heart },
  { name: "CircleEllipsis", label: "Other", Cmp: CircleEllipsis },
];

export function GoalForm({ open, onClose, editing, onSaved }: { open: boolean; onClose: () => void; editing?: Goal | null; onSaved?: () => void }) {
  const { householdId } = useHousehold();
  const { profile } = useAuth();
  const toast = useToast();

  const [name, setName] = useState(editing?.name ?? "");
  const [targetAmount, setTargetAmount] = useState(editing ? String(editing.targetAmount) : "");
  const [targetDate, setTargetDate] = useState(editing?.targetDate ?? "");
  const [icon, setIcon] = useState(editing?.icon ?? "Plane");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Name your goal.");
    const amt = parseFloat(targetAmount);
    if (!Number.isFinite(amt) || amt <= 0) return setError("Enter a target amount.");
    if (!householdId || !profile) return;
    setBusy(true);
    try {
      const payload = { name: name.trim(), targetAmount: amt, targetDate: targetDate || null, icon, description: description.trim() };
      if (editing) await updateGoal(householdId, editing.id, payload);
      else await createGoal(householdId, profile.uid, payload);
      toast.success(editing ? "Goal updated" : "Goal created — start contributing!");
      onSaved?.();
      onClose();
    } catch {
      setError("Couldn't save the goal. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit goal" : "New goal"}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <Field label="Goal name" htmlFor="gl-name">
          <NeuInput id="gl-name" placeholder="e.g. Vacation Trip" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Target amount (৳)" htmlFor="gl-amt">
            <NeuInput id="gl-amt" inputMode="decimal" placeholder="150000" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
          </Field>
          <Field label="Target date (optional)" htmlFor="gl-date">
            <NeuInput id="gl-date" type="date" min={todayISO()} value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Icon">
          <div className="flex flex-wrap gap-2">
            {GOAL_ICONS.map((g) => (
              <button
                key={g.name}
                type="button"
                className="neu-chip flex items-center gap-1.5"
                data-active={icon === g.name}
                onClick={() => setIcon(g.name)}
                aria-pressed={icon === g.name}
              >
                <g.Cmp size={14} aria-hidden /> {g.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Description (optional)" htmlFor="gl-desc">
          <NeuTextarea id="gl-desc" placeholder="Bali in December — flights + hotel" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={240} />
        </Field>
        {targetAmount && <p className="text-[12.5px] text-sub">You&rsquo;ll save up to {money(parseFloat(targetAmount) || 0)}.</p>}
        {error && <p className="text-[13px] font-medium text-danger" role="alert">{error}</p>}
        <NeuButton type="submit" variant="primary" size="lg" loading={busy} className="w-full">
          {editing ? "Save changes" : "Create goal"}
        </NeuButton>
      </form>
    </Modal>
  );
}
