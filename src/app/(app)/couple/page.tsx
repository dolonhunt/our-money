"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Crown, LogOut, RefreshCw, UserMinus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useToast } from "@/contexts/ToastContext";
import { SyncBadge } from "@/components/layout/SyncBadge";
import { dateLabel, relativeTime } from "@/lib/dates";
import { PageLoader } from "@/components/ui/feedback";
import { Avatar, FadeUp, Field, NeuButton, NeuInput, SectionHead } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/overlay";
import { leaveHousehold, regenerateInviteCode, removeMember, transferOwnership, updateHouseholdSettings } from "@/lib/firebase/households";
import { useRouter } from "next/navigation";
import { DEFAULT_CURRENCY } from "@/lib/currency";

export default function CouplePage() {
  const { profile } = useAuth();
  const { householdId, household, members, me, loading } = useHousehold();
  const toast = useToast();
  const router = useRouter();

  const [name, setName] = useState(household?.name ?? "");
  const [currency, setCurrency] = useState(household?.currency ?? DEFAULT_CURRENCY);
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [confirmTransfer, setConfirmTransfer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isOwner = me?.role === "owner";
  const solo = members.length < 2;

  const invite = useMemo(() => {
    if (!household) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return {
      link: `${origin}/join?h=${household.id}&c=${household.inviteCode}`,
      code: `${household.id}.${household.inviteCode}`,
    };
  }, [household]);

  if (loading || !householdId || !household) return <PageLoader label="Loading your money space…" />;

  function copy(text: string, what: "link" | "code") {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(what);
        setTimeout(() => setCopied(null), 1800);
      },
      () => toast.error("Couldn't copy — select the text manually.")
    );
  }

  async function saveSettings() {
    if (!householdId || !name.trim()) return toast.error("The space needs a name.");
    setBusy(true);
    try {
      await updateHouseholdSettings(householdId, { name: name.trim(), currency });
      toast.success("Household updated");
    } catch {
      toast.error("Couldn't save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function doLeave() {
    if (!profile || !household) return;
    setBusy(true);
    try {
      const result = await leaveHousehold(profile, household, members.length);
      toast.success(result === "dissolved" ? "Money space dissolved" : "You left the money space");
      setConfirmLeave(false);
      router.replace("/onboarding");
    } catch {
      toast.error("Couldn't leave. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function doRemove(uid: string) {
    if (!householdId) return;
    setBusy(true);
    try {
      await removeMember(householdId, uid);
      toast.success("Member removed");
      setConfirmRemove(null);
    } catch {
      toast.error("Couldn't remove the member.");
    } finally {
      setBusy(false);
    }
  }

  async function doTransfer(uid: string) {
    if (!householdId) return;
    setBusy(true);
    try {
      await transferOwnership(householdId, uid);
      toast.success("Ownership transferred");
      setConfirmTransfer(null);
    } catch {
      toast.error("Couldn't transfer ownership.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
        <SectionHead title="Couple" subtitle="Two people, one financial picture" />
      </FadeUp>

      {/* Household header card */}
      <FadeUp delay={0.04}>
        <div className="neu-card flex flex-col gap-5 p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex -space-x-3">
              {members.map((m, i) => (
                <Avatar key={m.uid} name={m.displayName} photoURL={m.photoURL} size={56} ring={i === 0 ? "mint" : "peach"} />
              ))}
              {solo && <span className="neu-inset flex h-14 w-14 items-center justify-center rounded-full text-xl text-faint">＋</span>}
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-xl font-semibold text-ink">{household.name}</h2>
              <p className="mt-0.5 text-[13px] text-sub">
                {members.length} member{members.length === 1 ? "" : "s"} · since {household.createdAt ? dateLabel(new Date(household.createdAt.toDate?.() ?? new Date()).toISOString().slice(0, 10)) : "recently"}
              </p>
            </div>
            <div className="ml-auto">
              <SyncBadge />
            </div>
          </div>

          {/* Member cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            {members.map((m) => (
              <div key={m.uid} className="neu-inset flex flex-col gap-3 p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={m.displayName} photoURL={m.photoURL} size={42} ring={members[0]?.uid === m.uid ? "mint" : "peach"} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-[14.5px] font-semibold text-ink">
                      {m.displayName}
                      {m.role === "owner" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-mint/25 px-2 py-0.5 text-[10px] font-bold text-teal">
                          <Crown size={10} aria-hidden /> Owner
                        </span>
                      )}
                      {m.uid === profile?.uid && <span className="text-[10.5px] font-semibold text-faint">(you)</span>}
                    </p>
                    <p className="truncate text-[12px] text-sub">{m.email}</p>
                  </div>
                </div>
                <p className="text-[11.5px] text-faint">
                  Joined {m.joinedAt ? dateLabel(new Date(m.joinedAt.toDate?.() ?? new Date()).toISOString().slice(0, 10)) : "—"} · active {relativeTime(m.joinedAt) ? "recently" : "—"}
                </p>
                {isOwner && m.uid !== profile?.uid && (
                  <div className="flex gap-2">
                    <NeuButton size="sm" variant="ghost" onClick={() => setConfirmTransfer(m.uid)}>
                      <Crown size={13} aria-hidden /> Make owner
                    </NeuButton>
                    <NeuButton size="sm" variant="ghost" className="text-danger" onClick={() => setConfirmRemove(m.uid)}>
                      <UserMinus size={13} aria-hidden /> Remove
                    </NeuButton>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </FadeUp>

      {/* Invite */}
      {solo && (
        <FadeUp delay={0.08}>
          <div className="neu-card flex flex-col gap-4 p-6">
            <h3 className="font-display text-[15px] font-semibold text-ink">Invite your partner</h3>
            <p className="text-[13px] leading-relaxed text-sub">Share the secure link or code — once they join, everything syncs live for both of you.</p>
            {invite && (
              <>
                <Field label="Invite link">
                  <div className="flex gap-2">
                    <NeuInput readOnly value={invite.link} className="truncate text-[12.5px]" onFocus={(e) => e.currentTarget.select()} />
                    <NeuButton onClick={() => copy(invite.link, "link")} aria-label="Copy invite link" className="!px-3">
                      {copied === "link" ? <Check size={15} className="text-teal" aria-hidden /> : <Copy size={15} aria-hidden />}
                    </NeuButton>
                  </div>
                </Field>
                <Field label="Invite code">
                  <div className="flex gap-2">
                    <NeuInput readOnly value={invite.code} className="truncate text-[12.5px]" onFocus={(e) => e.currentTarget.select()} />
                    <NeuButton onClick={() => copy(invite.code, "code")} aria-label="Copy invite code" className="!px-3">
                      {copied === "code" ? <Check size={15} className="text-teal" aria-hidden /> : <Copy size={15} aria-hidden />}
                    </NeuButton>
                  </div>
                </Field>
                {isOwner && (
                  <NeuButton
                    variant="ghost"
                    size="sm"
                    className="self-start"
                    onClick={async () => {
                      await regenerateInviteCode(householdId);
                      toast.success("New code generated — the old one stops working");
                    }}
                  >
                    <RefreshCw size={13} aria-hidden /> Regenerate code
                  </NeuButton>
                )}
              </>
            )}
          </div>
        </FadeUp>
      )}

      {/* Household settings */}
      <FadeUp delay={0.12}>
        <div className="neu-card flex flex-col gap-4 p-6">
          <h3 className="font-display text-[15px] font-semibold text-ink">Household settings</h3>
          <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
            <Field label="Space name" htmlFor="cp-name">
              <NeuInput id="cp-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
            </Field>
            <Field label="Currency" htmlFor="cp-cur">
              <NeuInput id="cp-cur" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))} />
            </Field>
          </div>
          <NeuButton variant="primary" loading={busy} onClick={saveSettings} className="self-start">
            Save changes
          </NeuButton>
        </div>
      </FadeUp>

      {/* Danger zone */}
      <FadeUp delay={0.16}>
        <div className="neu-card flex flex-col gap-3 p-6">
          <h3 className="font-display text-[15px] font-semibold text-ink">Leave this money space</h3>
          <p className="text-[13px] leading-relaxed text-sub">
            {isOwner && !solo
              ? "As the owner, transfer ownership to your partner first (above), then leave."
              : solo
                ? "You're the only member — leaving dissolves the space and permanently deletes its data."
                : "You'll keep your account but lose access to this shared space."}
          </p>
          <NeuButton variant="danger" className="self-start" disabled={isOwner && !solo} onClick={() => setConfirmLeave(true)}>
            <LogOut size={14} aria-hidden /> Leave household
          </NeuButton>
        </div>
      </FadeUp>

      <ConfirmDialog
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        onConfirm={doLeave}
        loading={busy}
        title={solo ? "Dissolve money space?" : "Leave money space?"}
        message={solo ? "This permanently deletes all transactions, budgets, goals and history for this household. This cannot be undone." : "You will no longer see this household's shared data. Your partner keeps everything."}
        confirmLabel={solo ? "Delete everything" : "Leave"}
      />
      <ConfirmDialog
        open={Boolean(confirmRemove)}
        onClose={() => setConfirmRemove(null)}
        onConfirm={() => doRemove(confirmRemove!)}
        loading={busy}
        title="Remove member?"
        message="They lose access to this household immediately. Their personal profile stays intact."
        confirmLabel="Remove"
      />
      <ConfirmDialog
        open={Boolean(confirmTransfer)}
        onClose={() => setConfirmTransfer(null)}
        onConfirm={() => doTransfer(confirmTransfer!)}
        loading={busy}
        title="Transfer ownership?"
        message="Your partner becomes the owner with full household management rights. You become a member."
        confirmLabel="Transfer"
        danger={false}
      />
    </div>
  );
}
