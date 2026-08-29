"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Pencil, Plus, Target, Trash2 } from "lucide-react";
import type { Goal } from "@/types";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useGoals } from "@/hooks/data";
import { useToast } from "@/contexts/ToastContext";
import { money } from "@/lib/currency";
import { dateLabel } from "@/lib/dates";
import { PageLoader, EmptyState } from "@/components/ui/feedback";
import { FadeUp, NeuButton, SectionHead } from "@/components/ui/primitives";
import { ProgressRing } from "@/components/ui/progress";
import { ConfirmDialog } from "@/components/ui/overlay";
import { DynamicIcon } from "@/components/ui/icon";
import { GoalForm } from "@/components/goals/GoalForm";
import { ContributeModal } from "@/components/goals/ContributeModal";
import { deleteGoal } from "@/lib/firebase/goals";

function GoalsInner() {
  const params = useSearchParams();
  const contributeParam = params.get("contribute");
  const { householdId, loading } = useHousehold();
  const { items: goals } = useGoals(householdId);
  const toast = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [contributing, setContributing] = useState<Goal | null>(null);
  const [confirming, setConfirming] = useState<Goal | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Quick-add "Goal contribution" lands here with ?contribute=1
  useEffect(() => {
    if (contributeParam && goals.length) setContributing(goals[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contributeParam, goals.length]);

  if (loading) return <PageLoader label="Loading goals…" />;

  async function doDelete() {
    if (!confirming || !householdId) return;
    setDeleting(true);
    try {
      await deleteGoal(householdId, confirming.id);
      toast.success("Goal deleted");
      setConfirming(null);
    } catch {
      toast.error("Couldn't delete the goal.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
        <SectionHead
          title="Goals"
          subtitle="Saving together, one contribution at a time"
          action={
            <NeuButton
              variant="primary"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus size={16} aria-hidden /> Goal
            </NeuButton>
          }
        />
      </FadeUp>

      <FadeUp delay={0.06}>
        {goals.length === 0 ? (
          <div className="neu-card">
            <EmptyState
              icon={<Target size={26} />}
              title="Dream together"
              description="Vacation, emergency fund, new home, car — every contribution from either of you shows up live."
              action={
                <NeuButton
                  variant="primary"
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  Create your first goal
                </NeuButton>
              }
            />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {goals.map((g) => {
              const ratio = g.targetAmount > 0 ? g.currentAmount / g.targetAmount : 0;
              return (
                <div key={g.id} className="neu-card flex flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <ProgressRing value={ratio} size={62} thickness={7} color={ratio >= 1 ? "var(--c-teal-deep)" : "var(--c-teal)"}>
                        <DynamicIcon name={g.icon} size={18} className="text-teal" />
                      </ProgressRing>
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-[15px] font-semibold text-ink">{g.name}</h3>
                        <p className="text-[11.5px] text-sub">
                          {g.targetDate ? `by ${dateLabel(g.targetDate)}` : "no deadline"}
                        </p>
                      </div>
                    </div>
                    <span className="flex shrink-0 gap-1">
                      <NeuButton variant="ghost" size="sm" className="!p-2" aria-label={`Edit ${g.name}`} onClick={() => { setEditing(g); setFormOpen(true); }}>
                        <Pencil size={13} />
                      </NeuButton>
                      <NeuButton variant="ghost" size="sm" className="!p-2 text-danger" aria-label={`Delete ${g.name}`} onClick={() => setConfirming(g)}>
                        <Trash2 size={13} />
                      </NeuButton>
                    </span>
                  </div>
                  <div>
                    <p className="font-display text-[17px] font-semibold text-ink">
                      {money(g.currentAmount)} <span className="text-[12.5px] font-medium text-sub">/ {money(g.targetAmount)}</span>
                    </p>
                    <p className="mt-0.5 text-[11.5px] font-bold text-teal">
                      {Math.round(ratio * 100)}%{ratio >= 1 ? " — reached! 🎉" : ""}
                    </p>
                  </div>
                  {g.description && <p className="line-clamp-2 text-[12.5px] leading-relaxed text-sub">{g.description}</p>}
                  <NeuButton variant={ratio >= 1 ? "default" : "primary"} onClick={() => setContributing(g)} className="mt-auto">
                    Add contribution
                  </NeuButton>
                </div>
              );
            })}
          </div>
        )}
      </FadeUp>

      <GoalForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />
      <ContributeModal open={Boolean(contributing)} onClose={() => setContributing(null)} goal={contributing} />
      <ConfirmDialog
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        onConfirm={doDelete}
        loading={deleting}
        title="Delete goal?"
        message={`"${confirming?.name}" and its contribution history will be removed for both partners.`}
        confirmLabel="Delete goal"
      />
    </div>
  );
}

export default function GoalsPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading goals…" />}>
      <GoalsInner />
    </Suspense>
  );
}
