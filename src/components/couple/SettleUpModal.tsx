"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/overlay";
import { Field, NeuButton, NeuInput, NeuSelect } from "@/components/ui/primitives";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useToast } from "@/contexts/ToastContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { createTransaction } from "@/lib/firebase/transactions";
import { todayISO } from "@/lib/dates";
import { money } from "@/lib/currency";
import type { CoupleSettlementSummary } from "@/lib/settlement";
import { ArrowRight, CheckCircle2, DollarSign, Handshake } from "lucide-react";

interface SettleUpModalProps {
  open: boolean;
  onClose: () => void;
  summary: CoupleSettlementSummary;
  onSettled?: () => void;
}

export function SettleUpModal({ open, onClose, summary, onSettled }: SettleUpModalProps) {
  const { profile } = useAuth();
  const { householdId, accounts, memberUids } = useHousehold();
  const toast = useToast();
  const { format } = useCurrency();

  const { owesMember, owedMember, settleAmount, splitMode } = summary;

  const [date, setDate] = useState(todayISO());
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [method, setMethod] = useState("Bank Transfer");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  if (!owesMember || !owedMember || settleAmount <= 0) {
    return (
      <Modal open={open} onClose={onClose} title="Settle Up">
        <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
          <div className="neu-inset-sm flex h-16 w-16 items-center justify-center rounded-full text-teal">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-ink">All Settled Up!</h3>
            <p className="text-sm text-sub mt-1">Shared spending is completely balanced. No settlement is needed right now.</p>
          </div>
          <NeuButton onClick={onClose} variant="primary">Close</NeuButton>
        </div>
      </Modal>
    );
  }

  const modeLabel =
    splitMode === "equal_50_50"
      ? "50/50 Equal"
      : splitMode === "income_proportional"
        ? "Income Proportional"
        : "Custom Ratio";

  async function handleSettle() {
    if (!householdId || !profile || !owesMember || !owedMember) return;
    setBusy(true);
    try {
      const payerName = owesMember.displayName.split(" ")[0];
      const receiverName = owedMember.displayName.split(" ")[0];
      const formattedAmount = format(settleAmount);
      const desc = `Settlement: ${payerName} paid ${receiverName} ${formattedAmount}`;
      const fullNotes = `Couple settlement via ${method}. Split mode: ${modeLabel}.${notes.trim() ? ` ${notes.trim()}` : ""}`;

      await createTransaction(
        householdId,
        profile.uid,
        memberUids,
        {
          type: "transfer",
          amount: settleAmount,
          currency: "BDT",
          categoryId: "transfer",
          description: desc,
          notes: fullNotes,
          date,
          accountId: accountId || null,
          fromAccountId: accountId || null,
          toAccountId: null,
          paidBy: owesMember.uid,
          ownership: "shared",
          tags: ["settlement"],
        },
        { categoryName: "Settlement" }
      );

      toast.success(`Settlement recorded! ${formattedAmount} transferred.`);
      onSettled?.();
      onClose();
    } catch {
      toast.error("Couldn't record the settlement. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Settle Up Couple Balance">
      <div className="flex flex-col gap-5">
        {/* Settlement Overview Banner */}
        <div className="neu-inset flex flex-col items-center gap-3 p-5 rounded-2xl bg-[rgba(138,206,209,0.08)]">
          <div className="flex items-center gap-4 w-full justify-center">
            <div className="flex flex-col items-center">
              <span className="font-bold text-ink text-sm">{owesMember.displayName.split(" ")[0]}</span>
              <span className="text-[11px] text-danger font-semibold">Payer</span>
            </div>
            <div className="flex flex-col items-center px-3">
              <span className="text-xl font-black text-teal display-number">{format(settleAmount)}</span>
              <div className="flex items-center gap-1 text-[11px] text-sub">
                <span>transfers to</span>
                <ArrowRight size={12} className="text-teal" />
              </div>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-bold text-ink text-sm">{owedMember.displayName.split(" ")[0]}</span>
              <span className="text-[11px] text-teal font-semibold">Receiver</span>
            </div>
          </div>
          <p className="text-[11.5px] text-sub text-center">
            Based on {modeLabel} split rule across shared household expenses.
          </p>
        </div>

        {/* Settlement form */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Settlement Date">
            <NeuInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Payment Method">
            <NeuSelect value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="bKash / Mobile Wallet">bKash / Mobile Wallet</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Other">Other</option>
            </NeuSelect>
          </Field>
        </div>

        <Field label="Account (Optional)">
          <NeuSelect value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">No specific account</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({format(a.initialBalance, { fromCurrency: a.currency || "BDT" })})
              </option>
            ))}
          </NeuSelect>
        </Field>

        <Field label="Notes (Optional)">
          <NeuInput
            placeholder="e.g. Paid via bKash / cleared for this month"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <NeuButton type="button" onClick={onClose} disabled={busy}>
            Cancel
          </NeuButton>
          <NeuButton
            type="button"
            variant="primary"
            loading={busy}
            onClick={handleSettle}
            className="flex items-center gap-2"
          >
            <Handshake size={16} /> Record Settlement ({format(settleAmount)})
          </NeuButton>
        </div>
      </div>
    </Modal>
  );
}
