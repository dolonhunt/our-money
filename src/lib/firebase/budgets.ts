import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import type { Budget, Ownership, Transaction } from "@/types";
import { budgetProgress } from "@/lib/finance";
import { money, pct } from "@/lib/currency";
import { createNotification } from "./notifications";
import { getDb } from "./firestore";

export function subscribeBudgets(
  householdId: string,
  month: string,
  cb: (items: Budget[]) => void,
  onError?: (e: Error) => void
): () => void {
  const q = query(
    collection(getDb(), "households",
          householdId, "budgets"),
    where("month", "==", month),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Budget, "id">) }))),
    (e) => onError?.(e as Error)
  );
}

export interface BudgetInput {
  categoryId: string;
  month: string;
  amount: number;
  ownership: Ownership;
  notes?: string;
}

export async function saveBudget(householdId: string, actorUid: string, input: BudgetInput, existingId?: string): Promise<string> {
  const db = getDb();
  const payload = {

          householdId,
    categoryId: input.categoryId,
    month: input.month,
    amount: Math.round(input.amount * 100) / 100,
    ownership: input.ownership,
    notes: input.notes?.trim() ?? "",
    createdBy: actorUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (existingId) {
    const { createdBy, createdAt, ...patch } = payload;
    await updateDoc(doc(db, "households",
          householdId, "budgets", existingId), { ...patch, updatedAt: serverTimestamp() });
    return existingId;
  }
  const ref = await addDoc(collection(db, "households",
          householdId, "budgets"), payload);
  return ref.id;
}

export async function deleteBudget(householdId: string, budgetId: string): Promise<void> {
  await deleteDoc(doc(getDb(), "households",
          householdId, "budgets", budgetId));
}

/**
 * Idempotent budget threshold alerts for a month (PRD §41 thresholds, §47 examples).
 * Called from the dashboard once transactions + budgets settle.
 */
export async function checkBudgetAlerts(
  householdId: string,
  budgets: Budget[],
  transactions: Transaction[],
  memberUids: string[],
  categoryNames: Record<string, string>,
  month: string
): Promise<void> {
  for (const budget of budgets) {
    const { ratio, spent } = budgetProgress(budget, transactions, month);
    const name = categoryNames[budget.categoryId] ?? "Budget";
    if (ratio >= 1) {
      for (const uid of memberUids) {
        await createNotification(
          householdId, {
          uid,

          householdId,
          actorId: null,
          read: false,
          type: "budget",
          title: "Budget exceeded",
          body: `${name} budget is over — ${money(spent)} of ${money(budget.amount)}.`,
          entityType: "budget",
          entityId: budget.id,
          dedupeKey: `budget100_${budget.id}_${month}_${uid}`,
        });
      }
    } else if (ratio >= 0.9) {
      for (const uid of memberUids) {
        await createNotification(
          householdId, {
          uid,

          householdId,
          actorId: null,
          read: false,
          type: "budget",
          title: "Budget almost used",
          body: `${name} budget is ${pct(ratio * 100, 0)} used.`,
          entityType: "budget",
          entityId: budget.id,
          dedupeKey: `budget90_${budget.id}_${month}_${uid}`,
        });
      }
    }
  }
}
