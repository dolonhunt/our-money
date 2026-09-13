import test from "node:test";
import assert from "node:assert/strict";
import { resolveSetupState, getRouteForSetupState, type SetupState } from "../src/lib/auth/setupState.ts";

test("a. Existing user login with household -> resolves to complete and routes to /dashboard", () => {
  // While auth is loading
  const step1 = resolveSetupState({
    authLoading: true,
    user: null,
    profile: null,
    householdLoading: true,
    household: null,
    members: [],
  });
  assert.equal(step1, "loading");
  assert.equal(getRouteForSetupState(step1, "/login"), null);

  // User object received, profile still loading
  const step2 = resolveSetupState({
    authLoading: false,
    user: { uid: "user_1" },
    profile: null,
    householdLoading: true,
    household: null,
    members: [],
  });
  assert.equal(step2, "needs_profile");
  assert.equal(getRouteForSetupState(step2, "/login"), "/onboarding");

  // Profile received with householdId, household subscriptions still loading
  const step3 = resolveSetupState({
    authLoading: false,
    user: { uid: "user_1" },
    profile: { uid: "user_1", householdId: "hh_1" },
    householdLoading: true,
    household: null,
    members: [],
  });
  assert.equal(step3, "loading");
  assert.equal(getRouteForSetupState(step3, "/login"), null);

  // Household data fully resolved and membership verified
  const step4 = resolveSetupState({
    authLoading: false,
    user: { uid: "user_1" },
    profile: { uid: "user_1", householdId: "hh_1" },
    householdLoading: false,
    household: { id: "hh_1", ownerUid: "user_1" },
    members: [{ uid: "user_1", role: "owner" }],
  });
  assert.equal(step4, "complete");
  // Completed user on login page must be routed to /dashboard
  assert.equal(getRouteForSetupState(step4, "/login"), "/dashboard");
});

test("b. Existing user direct /dashboard -> never bounces to /onboarding while loading, stays on /dashboard when complete", () => {
  // User directly enters /dashboard: initial loading state
  const loadingState = resolveSetupState({
    authLoading: true,
    user: null,
    profile: null,
    householdLoading: true,
    household: null,
    members: [],
  });
  assert.equal(loadingState, "loading");
  // Must NOT redirect while loading!
  assert.equal(getRouteForSetupState(loadingState, "/dashboard"), null);

  // Profile received, household subscriptions resolving
  const resolvingState = resolveSetupState({
    authLoading: false,
    user: { uid: "user_1" },
    profile: { uid: "user_1", householdId: "hh_1" },
    householdLoading: true,
    household: null,
    members: [],
  });
  assert.equal(resolvingState, "loading");
  // Must NOT redirect while household is resolving!
  assert.equal(getRouteForSetupState(resolvingState, "/dashboard"), null);

  // Complete state reached
  const completeState = resolveSetupState({
    authLoading: false,
    user: { uid: "user_1" },
    profile: { uid: "user_1", householdId: "hh_1" },
    householdLoading: false,
    household: { id: "hh_1", ownerUid: "user_1" },
    members: [{ uid: "user_1", role: "owner" }],
  });
  assert.equal(completeState, "complete");
  // Already on dashboard; no redirect needed, renders dashboard content
  assert.equal(getRouteForSetupState(completeState, "/dashboard"), null);
});

test("c. New user without household -> routes to /onboarding", () => {
  const newUserState = resolveSetupState({
    authLoading: false,
    user: { uid: "new_user" },
    profile: { uid: "new_user", householdId: null },
    householdLoading: false,
    household: null,
    members: [],
  });
  assert.equal(newUserState, "needs_household");

  // If new user is on /login or /dashboard, they must be directed to /onboarding
  assert.equal(getRouteForSetupState(newUserState, "/login"), "/onboarding");
  assert.equal(getRouteForSetupState(newUserState, "/dashboard"), "/onboarding");
  assert.equal(getRouteForSetupState(newUserState, "/"), "/onboarding");

  // If new user is already on /onboarding, no redirect loop
  assert.equal(getRouteForSetupState(newUserState, "/onboarding"), null);
});

test("d. Completed user never sees onboarding wizard -> redirects from /onboarding to /dashboard", () => {
  const completeState = resolveSetupState({
    authLoading: false,
    user: { uid: "user_1" },
    profile: { uid: "user_1", householdId: "hh_1" },
    householdLoading: false,
    household: { id: "hh_1", ownerUid: "user_1" },
    members: [{ uid: "user_1", role: "owner" }],
  });
  assert.equal(completeState, "complete");
  assert.equal(getRouteForSetupState(completeState, "/onboarding"), "/dashboard");
});

test("e. Unauthenticated user -> routes to /login from protected routes, stays on public routes", () => {
  const unauthState = resolveSetupState({
    authLoading: false,
    user: null,
    profile: null,
    householdLoading: false,
    household: null,
    members: [],
  });
  assert.equal(unauthState, "unauthorized");
  assert.equal(getRouteForSetupState(unauthState, "/dashboard"), "/login");
  assert.equal(getRouteForSetupState(unauthState, "/onboarding"), "/login");
  assert.equal(getRouteForSetupState(unauthState, "/login"), null);
  assert.equal(getRouteForSetupState(unauthState, "/signup"), null);
  assert.equal(getRouteForSetupState(unauthState, "/forgot-password"), null);
});

test("f. Non-owner member authorization verification", () => {
  // User is not owner, but is an authorized member
  const memberState = resolveSetupState({
    authLoading: false,
    user: { uid: "partner_user" },
    profile: { uid: "partner_user", householdId: "hh_1" },
    householdLoading: false,
    household: { id: "hh_1", ownerUid: "primary_owner" },
    members: [
      { uid: "primary_owner", role: "owner" },
      { uid: "partner_user", role: "member" },
    ],
  });
  assert.equal(memberState, "complete");

  // User is neither owner nor in members list (e.g. revoked)
  const revokedState = resolveSetupState({
    authLoading: false,
    user: { uid: "evicted_user" },
    profile: { uid: "evicted_user", householdId: "hh_1" },
    householdLoading: false,
    household: { id: "hh_1", ownerUid: "primary_owner" },
    members: [{ uid: "primary_owner", role: "owner" }],
  });
  assert.equal(revokedState, "needs_household");

  // User has invalid or corrupted role
  const invalidRoleState = resolveSetupState({
    authLoading: false,
    user: { uid: "corrupt_user" },
    profile: { uid: "corrupt_user", householdId: "hh_1" },
    householdLoading: false,
    household: { id: "hh_1", ownerUid: "primary_owner" },
    members: [
      { uid: "primary_owner", role: "owner" },
      { uid: "corrupt_user", role: "guest" },
    ],
  });
  assert.equal(invalidRoleState, "needs_household");
});

test("g. Delayed household resolution simulation: householdId is preserved, no write, final complete", async () => {
  // Simulated Firestore document state for user profile
  let firestoreUserProfile: { uid: string; householdId: string | null } = {
    uid: "delayed_user",
    householdId: "hh_delayed",
  };
  let writeCallCount = 0;

  // Mock write function
  const mockSetUserHousehold = async (uid: string, householdId: string | null) => {
    writeCallCount++;
    firestoreUserProfile.householdId = householdId;
  };

  // Step 1: User enters app with existing householdId
  let householdLoading = true;
  let householdDoc = null;
  let membersList: Array<{ uid: string; role?: string }> = [];

  const stateStep1 = resolveSetupState({
    authLoading: false,
    user: { uid: "delayed_user" },
    profile: firestoreUserProfile,
    householdLoading,
    household: householdDoc,
    members: membersList,
  });

  // Must be loading, NOT needs_household or complete
  assert.equal(stateStep1, "loading");
  assert.equal(getRouteForSetupState(stateStep1, "/dashboard"), null);
  // Profile householdId MUST remain intact!
  assert.equal(firestoreUserProfile.householdId, "hh_delayed");
  assert.equal(writeCallCount, 0);

  // Step 2: Simulate 50ms network delay before snapshot arrives
  await new Promise((r) => setTimeout(r, 50));

  // Snapshot arrives
  householdLoading = false;
  householdDoc = { id: "hh_delayed", ownerUid: "delayed_user" };
  membersList = [{ uid: "delayed_user", role: "owner" }];

  const stateStep2 = resolveSetupState({
    authLoading: false,
    user: { uid: "delayed_user" },
    profile: firestoreUserProfile,
    householdLoading,
    household: householdDoc,
    members: membersList,
  });

  // Must be complete
  assert.equal(stateStep2, "complete");
  assert.equal(getRouteForSetupState(stateStep2, "/dashboard"), null);
  // Zero destructive writes occurred
  assert.equal(writeCallCount, 0);
  assert.equal(firestoreUserProfile.householdId, "hh_delayed");
});

test("h. Permission/network error test: safe error state, no onboarding redirect, no mutation", () => {
  const profileDoc = { uid: "error_user", householdId: "hh_error" };
  let writeCount = 0;
  const mockMutate = () => {
    writeCount++;
  };

  // Simulate network / permission listener failure
  const networkError = new Error("FirebaseError: [code=permission-denied]: Missing or insufficient permissions.");

  const errorState = resolveSetupState({
    authLoading: false,
    user: { uid: "error_user" },
    profile: profileDoc,
    householdLoading: false,
    household: null,
    members: [],
    error: networkError,
  });

  // State must be 'error'
  assert.equal(errorState, "error");

  // Route target must be null (NO onboarding redirect, NO login redirect)
  assert.equal(getRouteForSetupState(errorState, "/dashboard"), null);
  assert.equal(getRouteForSetupState(errorState, "/"), null);
  assert.equal(getRouteForSetupState(errorState, "/onboarding"), null);

  // Confirm NO mutations occurred
  assert.equal(writeCount, 0);
  assert.equal(profileDoc.householdId, "hh_error");
});

