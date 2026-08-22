import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import type { Goal, GoalContribution } from "@/types";
import { money } from "@/lib/currency";
import { logActivity } from "./activity";
import { notifyPartners } from "./notifications";
import { getDb } from "./firestore";

export function subscribeGoals(
  householdId: string,
  cb: (items: Goal[]) => void,
  onError?: (e: Error) => void
): () => void {
  const q = query(collection(getDb(), "households", householdId, "goals"), orderBy("createdAt", "asc"));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Goal, "id">) }))),
    (e) => onError?.(e as Error)
  );
}

export interface GoalInput {
  name: string;
  targetAmount: number;
  targetDate?: string | null;
  icon?: string;
  description?: string;
}

export async function createGoal(householdId: string, actorUid: string, input: GoalInput): Promise<string> {
  const ref = await addDoc(collection(getDb(), "households", householdId, "goals"), {
    householdId,
    name: input.name.trim(),
    targetAmount: Math.round(input.targetAmount * 100) / 100,
    currentAmount: 0,
    targetDate: input.targetDate ?? null,
    icon: input.icon ?? "Target",
    description: input.description?.trim() ?? "",
    createdBy: actorUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateGoal(householdId: string, goalId: string, patch: Partial<Pick<Goal, "name" | "targetAmount" | "targetDate" | "icon" | "description">>): Promise<void> {
  await updateDoc(doc(getDb(), "households", householdId, "goals", goalId), { ...patch, updatedAt: serverTimestamp() });
}

/** Delete a goal and its contribution history (batch). */
export async function deleteGoal(householdId: string, goalId: string): Promise<void> {
  const db = getDb();
  const contribSnap = await getDocs(query(collection(db, "households", householdId, "goalContributions"), where("goalId", "==", goalId)));
  const batch = writeBatch(db);
  for (const c of contribSnap.docs) batch.delete(c.ref);
  batch.delete(doc(db, "households", householdId, "goals", goalId));
  await batch.commit();
}

const MILESTONES = [0.25, 0.5, 0.75, 1];

/**
 * Contribute to a goal. Runs a Firestore transaction so concurrent
 * contributions from both partners can never lose an update (PRD §65).
 */
export async function contributeToGoal(
  householdId: string,
  goalId: string,
  actorUid: string,
  memberUids: string[],
  input: { amount: number; date: string; note?: string; actorName: string }
): Promise<void> {
  const db = getDb();
  const goalRef = doc(db, "households", householdId, "goals", goalId);

  let before = 0;
  let after = 0;
  let goalName = "";
  let target = 0;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(goalRef);
    if (!snap.exists()) throw new Error("This goal no longer exists.");
    const goal = snap.data() as Goal;
    goalName = goal.name;
    target = goal.targetAmount;
    before = goal.currentAmount ?? 0;
    after = before + Math.round(input.amount * 100) / 100;
    tx.update(goalRef, { currentAmount: after, updatedAt: serverTimestamp() });
  });

  const contribRef = doc(collection(db, "households", householdId, "goalContributions"));
  await setDoc(contribRef, {
    householdId,
    goalId,
    uid: actorUid,
    amount: Math.round(input.amount * 100) / 100,
    date: input.date,
    note: input.note?.trim() ?? "",
    createdAt: serverTimestamp(),
  });

  await logActivity(householdId, {
    actorId: actorUid,
    action: "goal.contributed",
    entityType: "goal",
    entityId: goalId,
    description: `contributed ${money(input.amount)} to ${goalName}`,
    metadata: { goalName, amount: input.amount },
  });
  notifyPartners(householdId, memberUids, actorUid, {
    type: "goal",
    title: "Goal contribution",
    body: `${input.actorName} added ${money(input.amount)} to ${goalName}.`,
    entityType: "goal",
    entityId: goalId,
  });

  // Milestone notifications (25 / 50 / 75 / 100%) — idempotent per crossing
  if (target > 0) {
    for (const m of MILESTONES) {
      if (before < m * target && after >= m * target) {
        notifyPartners(householdId, memberUids, actorUid, {
          type: "goal",
          title: m >= 1 ? "Goal reached 🎉" : "Goal milestone",
          body: `${goalName} is at ${Math.round(m * 100)}%.`,
          entityType: "goal",
          entityId: goalId,
          dedupeKey: `goalM${m}_${goalId}`,
        });
      }
    }
  }
}

export function subscribeContributions(
  householdId: string,
  goalId: string,
  cb: (items: GoalContribution[]) => void,
  onError?: (e: Error) => void
): () => void {
  const q = query(
    collection(getDb(), "households", householdId, "goalContributions"),
    where("goalId", "==", goalId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GoalContribution, "id">) }))),
    (e) => onError?.(e as Error)
  );
}
