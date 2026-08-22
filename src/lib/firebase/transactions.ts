import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import type { PaidBy, Ownership, RecurrenceFrequency, Transaction, TransactionType } from "@/types";
import { advanceRecurrence, todayISO } from "@/lib/dates";
import { money } from "@/lib/currency";
import { deterministicId } from "@/lib/ids";
import { logActivity } from "./activity";
import { notifyPartners } from "./notifications";
import { getDb } from "./firestore";

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  categoryId: string;
  description: string;
  notes?: string;
  date: string; // YYYY-MM-DD
  accountId?: string | null;
  fromAccountId?: string | null;
  toAccountId?: string | null;
  paidBy: PaidBy;
  ownership: Ownership;
  attachmentUrl?: string | null;
  tags?: string[];
  recurrence?: { frequency: RecurrenceFrequency } | null;
}

function typeVerb(type: TransactionType): string {
  switch (type) {
    case "income":
      return "added income";
    case "expense":
      return "added an expense";
    case "transfer":
      return "made a transfer";
  }
}

/** Real-time transaction feed (newest first). Listeners must unsubscribe (PRD §64). */
export function subscribeTransactions(
  householdId: string,
  cb: (items: Transaction[]) => void,
  onError?: (e: Error) => void,
  max = 500
): () => void {
  const q = query(collection(getDb(), "households", householdId, "transactions"), orderBy("date", "desc"), fsLimit(max));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Transaction, "id">) }))),
    (e) => onError?.(e as Error)
  );
}

/** Older history beyond the live window (paginated by date cursor). */
export async function fetchTransactionsBefore(householdId: string, beforeDateISO: string, count = 100): Promise<Transaction[]> {
  const q = query(
    collection(getDb(), "households", householdId, "transactions"),
    orderBy("date", "desc"),
    fsLimit(count),
    where("date", "<", beforeDateISO)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Transaction, "id">) }));
}

export async function createTransaction(
  householdId: string,
  actorUid: string,
  memberUids: string[],
  input: TransactionInput,
  meta?: { categoryName?: string }
): Promise<string> {
  const db = getDb();
  const now = serverTimestamp();
  const recurring = input.recurrence?.frequency != null;

  const payload = {
    householdId,
    type: input.type,
    amount: Math.round(input.amount * 100) / 100,
    currency: "BDT",
    categoryId: input.categoryId,
    description: input.description.trim(),
    notes: input.notes?.trim() ?? "",
    date: input.date,
    accountId: input.type === "transfer" ? null : (input.accountId ?? null),
    fromAccountId: input.type === "transfer" ? input.fromAccountId : null,
    toAccountId: input.type === "transfer" ? input.toAccountId : null,
    createdBy: actorUid,
    updatedBy: actorUid,
    paidBy: input.paidBy,
    ownership: input.ownership,
    isRecurring: recurring,
    recurringId: null,
    recurrence: recurring ? { frequency: input.recurrence!.frequency, nextDueDate: advanceRecurrence(input.date, input.recurrence!.frequency) } : null,
    nextDueDate: recurring ? advanceRecurrence(input.date, input.recurrence!.frequency) : null,
    attachmentUrl: input.attachmentUrl ?? null,
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  const ref = await addDoc(collection(db, "households", householdId, "transactions"), payload);

  const label = meta?.categoryName ?? input.description ?? "a transaction";
  await logActivity(householdId, {
    actorId: actorUid,
    action: "transaction.created",
    entityType: "transaction",
    entityId: ref.id,
    description: `${label} — ${input.type === "income" ? "+" : input.type === "expense" ? "-" : ""}${money(payload.amount)}`,
    metadata: { type: input.type, date: input.date },
  });
  notifyPartners(householdId, memberUids, actorUid, {
    type: "partner",
    title: `${input.type === "income" ? "Income" : input.type === "expense" ? "Expense" : "Transfer"} added`,
    body: `${label} — ${input.type === "income" ? "+" : input.type === "expense" ? "-" : ""}${money(payload.amount)}`,
    entityType: "transaction",
    entityId: ref.id,
  });
  return ref.id;
}

export async function updateTransaction(
  householdId: string,
  transactionId: string,
  actorUid: string,
  memberUids: string[],
  patch: Partial<TransactionInput>
): Promise<void> {
  const db = getDb();
  const clean: Record<string, unknown> = { ...patch, updatedBy: actorUid, updatedAt: serverTimestamp() };
  delete (clean as Partial<TransactionInput>).recurrence; // recurrence is immutable after create (v1)
  await updateDoc(doc(db, "households", householdId, "transactions", transactionId), clean);
  await logActivity(householdId, {
    actorId: actorUid,
    action: "transaction.updated",
    entityType: "transaction",
    entityId: transactionId,
    description: `Updated a transaction`,
  });
  notifyPartners(householdId, memberUids, actorUid, {
    type: "partner",
    title: "Transaction updated",
    body: "Your partner edited a shared transaction.",
    entityType: "transaction",
    entityId: transactionId,
  });
}

/** Soft delete keeps history and calculations consistent (PRD §63). */
export async function deleteTransaction(
  householdId: string,
  transactionId: string,
  actorUid: string,
  memberUids: string[]
): Promise<void> {
  await updateDoc(doc(getDb(), "households", householdId, "transactions", transactionId), {
    deletedAt: serverTimestamp(),
    updatedBy: actorUid,
    updatedAt: serverTimestamp(),
    isRecurring: false, // stop future instances of a recurring parent
  });
  await logActivity(householdId, {
    actorId: actorUid,
    action: "transaction.deleted",
    entityType: "transaction",
    entityId: transactionId,
    description: "Deleted a transaction",
  });
  notifyPartners(householdId, memberUids, actorUid, {
    type: "partner",
    title: "Transaction deleted",
    body: "Your partner removed a transaction.",
    entityType: "transaction",
    entityId: transactionId,
  });
}

/**
 * Generate due instances of recurring transactions. Idempotent via deterministic
 * ids (`{parentId}__{dueDate}`), so both partners' clients can run this safely.
 */
export async function materializeRecurringTransactions(householdId: string): Promise<number> {
  const db = getDb();
  const today = todayISO();
  const q = query(
    collection(db, "households", householdId, "transactions"),
    where("isRecurring", "==", true),
    where("nextDueDate", "<=", today)
  );
  const snap = await getDocs(q);
  let created = 0;

  for (const parentDoc of snap.docs) {
    const parent = { id: parentDoc.id, ...parentDoc.data() } as Transaction;
    if (parent.deletedAt || !parent.recurrence) continue;

    let next = parent.recurrence.nextDueDate;
    let guard = 0;
    while (next <= today && guard < 36) {
      guard++;
      const instanceRef = doc(db, "households", householdId, "transactions", deterministicId(parent.id, next));
      const existing = await getDoc(instanceRef);
      if (!existing.exists()) {
        await setDoc(instanceRef, {
          ...parentDoc.data(),
          date: next,
          isRecurring: false,
          recurringId: parent.id,
          recurrence: null,
          nextDueDate: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          deletedAt: null,
        });
        created++;
      }
      next = advanceRecurrence(next, parent.recurrence.frequency);
    }
    await updateDoc(parentDoc.ref, { nextDueDate: next, "recurrence.nextDueDate": next, updatedAt: serverTimestamp() });
  }
  return created;
}
