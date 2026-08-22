import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import type { Activity } from "@/types";
import { getDb } from "./firestore";

/** Append a meaningful event to the household activity feed (PRD §61, §66). */
export async function logActivity(
  householdId: string,
  entry: {
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    description: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await addDoc(collection(getDb(), "households", householdId, "activity"), {
    ...entry,
    metadata: entry.metadata ?? null,
    createdAt: serverTimestamp(),
  });
}

/** Real-time "Together" feed — latest events. */
export function subscribeActivity(
  householdId: string,
  cb: (items: Activity[]) => void,
  onError?: (e: Error) => void
): () => void {
  const q = query(collection(getDb(), "households", householdId, "activity"), orderBy("createdAt", "desc"), limit(40));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Activity, "id">) }))),
    (e) => onError?.(e as Error)
  );
}
