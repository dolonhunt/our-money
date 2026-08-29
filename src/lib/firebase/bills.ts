import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import type { Bill, Ownership, Recurring } from "@/types";
import { addDays, advanceRecurrence, todayISO } from "@/lib/dates";
import { money } from "@/lib/currency";
import { createNotification } from "./notifications";
import { logActivity } from "./activity";
import { notifyPartners } from "./notifications";
import { getDb } from "./firestore";

export function subscribeBills(
  householdId: string,
  cb: (items: Bill[]) => void,
  onError?: (e: Error) => void
): () => void {
  const q = query(collection(getDb(), "households", householdId, "bills"), orderBy("dueDate", "asc"));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Bill, "id">) }))),
    (e) => onError?.(e as Error)
  );
}

export interface BillInput {
  name: string;
  amount: number;
  dueDate: string;
  categoryId?: string | null;
  accountId?: string | null;
  recurring: Recurring;
  reminderDays: number;
  ownership: Ownership;
}

export async function saveBill(householdId: string, actorUid: string, input: BillInput, existingId?: string): Promise<string> {
  const db = getDb();
  const payload = {
    householdId,
    name: input.name.trim(),
    amount: Math.round(input.amount * 100) / 100,
    dueDate: input.dueDate,
    categoryId: input.categoryId ?? null,
    accountId: input.accountId ?? null,
    recurring: input.recurring,
    reminderDays: input.reminderDays,
    paid: false,
    paidAt: null,
    paidTransactionId: null,
    ownership: input.ownership,
    createdBy: actorUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (existingId) {
    const { paid, paidAt, paidTransactionId, createdBy, createdAt, ...patch } = payload;
    await updateDoc(doc(db, "households", householdId, "bills", existingId), patch);
    return existingId;
  }
  const ref = await addDoc(collection(db, "households", householdId, "bills"), payload);
  return ref.id;
}

export async function deleteBill(householdId: string, billId: string): Promise<void> {
  await deleteDoc(doc(getDb(), "households", householdId, "bills", billId));
}

export async function markBillUnpaid(householdId: string, billId: string): Promise<void> {
  await updateDoc(doc(getDb(), "households", householdId, "bills", billId), {
    paid: false,
    paidAt: null,
    paidTransactionId: null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Pay a bill atomically: creates the expense transaction, marks the bill paid,
 * and for recurring bills spawns the next unpaid instance (PRD §43).
 */
export async function payBill(
  householdId: string,
  bill: Bill,
  actorUid: string,
  memberUids: string[],
  options?: { accountId?: string | null }
): Promise<void> {
  const db = getDb();
  const today = todayISO();
  const batch = writeBatch(db);

  const txRef = doc(collection(db, "households", householdId, "transactions"));
  batch.set(txRef, {
    householdId,
    type: "expense",
    amount: bill.amount,
    currency: "BDT",
    categoryId: bill.categoryId ?? "utilities",
    description: bill.name,
    notes: "Paid bill",
    date: today,
    accountId: options?.accountId ?? bill.accountId,
    fromAccountId: null,
    toAccountId: null,
    createdBy: actorUid,
    updatedBy: actorUid,
    paidBy: actorUid,
    ownership: bill.ownership,
    isRecurring: false,
    recurringId: null,
    recurrence: null,
    nextDueDate: null,
    attachmentUrl: null,
    tags: ["bill"],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deletedAt: null,
  });

  batch.update(doc(db, "households", householdId, "bills", bill.id), {
    paid: true,
    paidAt: serverTimestamp(),
    paidTransactionId: txRef.id,
    updatedAt: serverTimestamp(),
  });

  if (bill.recurring !== "none") {
    const nextRef = doc(collection(db, "households", householdId, "bills"));
    batch.set(nextRef, {
      householdId,
      name: bill.name,
      amount: bill.amount,
      dueDate: advanceRecurrence(bill.dueDate, bill.recurring as "daily" | "weekly" | "monthly" | "yearly"),
      categoryId: bill.categoryId,
      accountId: bill.accountId,
      recurring: bill.recurring,
      reminderDays: bill.reminderDays,
      paid: false,
      paidAt: null,
      paidTransactionId: null,
      ownership: bill.ownership,
      createdBy: bill.createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
  await logActivity(householdId, {
    actorId: actorUid,
    action: "bill.paid",
    entityType: "bill",
    entityId: bill.id,
    description: `paid ${bill.name} — ${money(bill.amount)}`,
    metadata: { billName: bill.name },
  });
  notifyPartners(householdId, memberUids, actorUid, {
    type: "partner",
    title: "Bill paid",
    body: `${bill.name} — ${money(bill.amount)}`,
    entityType: "bill",
    entityId: bill.id,
  });
}

export type BillStatus = "upcoming" | "due-soon" | "overdue" | "paid";

export function billStatus(bill: Bill): BillStatus {
  if (bill.paid) return "paid";
  const today = todayISO();
  if (bill.dueDate < today) return "overdue";
  if (bill.dueDate <= addDays(today, Math.max(1, bill.reminderDays || 3))) return "due-soon";
  return "upcoming";
}

/** Idempotent bill reminder notifications (PRD §47). */
export async function checkBillReminders(householdId: string, bills: Bill[], memberUids: string[]): Promise<void> {
  const today = todayISO();
  for (const bill of bills) {
    if (bill.paid) continue;
    const status = billStatus(bill);
    if (status === "due-soon" || status === "overdue") {
      for (const uid of memberUids) {
        await createNotification(householdId, {
          uid,
          actorId: null,
          read: false,
          type: "bill",
          title: status === "overdue" ? "Bill overdue" : "Bill due soon",
          body: `${bill.name} — ${money(bill.amount)}${status === "overdue" ? "" : `, due ${bill.dueDate === addDays(today, 1) ? "tomorrow" : bill.dueDate}`}.`,
          entityType: "bill",
          entityId: `${bill.id}_${bill.dueDate}`,
          dedupeKey: `bill_${bill.id}_${bill.dueDate}_${uid}`,
        });
      }
    }
  }
}
