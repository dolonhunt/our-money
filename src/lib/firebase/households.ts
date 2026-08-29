import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import type { Household, HouseholdMember, UserProfile } from "@/types";
import { randomCode } from "@/lib/ids";
import { DEFAULT_CATEGORIES } from "./categories";
import { logActivity } from "./activity";
import { notifyQuietly } from "./notifications";
import { setUserHousehold } from "./auth";
import { getDb } from "./firestore";

export const MAX_MEMBERS = 2;

/** Create a new money space owned by the current user, with default categories seeded. */
export async function createHousehold(
  user: UserProfile,
  name: string,
  currency: string
): Promise<{ id: string; inviteCode: string }> {
  const db = getDb();
  const householdRef = doc(collection(db, "households"));
  const inviteCode = randomCode(6);
  const batch1 = writeBatch(db);

  batch1.set(householdRef, {
    name,
    currency,
    inviteCode,
    ownerUid: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch1.set(doc(householdRef, "members", user.uid), {
    uid: user.uid,
    role: "owner",
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    joinedAt: serverTimestamp(),
  });

  await batch1.commit();

  // Seed default categories after owner member document is committed
  const batch2 = writeBatch(db);
  for (const cat of DEFAULT_CATEGORIES) {
    batch2.set(doc(householdRef, "categories", cat.id), {
      ...cat,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    });
  }
  await batch2.commit().catch((err) => {
    console.warn("Seeding default categories failed (safe to ignore):", err);
  });

  await setUserHousehold(user.uid, householdRef.id, "owner");
  logActivity(householdRef.id, {
    actorId: user.uid,
    action: "household.created",
    entityType: "household",
    entityId: householdRef.id,
    description: `${user.displayName} created the money space “${name}”`,
  }).catch(() => undefined);
  return { id: householdRef.id, inviteCode };
}

/** Verify an invite and join the household. Throws friendly errors (PRD §55). */
export async function joinHousehold(
  user: UserProfile,
  householdId: string,
  code: string
): Promise<void> {
  const db = getDb();
  const householdSnap = await getDoc(doc(db, "households", householdId));
  if (!householdSnap.exists()) throw new Error("This invite is no longer valid.");
  const household = { id: householdSnap.id, ...householdSnap.data() } as Household;
  if (household.inviteCode.toUpperCase() !== code.trim().toUpperCase()) {
    throw new Error("That invite code doesn't match this money space.");
  }

  const membersSnap = await getDocs(collection(db, "households", householdId, "members"));
  const existing = membersSnap.docs.map((d) => d.data() as HouseholdMember);
  if (existing.some((m) => m.uid === user.uid)) {
    // already a member — just re-link the profile
    await setUserHousehold(user.uid, householdId, existing.find((m) => m.uid === user.uid)!.role);
    return;
  }
  if (existing.length >= MAX_MEMBERS) throw new Error("This money space already has two partners.");

  // joinedViaCode is validated against household.inviteCode by security rules
  await setDoc(doc(db, "households", householdId, "members", user.uid), {
    uid: user.uid,
    role: "member",
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    joinedViaCode: code.trim().toUpperCase(),
    joinedAt: serverTimestamp(),
  });
  await setUserHousehold(user.uid, householdId, "member");
  await updateDoc(doc(db, "households", householdId), { updatedAt: serverTimestamp() });

  await logActivity(householdId, {
    actorId: user.uid,
    action: "member.joined",
    entityType: "household",
    entityId: householdId,
    description: `${user.displayName} joined the money space 🎉`,
  });
  for (const m of existing) {
    notifyQuietly(householdId, {
      householdId,
      uid: m.uid,
      actorId: user.uid,
      read: false,
      type: "household",
      title: "Your partner joined",
      body: `${user.displayName} is now connected to ${household.name}.`,
      entityType: "household",
      entityId: householdId,
    });
  }
}

export interface JoinCodePayload {
  householdId: string;
  code: string;
}

/** Parse a pasted invite string ("householdId.code") or link (?h=..&c=..). */
export function parseInvite(input: string): JoinCodePayload | null {
  const trimmed = input.trim();
  try {
    const asUrl = new URL(trimmed);
    const h = asUrl.searchParams.get("h");
    const c = asUrl.searchParams.get("c");
    if (h && c) return { householdId: h, code: c };
  } catch {
    /* not a URL — fall through */
  }
  const m = trimmed.match(/^([A-Za-z0-9]{20,})[.\s]+([A-Za-z0-9]{4,10})$/);
  if (m) return { householdId: m[1], code: m[2] };
  return null;
}

/** Real-time household document. */
export function subscribeHousehold(
  householdId: string,
  cb: (h: Household | null) => void,
  onError?: (e: Error) => void
): () => void {
  return onSnapshot(
    doc(getDb(), "households", householdId),
    (snap) => cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as Household) : null),
    (e) => onError?.(e as Error)
  );
}

/** Real-time member list (ordered by join date). */
export function subscribeMembers(
  householdId: string,
  cb: (members: HouseholdMember[]) => void,
  onError?: (e: Error) => void
): () => void {
  const q = query(collection(getDb(), "households", householdId, "members"), orderBy("joinedAt", "asc"), limit(MAX_MEMBERS));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as Omit<HouseholdMember, "id">) }))),
    (e) => onError?.(e as Error)
  );
}

export interface HouseholdSettingsPatch {
  name?: string;
  currency?: string;
}

export async function updateHouseholdSettings(householdId: string, patch: HouseholdSettingsPatch): Promise<void> {
  await updateDoc(doc(getDb(), "households", householdId), { ...patch, updatedAt: serverTimestamp() });
}

export async function regenerateInviteCode(householdId: string): Promise<string> {
  const code = randomCode(6);
  await updateDoc(doc(getDb(), "households", householdId), { inviteCode: code, updatedAt: serverTimestamp() });
  return code;
}

/** Leave a household. The sole owner dissolves the space entirely. */
export async function leaveHousehold(user: UserProfile, household: Household, memberCount: number): Promise<"left" | "dissolved"> {
  const db = getDb();
  const soleOwnerLeaving = user.uid === household.ownerUid && memberCount <= 1;

  await setUserHousehold(user.uid, null, null);

  if (soleOwnerLeaving) {
    // Best-effort cascade delete of known subcollections, then the household itself.
    const subcollections = [
      "transactions",
      "categories",
      "budgets",
      "accounts",
      "goals",
      "goalContributions",
      "bills",
      "notifications",
      "activity",
    ];
    for (const sub of subcollections) {
      const snap = await getDocs(collection(db, "households", household.id, sub));
      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += 400) {
        const batch = writeBatch(db);
        for (const d of docs.slice(i, i + 400)) batch.delete(d.ref);
        if (docs.slice(i, i + 400).length) await batch.commit();
      }
    }
    await deleteDoc(doc(db, "households", household.id));
    return "dissolved";
  }

  // Log while the member doc still exists — activity writes require membership.
  await logActivity(household.id, {
    actorId: user.uid,
    action: "member.left",
    entityType: "household",
    entityId: household.id,
    description: `${user.displayName} left the money space`,
  });
  await deleteDoc(doc(db, "households", household.id, "members", user.uid));
  return "left";
}

/** Owner transfers ownership to the other member (PRD §18). */
export async function transferOwnership(householdId: string, newOwnerUid: string): Promise<void> {
  const db = getDb();
  const batch = writeBatch(db);
  batch.update(doc(db, "households", householdId), { ownerUid: newOwnerUid, updatedAt: serverTimestamp() });
  batch.set(doc(db, "households", householdId, "members", newOwnerUid), { role: "owner" }, { merge: true });
  const membersSnap = await getDocs(collection(db, "households", householdId, "members"));
  for (const m of membersSnap.docs) {
    if (m.id !== newOwnerUid) batch.update(m.ref, { role: "member" });
  }
  await batch.commit();
}

/**
 * Remove a member (owner only, PRD §18). The removed member's own client
 * detects the missing membership doc and clears their profile link —
 * cross-user profile writes are correctly denied by security rules.
 */
export async function removeMember(householdId: string, memberUid: string): Promise<void> {
  const db = getDb();
  await logActivity(householdId, {
    actorId: memberUid,
    action: "member.removed",
    entityType: "household",
    entityId: householdId,
    description: "A member was removed from the money space",
  });
  await deleteDoc(doc(db, "households", householdId, "members", memberUid));
  await updateDoc(doc(db, "households", householdId), { updatedAt: serverTimestamp() });
}
