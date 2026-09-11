"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { ArrowLeftRight, Banknote, Paperclip, Trash2, TrendingDown } from "lucide-react";
import type { Ownership, PaidBy, RecurrenceFrequency, Transaction, TransactionType } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useToast } from "@/contexts/ToastContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Modal } from "@/components/ui/overlay";
import { Field, NeuButton, NeuInput, NeuSelect, NeuTextarea, Segmented } from "@/components/ui/primitives";
import { DynamicIcon } from "@/components/ui/icon";
import { createTransaction, updateTransaction, type TransactionInput } from "@/lib/firebase/transactions";
import { uploadFile } from "@/lib/supabase";
import { todayISO } from "@/lib/dates";
import { money, SUPPORTED_CURRENCIES } from "@/lib/currency";
import { ReceiptPreviewModal } from "@/components/ui/ReceiptPreviewModal";

const RECURRENCES: { value: RecurrenceFrequency | "none"; label: string }[] = [
  { value: "none", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export interface TransactionFormProps {
  onClose: () => void;
  onSaved?: () => void;
  initialType?: TransactionType;
  editing?: Transaction;
}

export function TransactionForm({ onClose, onSaved, initialType = "expense", editing }: TransactionFormProps) {
  const { profile } = useAuth();
  const { householdId, household, categories, accounts, members, memberUids } = useHousehold();
  const toast = useToast();
  const { currency: activeDisplayCurrency, convert } = useCurrency();

  const [type, setType] = useState<TransactionType>(editing?.type ?? initialType);
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [txCurrency, setTxCurrency] = useState<string>(editing?.currency ?? activeDisplayCurrency ?? "BDT");
  const [date, setDate] = useState(editing?.date ?? todayISO());
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [accountId, setAccountId] = useState(editing?.accountId ?? "");
  const [fromAccountId, setFromAccountId] = useState(editing?.fromAccountId ?? "");
  const [toAccountId, setToAccountId] = useState(editing?.toAccountId ?? "");
  const [paidBy, setPaidBy] = useState<PaidBy>(editing?.paidBy ?? profile?.uid ?? "both");
  const [ownership, setOwnership] = useState<Ownership>(editing?.ownership ?? "shared");
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency | "none">("none");
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(editing?.attachmentUrl ?? null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /** An editing object with an empty id means "duplicate" — prefill, but create. */
  const isEdit = Boolean(editing?.id);

  const relevantCategories = useMemo(
    () => categories.filter((c) => c.kind === (type === "income" ? "income" : "expense")),
    [categories, type]
  );

  useEffect(() => {
    if (!categoryId && relevantCategories.length) setCategoryId(relevantCategories[0].id);
    if (categoryId && !relevantCategories.some((c) => c.id === categoryId)) setCategoryId(relevantCategories[0]?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relevantCategories]);

  const partner = members.find((m) => m.uid !== profile?.uid);

  async function handleAttachment(file: File) {
    if (!householdId || !profile) return;
    setUploading(true);
    try {
      const url = await uploadFile(`households/${householdId}/receipts/${profile.uid}/${Date.now()}_${file.name.replace(/[^\w.\-]/g, "_")}`, file);
      setAttachmentUrl(url);
      toast.success("Receipt attached");
    } catch {
      toast.error("Couldn't upload the receipt. Check that the Supabase \u201Cuploads\u201D bucket exists (see SUPABASE_SETUP.md).");
    } finally {
      setUploading(false);
    }
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) e.amount = "Enter an amount greater than zero.";
    if (!date) e.date = "Pick a date.";
    if (type !== "transfer" && !categoryId) e.categoryId = "Choose a category.";
    if (!description.trim()) e.description = "Add a short description.";
    if (type === "transfer") {
      if (!fromAccountId) e.fromAccountId = "Choose the source account.";
      if (!toAccountId) e.toAccountId = "Choose the destination account.";
      if (fromAccountId && fromAccountId === toAccountId) e.toAccountId = "Destination must differ from source.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!householdId || !profile || !validate()) return;
    setSubmitting(true);
    try {
      const input: TransactionInput = {
        type,
        amount: parseFloat(amount),
        currency: txCurrency,
        categoryId: type === "transfer" ? "transfer" : categoryId,
        description: description.trim(),
        notes,
        date,
        accountId: type === "transfer" ? null : accountId || null,
        fromAccountId: type === "transfer" ? fromAccountId : null,
        toAccountId: type === "transfer" ? toAccountId : null,
        paidBy: type === "transfer" ? "both" : paidBy,
        ownership,
        attachmentUrl,
        recurrence: type !== "transfer" && recurrence !== "none" ? { frequency: recurrence } : null,
      };
      const categoryName = categories.find((c) => c.id === categoryId)?.name;
      if (editing?.id) {
        await updateTransaction(householdId, editing.id, profile.uid, memberUids, {
          amount: input.amount,
          currency: input.currency,
          categoryId: input.categoryId,
          description: input.description,
          notes: input.notes,
          date: input.date,
          accountId: input.accountId,
          fromAccountId: input.fromAccountId,
          toAccountId: input.toAccountId,
          paidBy: input.paidBy,
          ownership: input.ownership,
          attachmentUrl: input.attachmentUrl,
        });
        toast.success("Transaction updated");
      } else {
        await createTransaction(householdId, profile.uid, memberUids, input, { categoryName });
        toast.success(type === "income" ? "Income added" : type === "expense" ? "Expense added" : "Transfer recorded");
      }
      onSaved?.();
      onClose();
    } catch {
      toast.error("Couldn't save. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const typeLocked = isEdit;

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Segmented
        ariaLabel="Transaction type"
        value={type}
        onChange={typeLocked ? () => undefined : setType}
        options={[
          { value: "expense", label: <span className="flex items-center gap-1.5"><TrendingDown size={14} aria-hidden /> Expense</span> },
          { value: "income", label: <span className="flex items-center gap-1.5"><Banknote size={14} aria-hidden /> Income</span> },
          { value: "transfer", label: <span className="flex items-center gap-1.5"><ArrowLeftRight size={14} aria-hidden /> Transfer</span> },
        ]}
      />

      {/* Big amount entry — fastest path (PRD §52) */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="neu-inset flex w-full items-center justify-center gap-3 px-4 py-4 rounded-2xl">
          <select
            value={txCurrency}
            onChange={(e) => setTxCurrency(e.target.value)}
            className="neu-pill !py-1 !px-2.5 text-sm font-bold text-teal bg-transparent cursor-pointer border border-[var(--c-border)]"
            aria-label="Transaction currency"
          >
            {Object.values(SUPPORTED_CURRENCIES).map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} {c.symbol.trim()}
              </option>
            ))}
          </select>
          <input
            inputMode="decimal"
            autoFocus
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            className="display-number w-full max-w-[200px] bg-transparent text-center text-4xl text-ink outline-none placeholder:text-faint"
            aria-label="Amount"
            aria-invalid={Boolean(errors.amount)}
          />
        </div>
        {txCurrency !== "BDT" && parseFloat(amount) > 0 && (
          <p className="text-xs font-mono text-faint">
            ≈ ৳{convert(parseFloat(amount), txCurrency, "BDT").toFixed(2)} BDT (Household Base)
          </p>
        )}
        {errors.amount && <p className="text-xs font-medium text-danger">{errors.amount}</p>}
      </div>

      {type !== "transfer" && (
        <Field label="Category" error={errors.categoryId}>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Category">
            {relevantCategories.map((c) => (
              <button
                type="button"
                key={c.id}
                role="radio"
                aria-checked={categoryId === c.id}
                className="neu-chip flex items-center gap-1.5"
                data-active={categoryId === c.id}
                onClick={() => setCategoryId(c.id)}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: c.color }} aria-hidden />
                {c.name}
              </button>
            ))}
          </div>
        </Field>
      )}

      {type === "transfer" ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="From account" error={errors.fromAccountId} htmlFor="tx-from">
            <NeuSelect id="tx-from" value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} invalid={Boolean(errors.fromAccountId)}>
              <option value="">Select…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </NeuSelect>
          </Field>
          <Field label="To account" error={errors.toAccountId} htmlFor="tx-to">
            <NeuSelect id="tx-to" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} invalid={Boolean(errors.toAccountId)}>
              <option value="">Select…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </NeuSelect>
          </Field>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Account" htmlFor="tx-account">
            <NeuSelect id="tx-account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">No specific account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </NeuSelect>
          </Field>
          <Field label="Date" error={errors.date} htmlFor="tx-date">
            <NeuInput id="tx-date" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} invalid={Boolean(errors.date)} />
          </Field>
        </div>
      )}

      {type === "transfer" && (
        <Field label="Date" error={errors.date} htmlFor="tx-date2">
          <NeuInput id="tx-date2" type="date" value={date} onChange={(e) => setDate(e.target.value)} invalid={Boolean(errors.date)} />
        </Field>
      )}

      <Field label="Description" error={errors.description} htmlFor="tx-desc">
        <NeuInput
          id="tx-desc"
          placeholder={type === "income" ? "e.g. Salary for August" : type === "transfer" ? "e.g. Move to savings" : "e.g. Grocery haul"}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          invalid={Boolean(errors.description)}
          maxLength={80}
        />
      </Field>

      {type !== "transfer" && (
        <>
          <Field label="Paid by">
            <div className="flex flex-wrap gap-2">
              <button type="button" className="neu-chip" data-active={paidBy === profile?.uid} onClick={() => setPaidBy(profile!.uid)}>
                Me
              </button>
              {partner && (
                <button type="button" className="neu-chip" data-active={paidBy === partner.uid} onClick={() => setPaidBy(partner.uid)}>
                  {partner.displayName.split(" ")[0]}
                </button>
              )}
              <button type="button" className="neu-chip" data-active={paidBy === "both"} onClick={() => setPaidBy("both")}>
                Both
              </button>
            </div>
          </Field>

          <Field label="Visibility">
            <Segmented
              ariaLabel="Shared or personal"
              value={ownership}
              onChange={setOwnership}
              options={[
                { value: "shared", label: "Shared" },
                { value: "personal", label: "Personal" },
              ]}
            />
          </Field>

          {!isEdit && (
            <Field label="Repeats" hint="Recurring transactions generate themselves when due.">
              <div className="flex flex-wrap gap-2">
                {RECURRENCES.map((r) => (
                  <button key={r.value} type="button" className="neu-chip" data-active={recurrence === r.value} onClick={() => setRecurrence(r.value)}>
                    {r.label}
                  </button>
                ))}
              </div>
            </Field>
          )}
        </>
      )}

      <Field label="Notes (optional)" htmlFor="tx-notes">
        <NeuTextarea id="tx-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering…" maxLength={280} />
      </Field>

      <div className="flex items-center justify-between gap-3">
        {attachmentUrl ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setReceiptModalOpen(true)}
              className="neu-btn flex items-center gap-1.5 !rounded-xl px-3 py-2 text-xs text-teal hover:text-ink font-semibold"
            >
              <Paperclip size={13} /> View Receipt
            </button>
            <button
              type="button"
              onClick={() => setAttachmentUrl(null)}
              className="neu-btn !rounded-xl !p-2 text-xs text-danger"
              title="Remove attached receipt"
              aria-label="Remove receipt"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ) : (
          <label className={clsx("neu-btn cursor-pointer items-center gap-2 !rounded-xl px-3.5 py-2 text-[13px]", uploading && "pointer-events-none")}>
            <Paperclip size={15} aria-hidden />
            {uploading ? "Uploading…" : "Attach receipt"}
            <input
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleAttachment(f);
                e.currentTarget.value = "";
              }}
            />
          </label>
        )}
        <NeuButton type="submit" variant="primary" loading={submitting} size="lg">
          {isEdit ? "Save changes" : `Add ${money(parseFloat(amount) || 0, { currency: txCurrency })}`}
        </NeuButton>
      </div>

      <ReceiptPreviewModal
        open={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        url={attachmentUrl}
        title="Attached Receipt"
        onDelete={() => setAttachmentUrl(null)}
      />
    </form>
  );
}

export function TransactionFormModal({
  open,
  onClose,
  initialType,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  initialType?: TransactionType;
  editing?: Transaction;
}) {
  return (
    <Modal open={open} onClose={onClose} title={editing?.id ? "Edit transaction" : "Add transaction"}>
      {open && <TransactionForm onClose={onClose} initialType={initialType} editing={editing} />}
    </Modal>
  );
}
