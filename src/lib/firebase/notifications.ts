import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import type { AppNotification, NotificationType } from "@/types";
import { deterministicId } from "@/lib/ids";
import { getDb } from "./firestore";

/**
 * Notification writes are idempotent via deterministic ids so client-side
 * alert generators (budget thresholds, bill reminders, goal milestones)
 * never spam duplicates (PRD §48).
 */
export async function createNotification(
  householdId: string,
  data: Omit<AppNotification, "id" | "createdAt"> & { dedupeKey?: string }
): Promise<void> {
  const id = data.dedupeKey ? deterministicId(data.type, data.dedupeKey) : undefined;
  const ref = id
    ? doc(getDb(), "households",
          householdId, "notifications", id)
    : doc(collection(getDb(), "households",
          householdId, "notifications"));
  if (id) {
    const existing = await getDoc(ref);
    if (existing.exists()) return; // already notified — never re-unread
  }
  const { dedupeKey: _drop, ...payload } = data;
  await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
}

/** Fire-and-forget variant for UI flows that shouldn't block on notification writes. */
export function notifyQuietly(householdId: string, data: Parameters<typeof createNotification>[1]): void {
  createNotification(
          householdId, data).catch(() => undefined);
}

/** Notify every household member EXCEPT the actor (partner activity, PRD §47). */
export function notifyPartners(
  householdId: string,
  memberUids: string[],
  actorUid: string,
  payload: {
    type: NotificationType;
    title: string;
    body: string;
    entityType?: string | null;
    entityId?: string | null;
    dedupeKey?: string;
  }
): void {
  for (const uid of memberUids) {
    if (uid === actorUid) continue;
    notifyQuietly(
          householdId, {
      uid,

          householdId,
      actorId: actorUid,
      read: false,
      title: payload.title,
      body: payload.body,
      type: payload.type,
      entityType: payload.entityType ?? null,
      entityId: payload.entityId ?? null,
      dedupeKey: payload.dedupeKey ? `${payload.dedupeKey}_${uid}` : undefined,
    });
  }
}

/** Real-time notification list for a user. */
export function subscribeNotifications(
  householdId: string,
  uid: string,
  cb: (items: AppNotification[]) => void,
  onError?: (e: Error) => void
): () => void {
  const q = query(
    collection(getDb(), "households",
          householdId, "notifications"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(60)
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AppNotification, "id">) }))),
    (e) => onError?.(e as Error)
  );
}

export async function markNotificationRead(householdId: string, id: string): Promise<void> {
  await updateDoc(doc(getDb(), "households",
          householdId, "notifications", id), { read: true });
}

export async function markAllNotificationsRead(householdId: string, uid: string, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const db = getDb();
  const batch = writeBatch(db);
  for (const id of ids) {
    batch.update(doc(db, "households",
          householdId, "notifications", id), { read: true });
  }
  await batch.commit();
}
