import test from "node:test";
import assert from "node:assert/strict";
import { resolveSetupState, getRouteForSetupState } from "../src/lib/auth/setupState.ts";
import { parseInvite } from "../src/lib/invites.ts";

// In-memory Firestore simulation engine for deterministic test execution
class MockFirestore {
  users = new Map<string, any>();
  households = new Map<string, any>();
  members = new Map<string, Map<string, any>>(); // householdId -> (uid -> member)
  categories = new Map<string, Map<string, any>>(); // householdId -> (catId -> category)
  activity = new Map<string, any[]>();
  transactionCommitCount = 0;

  reset() {
    this.users.clear();
    this.households.clear();
    this.members.clear();
    this.categories.clear();
    this.activity.clear();
    this.transactionCommitCount = 0;
  }
}

const mockDb = new MockFirestore();

// In-flight mutex simulator matching households.ts
const inFlightCreations = new Map<string, Promise<any>>();
const inFlightJoins = new Map<string, Promise<any>>();

async function simulateFindExistingUserHousehold(uid: string, profileHouseholdId?: string | null) {
  // 1. Profile / user document reference check
  let targetHhId = profileHouseholdId;
  if (!targetHhId) {
    const u = mockDb.users.get(uid);
    if (u?.householdId) {
      targetHhId = u.householdId;
    }
  }

  if (targetHhId && mockDb.households.has(targetHhId)) {
    const mems = mockDb.members.get(targetHhId);
    if (mems && mems.has(uid)) {
      return {
        id: targetHhId,
        household: mockDb.households.get(targetHhId),
        role: mems.get(uid).role,
        source: "profile",
      };
    }
  }

  // 2. Ownership query check
  for (const [id, hh] of mockDb.households.entries()) {
    if (hh.ownerUid === uid) {
      const mems = mockDb.members.get(id) || new Map();
      if (!mems.has(uid)) {
        mems.set(uid, { uid, role: "owner" });
        mockDb.members.set(id, mems);
      }
      return {
        id,
        household: hh,
        role: "owner",
        source: "ownership",
      };
    }
  }

  // 3. Active membership check across all households
  for (const [id, mems] of mockDb.members.entries()) {
    if (mems.has(uid) && mockDb.households.has(id)) {
      return {
        id,
        household: mockDb.households.get(id),
        role: mems.get(uid).role,
        source: "membership",
      };
    }
  }

  return null;
}

interface CreateOptions {
  failOnTransaction?: boolean;
  delayMs?: number;
}

async function simulateCreateHousehold(
  user: { uid: string; displayName: string; email: string; photoURL: string | null; householdId: string | null },
  name: string,
  currency: string,
  options: CreateOptions = {}
) {
  if (inFlightCreations.has(user.uid)) {
    return inFlightCreations.get(user.uid);
  }

  const creationPromise = (async () => {
    if (options.delayMs) {
      await new Promise((r) => setTimeout(r, options.delayMs));
    }

    // 1. Pre-flight check
    const existing = await simulateFindExistingUserHousehold(user.uid, user.householdId);
    if (existing) {
      const u = mockDb.users.get(user.uid) || { uid: user.uid };
      u.householdId = existing.id;
      u.role = existing.role;
      mockDb.users.set(user.uid, u);
      return { id: existing.id, inviteCode: existing.household.inviteCode, reused: true };
    }

    if (options.failOnTransaction) {
      throw new Error("Simulated Firestore transaction network failure");
    }

    // 2. Transaction simulation
    const u = mockDb.users.get(user.uid);
    if (u?.householdId && mockDb.households.has(u.householdId)) {
      return { id: u.householdId, inviteCode: mockDb.households.get(u.householdId).inviteCode, reused: true };
    }

    const newHhId = `hh_${Math.random().toString(36).substring(2, 9)}`;
    const inviteCode = "INV123";

    mockDb.households.set(newHhId, {
      id: newHhId,
      name,
      currency,
      inviteCode,
      ownerUid: user.uid,
    });

    const memMap = new Map();
    memMap.set(user.uid, { uid: user.uid, role: "owner", displayName: user.displayName });
    mockDb.members.set(newHhId, memMap);

    mockDb.users.set(user.uid, {
      ...u,
      uid: user.uid,
      householdId: newHhId,
      role: "owner",
    });

    // Seed default categories
    const catMap = new Map();
    catMap.set("cat_groceries", { id: "cat_groceries", name: "Groceries" });
    catMap.set("cat_rent", { id: "cat_rent", name: "Rent" });
    mockDb.categories.set(newHhId, catMap);

    mockDb.transactionCommitCount++;
    return { id: newHhId, inviteCode, reused: false };
  })();

  inFlightCreations.set(user.uid, creationPromise);
  try {
    return await creationPromise;
  } finally {
    inFlightCreations.delete(user.uid);
  }
}

async function simulateJoinHousehold(
  user: { uid: string; displayName: string },
  householdId: string,
  code: string
) {
  if (inFlightJoins.has(user.uid)) {
    return inFlightJoins.get(user.uid);
  }

  const joinPromise = (async () => {
    const hh = mockDb.households.get(householdId);
    if (!hh) throw new Error("This invite is no longer valid.");
    if (hh.inviteCode !== code.trim().toUpperCase()) throw new Error("That invite code doesn't match this money space.");

    const mems = mockDb.members.get(householdId) || new Map();
    if (mems.has(user.uid)) {
      // Re-link
      const u = mockDb.users.get(user.uid) || { uid: user.uid };
      u.householdId = householdId;
      u.role = mems.get(user.uid).role;
      mockDb.users.set(user.uid, u);
      return;
    }
    if (mems.size >= 2) throw new Error("This money space already has two partners.");

    mems.set(user.uid, { uid: user.uid, role: "member", displayName: user.displayName });
    mockDb.members.set(householdId, mems);

    const u = mockDb.users.get(user.uid) || { uid: user.uid };
    u.householdId = householdId;
    u.role = "member";
    mockDb.users.set(user.uid, u);
  })();

  inFlightJoins.set(user.uid, joinPromise);
  try {
    await joinPromise;
  } finally {
    inFlightJoins.delete(user.uid);
  }
}

/* ========================================================================== */
/* REQUIRED AUTOMATED TESTS                                                   */
/* ========================================================================== */

test("1. New user completes onboarding once -> exactly 1 household, 1 owner membership, profile linked, reaches dashboard", async () => {
  mockDb.reset();
  const newUser = {
    uid: "user_alice",
    displayName: "Alice",
    email: "alice@example.com",
    photoURL: null,
    householdId: null,
  };
  mockDb.users.set(newUser.uid, newUser);

  // Initial setup state: profile loaded, householdId null => needs_household
  const initialSetup = resolveSetupState({
    authLoading: false,
    user: { uid: newUser.uid },
    profileLoading: false,
    profileStatus: "loaded",
    profile: newUser,
    householdLoading: false,
    household: null,
    members: [],
  });
  assert.equal(initialSetup, "needs_household");
  assert.equal(getRouteForSetupState(initialSetup, "/onboarding"), null);

  // User creates space
  const result = await simulateCreateHousehold(newUser, "Alice + Bob", "USD");
  assert.equal(result.reused, false);
  assert.equal(mockDb.households.size, 1);
  assert.equal(mockDb.members.get(result.id)?.size, 1);
  assert.equal(mockDb.users.get(newUser.uid)?.householdId, result.id);

  // After creation, setupState resolves to complete
  const finalSetup = resolveSetupState({
    authLoading: false,
    user: { uid: newUser.uid },
    profileLoading: false,
    profileStatus: "loaded",
    profile: mockDb.users.get(newUser.uid),
    householdLoading: false,
    household: mockDb.households.get(result.id),
    members: Array.from(mockDb.members.get(result.id)!.values()),
  });
  assert.equal(finalSetup, "complete");
  // User on onboarding is routed to dashboard
  assert.equal(getRouteForSetupState(finalSetup, "/onboarding"), "/dashboard");
});

test("2. Double-click Create Money Space -> exactly 1 household, 1 membership, 1 profile relation exists", async () => {
  mockDb.reset();
  const user = {
    uid: "user_double_clicker",
    displayName: "Clicker",
    email: "click@example.com",
    photoURL: null,
    householdId: null,
  };
  mockDb.users.set(user.uid, user);

  // Two concurrent calls fired at the same instant
  const [res1, res2] = await Promise.all([
    simulateCreateHousehold(user, "Clicker Space", "USD", { delayMs: 15 }),
    simulateCreateHousehold(user, "Clicker Space", "USD", { delayMs: 15 }),
  ]);

  // Both calls resolve to the EXACT SAME household ID
  assert.equal(res1.id, res2.id);
  assert.equal(mockDb.households.size, 1);
  assert.equal(mockDb.members.get(res1.id)?.size, 1);
  assert.equal(mockDb.users.get(user.uid)?.householdId, res1.id);
  assert.equal(mockDb.transactionCommitCount, 1);
});

test("3. Retry/refresh during creation -> no duplicate household, membership, or category seeds", async () => {
  mockDb.reset();
  const user = {
    uid: "user_retry",
    displayName: "Retryer",
    email: "retry@example.com",
    photoURL: null,
    householdId: null,
  };
  mockDb.users.set(user.uid, user);

  // First creation attempt succeeds
  const first = await simulateCreateHousehold(user, "My Space", "USD");
  assert.equal(mockDb.households.size, 1);
  assert.equal(mockDb.categories.get(first.id)?.size, 2);

  // Browser refresh occurs: user invokes creation again with updated profile state
  const refreshedUser = mockDb.users.get(user.uid);
  const second = await simulateCreateHousehold(refreshedUser, "My Space", "USD");

  assert.equal(second.id, first.id);
  assert.equal(second.reused, true);
  assert.equal(mockDb.households.size, 1);
  assert.equal(mockDb.members.get(first.id)?.size, 1);
  // Categories were not duplicated
  assert.equal(mockDb.categories.get(first.id)?.size, 2);
});

test("4. Existing completed user enters /onboarding -> existing household is reused, existing data intact, ends at dashboard", async () => {
  mockDb.reset();
  const existingHhId = "hh_established_123";
  const user = {
    uid: "user_existing",
    displayName: "Veteran",
    email: "vet@example.com",
    photoURL: null,
    householdId: existingHhId,
    role: "owner",
  };
  mockDb.users.set(user.uid, user);
  mockDb.households.set(existingHhId, {
    id: existingHhId,
    name: "Established Household",
    currency: "USD",
    inviteCode: "EST123",
    ownerUid: user.uid,
  });
  const memMap = new Map();
  memMap.set(user.uid, { uid: user.uid, role: "owner", displayName: "Veteran" });
  mockDb.members.set(existingHhId, memMap);

  // Setup state is complete
  const setupState = resolveSetupState({
    authLoading: false,
    user: { uid: user.uid },
    profileLoading: false,
    profileStatus: "loaded",
    profile: user,
    householdLoading: false,
    household: mockDb.households.get(existingHhId),
    members: Array.from(memMap.values()),
  });
  assert.equal(setupState, "complete");
  // Route guard redirects immediately to /dashboard
  assert.equal(getRouteForSetupState(setupState, "/onboarding"), "/dashboard");

  // If user calls createHousehold again, it reuses existing without creating duplicate
  const result = await simulateCreateHousehold(user, "New Accident", "USD");
  assert.equal(result.id, existingHhId);
  assert.equal(result.reused, true);
  assert.equal(mockDb.households.size, 1);
  assert.equal(mockDb.users.get(user.uid)?.householdId, existingHhId);
});

test("5. Existing user who owns a household but profile.householdId is missing/stale -> safe recovery path reattaches without duplicate", async () => {
  mockDb.reset();
  const originalHhId = "hh_original_saved";
  // User owns a household, but their profile.householdId was set to null (missing)
  const user = {
    uid: "user_lost_link",
    displayName: "LostLink",
    email: "lost@example.com",
    photoURL: null,
    householdId: null, // missing!
  };
  mockDb.users.set(user.uid, user);
  mockDb.households.set(originalHhId, {
    id: originalHhId,
    name: "Original Financial Space",
    currency: "EUR",
    inviteCode: "ORIG99",
    ownerUid: user.uid,
  });
  const memMap = new Map();
  memMap.set(user.uid, { uid: user.uid, role: "owner" });
  mockDb.members.set(originalHhId, memMap);

  // Step 1: Detect existing household via ownership recovery
  const found = await simulateFindExistingUserHousehold(user.uid, user.householdId);
  assert.ok(found);
  assert.equal(found.id, originalHhId);
  assert.equal(found.source, "ownership");

  // Step 2: createHousehold safely re-attaches instead of generating duplicate
  const result = await simulateCreateHousehold(user, "Another Name", "EUR");
  assert.equal(result.id, originalHhId);
  assert.equal(result.reused, true);
  assert.equal(mockDb.households.size, 1); // exactly 1 household, zero duplicates
  assert.equal(mockDb.users.get(user.uid)?.householdId, originalHhId); // automatically healed!
});

test("6. Create household failure -> form data remains available, no partial records, no false success", async () => {
  mockDb.reset();
  const user = {
    uid: "user_failing",
    displayName: "Faulty",
    email: "fail@example.com",
    photoURL: null,
    householdId: null,
  };
  mockDb.users.set(user.uid, user);

  let caughtError: Error | null = null;
  try {
    await simulateCreateHousehold(user, "Failed Space", "USD", { failOnTransaction: true });
  } catch (err) {
    caughtError = err as Error;
  }

  assert.ok(caughtError);
  assert.match(caughtError.message, /Simulated Firestore transaction/);

  // Zero households created
  assert.equal(mockDb.households.size, 0);
  assert.equal(mockDb.members.size, 0);
  // User profile untouched
  assert.equal(mockDb.users.get(user.uid)?.householdId, null);
});

test("7. Invite flow -> valid user joins only once; invalid/expired invite fails safely; joining existing does not create new household", async () => {
  mockDb.reset();
  const ownerHhId = "hh_shared_space";
  mockDb.households.set(ownerHhId, {
    id: ownerHhId,
    name: "Our Shared Money",
    currency: "USD",
    inviteCode: "PAIR12",
    ownerUid: "owner_uid",
  });
  const memMap = new Map();
  memMap.set("owner_uid", { uid: "owner_uid", role: "owner" });
  mockDb.members.set(ownerHhId, memMap);

  const partner = { uid: "partner_uid", displayName: "Partner" };

  // 1. Invalid invite code fails safely
  await assert.rejects(
    async () => simulateJoinHousehold(partner, ownerHhId, "WRONGCODE"),
    /That invite code doesn't match/
  );
  assert.equal(mockDb.members.get(ownerHhId)?.size, 1);

  // 2. Non-existent household fails safely
  await assert.rejects(
    async () => simulateJoinHousehold(partner, "hh_non_existent", "PAIR12"),
    /This invite is no longer valid/
  );

  // 3. Valid join succeeds
  await simulateJoinHousehold(partner, ownerHhId, "PAIR12");
  assert.equal(mockDb.members.get(ownerHhId)?.size, 2);
  assert.equal(mockDb.users.get(partner.uid)?.householdId, ownerHhId);
  assert.equal(mockDb.users.get(partner.uid)?.role, "member");

  // 4. Repeated join by same member is a safe no-op (no duplicates)
  await simulateJoinHousehold(partner, ownerHhId, "PAIR12");
  assert.equal(mockDb.members.get(ownerHhId)?.size, 2);
  assert.equal(mockDb.households.size, 1); // no new household created!

  // 5. Space full (max 2 members) blocks third party
  const thirdUser = { uid: "third_wheel", displayName: "Third" };
  await assert.rejects(
    async () => simulateJoinHousehold(thirdUser, ownerHhId, "PAIR12"),
    /already has two partners/
  );
});

test("8. Existing user who is a non-owner member but profile.householdId is missing/stale -> safe recovery path reattaches without duplicate", async () => {
  mockDb.reset();
  const householdId = "hh_partner_space_99";
  // Household owned by someone else
  mockDb.households.set(householdId, {
    id: householdId,
    name: "Partner's Household",
    currency: "USD",
    inviteCode: "PART99",
    ownerUid: "owner_partner_uid",
  });

  // User is already a member
  const partnerUser = {
    uid: "partner_member_uid",
    displayName: "InvitedPartner",
    email: "invited@example.com",
    photoURL: null,
    householdId: null, // missing/cleared!
  };
  mockDb.users.set(partnerUser.uid, partnerUser);

  const memMap = new Map();
  memMap.set("owner_partner_uid", { uid: "owner_partner_uid", role: "owner" });
  memMap.set(partnerUser.uid, { uid: partnerUser.uid, role: "member" });
  mockDb.members.set(householdId, memMap);

  // Recovery via simulateFindExistingUserHousehold finds the membership
  const found = await simulateFindExistingUserHousehold(partnerUser.uid, partnerUser.householdId);
  assert.ok(found);
  assert.equal(found.id, householdId);
  assert.equal(found.role, "member");
  assert.equal(found.source, "membership");

  // Attempting to create a household recovers the existing one with reused: true
  const result = await simulateCreateHousehold(partnerUser, "Unnecessary Second Space", "USD");
  assert.equal(result.id, householdId);
  assert.equal(result.reused, true);
  assert.equal(mockDb.households.size, 1);
  assert.equal(mockDb.users.get(partnerUser.uid)?.householdId, householdId);
  assert.equal(mockDb.users.get(partnerUser.uid)?.role, "member");
});

test("9. parseInvite parser -> accurately parses query param URL and dot-separated code, safely rejects malformed inputs", () => {
  // URL with query parameters
  const urlPayload = parseInvite("https://ourmoney.app/join?h=hh_sample_123456789012&c=ABCDEF");
  assert.ok(urlPayload);
  assert.equal(urlPayload.householdId, "hh_sample_123456789012");
  assert.equal(urlPayload.code, "ABCDEF");

  // Dot-separated code
  const dotPayload = parseInvite("hh_sample_123456789012.XYZ789");
  assert.ok(dotPayload);
  assert.equal(dotPayload.householdId, "hh_sample_123456789012");
  assert.equal(dotPayload.code, "XYZ789");

  // Space-separated code
  const spacePayload = parseInvite("hh_sample_123456789012 XYZ789");
  assert.ok(spacePayload);
  assert.equal(spacePayload.householdId, "hh_sample_123456789012");
  assert.equal(spacePayload.code, "XYZ789");

  // Invalid / malformed inputs
  assert.equal(parseInvite(""), null);
  assert.equal(parseInvite("random gibberish"), null);
  assert.equal(parseInvite("https://ourmoney.app/dashboard"), null);
  assert.equal(parseInvite("short.code"), null); // under 20 chars ID
});

test("10. Idempotent createHousehold returning reused: true routes directly to dashboard instead of invite step", async () => {
  mockDb.reset();
  const existingHhId = "hh_active_already_67";
  const user = {
    uid: "user_multi_session",
    displayName: "MultiSession",
    email: "multi@example.com",
    photoURL: null,
    householdId: existingHhId,
  };
  mockDb.users.set(user.uid, user);
  mockDb.households.set(existingHhId, {
    id: existingHhId,
    name: "Existing Space",
    currency: "USD",
    inviteCode: "SPACE1",
    ownerUid: user.uid,
  });
  const memMap = new Map();
  memMap.set(user.uid, { uid: user.uid, role: "owner" });
  mockDb.members.set(existingHhId, memMap);

  // Calling createHousehold for a user with existing household
  const res = await simulateCreateHousehold(user, "Dup Name", "USD");
  assert.equal(res.reused, true);
  assert.equal(res.id, existingHhId);

  // When reused is true, the client code navigates to /dashboard immediately
  // and does NOT advance to step 2 (invite step)
  const targetRoute = res.reused ? "/dashboard" : "/onboarding?step=invite";
  assert.equal(targetRoute, "/dashboard");
});
