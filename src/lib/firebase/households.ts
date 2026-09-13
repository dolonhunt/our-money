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
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import type { Household, HouseholdMember, HouseholdSplitRule, Role, UserProfile } from "@/types";
import { randomCode } from "@/lib/ids";
import { DEFAULT_CATEGORIES } from "./categories";
import { logActivity } from "./activity";
import { notifyQuietly } from "./notifications";
import { setUserHousehold } from "./auth";
import { getDb } from "./firestore";

export const MAX_MEMBERS = 2;

export interface CreateHouseholdResult {
  id: string;
  inviteCode: string;
  reused?: boolean;
}

export interface ExistingHouseholdResolution {
  id: string;
  household: Household;
  role: Role;
  source: "profile" | "ownership" | "session";
}

// In-memory mutex maps to serialize concurrent requests in the same client runtime
const inFlightHouseholdCreations = new Map<string, Promise<CreateHouseholdResult>>();
const inFlightHouseholdJoins = new Map<string, Promise<void>>();

/**
 * Deterministically resolves whether an authenticated user already has an active or owned household:
 * 1. Checks profile.householdId document and active membership
 * 2. If missing/stale, queries households owned by user (where ownerUid == uid)
 */
export async function findExistingUserHousehold(
  uid: string,
  profileHouseholdId?: string | null
): Promise<ExistingHouseholdResolution | null> {
  const db = getDb();

  // 1. Profile reference check
  if (profileHouseholdId) {
    try {
      const hhSnap = await getDoc(doc(db, "households", profileHouseholdId));
      if (hhSnap.exists()) {
        const memSnap = await getDoc(doc(db, "households", profileHouseholdId, "members", uid));
        if (memSnap.exists()) {
          const role = (memSnap.data()?.role as Role) || "owner";
          return {
            id: profileHouseholdId,
            household: { id: hhSnap.id, ...hhSnap.data() } as Household,
            role,
            source: "profile",
          };
        }
      }
    } catch (err) {
      console.warn("Error checking profile household link:", err);
    }
  }

  // 2. Ownership query check (for missing/stale profile.householdId recovery)
  try {
    const q = query(
      collection(db, "households"),
      where("ownerUid", "==", uid),
      limit(5)
    );
    const ownedSnap = await getDocs(q);
    if (!ownedSnap.empty) {
      // Pick the newest or best household
      const sortedDocs = ownedSnap.docs.sort((a, b) => {
        const aData = a.data();
        const bData = b.data();
        const aTime = aData.updatedAt?.toMillis?.() || aData.createdAt?.toMillis?.() || 0;
        const bTime = bData.updatedAt?.toMillis?.() || bData.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      const chosenDoc = sortedDocs[0];
      const household = { id: chosenDoc.id, ...chosenDoc.data() } as Household;

      // Ensure membership doc exists for owner
      const memRef = doc(db, "households", chosenDoc.id, "members", uid);
      const memSnap = await getDoc(memRef);
      if (!memSnap.exists()) {
        await setDoc(
          memRef,
          {
            uid,
            role: "owner",
            joinedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      return {
        id: chosenDoc.id,
        household,
        role: "owner",
        source: "ownership",
      };
    }
  } catch (err) {
    console.warn("Error querying owned households:", err);
  }

  return null;
}

/** Create a new money space owned by the current user, with default categories seeded. Idempotent & concurrency-safe. */
export async function createHousehold(
  user: UserProfile,
  name: string,
  currency: string
): Promise<CreateHouseholdResult> {
  // 1. In-flight mutex: if creation is already running for this user, return existing Promise
  const existingPromise = inFlightHouseholdCreations.get(user.uid);
  if (existingPromise) {
    return existingPromise;
  }

  const creationPromise = (async (): Promise<CreateHouseholdResult> => {
    const db = getDb();

    // 2. Client-side session check (browser refresh recovery)
    const sessionKey = typeof window !== "undefined" ? `om_created_hh_${user.uid}` : null;
    if (sessionKey) {
      const cachedId = sessionStorage.getItem(sessionKey);
      if (cachedId) {
        try {
          const cachedSnap = await getDoc(doc(db, "households", cachedId));
          if (cachedSnap.exists()) {
            const cachedHh = { id: cachedSnap.id, ...cachedSnap.data() } as Household;
            await setUserHousehold(user.uid, cachedId, "owner");
            return { id: cachedId, inviteCode: cachedHh.inviteCode, reused: true };
          }
        } catch {
          // Ignore cache read errors, proceed to full resolution
        }
      }
    }

    // 3. Pre-flight check: does user already have an active/owned household?
    const existing = await findExistingUserHousehold(user.uid, user.householdId);
    if (existing) {
      await setUserHousehold(user.uid, existing.id, existing.role);
      if (sessionKey) {
        sessionStorage.setItem(sessionKey, existing.id);
      }
      return { id: existing.id, inviteCode: existing.household.inviteCode, reused: true };
    }

    // 4. Atomic transaction creation: guarantees no duplicate even under concurrency
    const result = await runTransaction(db, async (tx) => {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await tx.get(userRef);
      const currentHouseholdId = userSnap.exists() ? (userSnap.data()?.householdId as string | null) : null;

      if (currentHouseholdId) {
        const hhRef = doc(db, "households", currentHouseholdId);
        const hhSnap = await tx.get(hhRef);
        if (hhSnap.exists()) {
          const hhData = hhSnap.data();
          return {
            id: currentHouseholdId,
            inviteCode: hhData.inviteCode,
            reused: true,
          };
        }
      }

      // No household exists. Create new household and owner member atomically.
      const householdRef = doc(collection(db, "households"));
      const inviteCode = randomCode(6);

      // Parent household document
      tx.set(householdRef, {
        name,
        currency,
        inviteCode,
        ownerUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Owner member document
      tx.set(doc(householdRef, "members", user.uid), {
        uid: user.uid,
        role: "owner",
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        joinedAt: serverTimestamp(),
      });

      // Link user profile to household
      tx.set(
        userRef,
        {
          householdId: householdRef.id,
          role: "owner",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      return { id: householdRef.id, inviteCode, reused: false };
    });

    if (sessionKey) {
      sessionStorage.setItem(sessionKey, result.id);
    }

    // 5. Seed default categories only if brand new household (non-blocking)
    if (!result.reused) {
      const catBatch = writeBatch(db);
      for (const cat of DEFAULT_CATEGORIES) {
        catBatch.set(doc(db, "households", result.id, "categories", cat.id), {
          ...cat,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        });
      }
      await catBatch.commit().catch((err) => {
        console.warn("Seeding default categories non-fatal warning:", err);
      });

      logActivity(result.id, {
        actorId: user.uid,
        action: "household.created",
        entityType: "household",
        entityId: result.id,
        description: `${user.displayName} created the money space “${name}”`,
      }).catch(() => undefined);
    }

    return result;
  })();

  inFlightHouseholdCreations.set(user.uid, creationPromise);

  try {
    return await creationPromise;
  } finally {
    inFlightHouseholdCreations.delete(user.uid);
  }
}

/** Verify an invite and join the household. Throws friendly errors (PRD §55). Idempotent & concurrency-safe. */
export async function joinHousehold(
  user: UserProfile,
  householdId: string,
  code: string
): Promise<void> {
  const existingPromise = inFlightHouseholdJoins.get(user.uid);
  if (existingPromise) {
    return existingPromise;
  }

  const joinPromise = (async () => {
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
    }).catch(() => undefined);

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
  })();

  inFlightHouseholdJoins.set(user.uid, joinPromise);

  try {
    await joinPromise;
  } finally {
    inFlightHouseholdJoins.delete(user.uid);
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
  splitRule?: HouseholdSplitRule;
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
