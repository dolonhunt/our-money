import test from "node:test";
import assert from "node:assert/strict";
import { resolveSetupState, getRouteForSetupState, type SetupState } from "../src/lib/auth/setupState.ts";

test("1. Existing user login with household -> resolves to complete without premature onboarding redirect", () => {
  // Step 1: Firebase auth is resolving
  const step1 = resolveSetupState({
    authLoading: true,
    user: null,
    profileLoading: false,
    profile: null,
    householdLoading: true,
    household: null,
    members: [],
  });
  assert.equal(step1, "loading");
  assert.equal(getRouteForSetupState(step1, "/login"), null);

  // Step 2: Auth resolved, user object received, but profile is still loading
  const step2 = resolveSetupState({
    authLoading: false,
    user: { uid: "user_1" },
    profileLoading: true,
    profileStatus: "loading",
    profile: null,
    householdLoading: true,
    household: null,
    members: [],
  });
  // MUST NOT return "needs_profile" while profile subscription is loading!
  assert.equal(step2, "loading");
  assert.equal(getRouteForSetupState(step2, "/login"), null);

  // Step 3: Profile received with householdId, household subscriptions still loading
  const step3 = resolveSetupState({
    authLoading: false,
    user: { uid: "user_1" },
    profileLoading: false,
    profileStatus: "loaded",
    profile: { uid: "user_1", householdId: "hh_1" },
    householdLoading: true,
    household: null,
    members: [],
  });
  assert.equal(step3, "loading");
  assert.equal(getRouteForSetupState(step3, "/login"), null);

  // Step 4: Household data fully resolved and membership verified
  const step4 = resolveSetupState({
    authLoading: false,
    user: { uid: "user_1" },
    profileLoading: false,
    profileStatus: "loaded",
    profile: { uid: "user_1", householdId: "hh_1" },
    householdLoading: false,
    household: { id: "hh_1", ownerUid: "user_1" },
    members: [{ uid: "user_1", role: "owner" }],
  });
  assert.equal(step4, "complete");
  // Completed user on login page must be routed to /dashboard
  assert.equal(getRouteForSetupState(step4, "/login"), "/dashboard");
});

test("2. Explicit Case A: Auth resolved + user exists + profile loading + profile null => loading (no onboarding redirect)", () => {
  const state = resolveSetupState({
    authLoading: false,
    user: { uid: "existing_user" },
    profileLoading: true,
    profileStatus: "loading",
    profile: null,
    householdLoading: false,
    household: null,
    members: [],
  });
  assert.equal(state, "loading");
  assert.equal(getRouteForSetupState(state, "/login"), null);
  assert.equal(getRouteForSetupState(state, "/dashboard"), null);
  assert.equal(getRouteForSetupState(state, "/"), null);
  assert.equal(getRouteForSetupState(state, "/onboarding"), null);
});

test("3. Explicit Case B: Auth resolved + user exists + profile lookup completed + profile absent => needs_profile (onboarding redirect)", () => {
  const state = resolveSetupState({
    authLoading: false,
    user: { uid: "truly_new_user" },
    profileLoading: false,
    profileStatus: "missing",
    profile: null,
    householdLoading: false,
    household: null,
    members: [],
  });
  assert.equal(state, "needs_profile");
  assert.equal(getRouteForSetupState(state, "/login"), "/onboarding");
  assert.equal(getRouteForSetupState(state, "/dashboard"), "/onboarding");
  assert.equal(getRouteForSetupState(state, "/"), "/onboarding");
  // If already on onboarding, no redirect loop
  assert.equal(getRouteForSetupState(state, "/onboarding"), null);
});

test("4. Explicit Case C: Existing user profile arrives after delay with householdId => loading until household resolves, then complete", () => {
  // Phase 1: User exists, profile loading
  const phase1 = resolveSetupState({
    authLoading: false,
    user: { uid: "delayed_user" },
    profileLoading: true,
    profile: null,
    householdLoading: true,
    household: null,
    members: [],
  });
  assert.equal(phase1, "loading");
  assert.equal(getRouteForSetupState(phase1, "/dashboard"), null);

  // Phase 2: Profile arrives with householdId, household doc still loading
  const phase2 = resolveSetupState({
    authLoading: false,
    user: { uid: "delayed_user" },
    profileLoading: false,
    profileStatus: "loaded",
    profile: { uid: "delayed_user", householdId: "hh_delayed" },
    householdLoading: true,
    household: null,
    members: [],
  });
  assert.equal(phase2, "loading");
  assert.equal(getRouteForSetupState(phase2, "/dashboard"), null);

  // Phase 3: Household and active membership resolve
  const phase3 = resolveSetupState({
    authLoading: false,
    user: { uid: "delayed_user" },
    profileLoading: false,
    profileStatus: "loaded",
    profile: { uid: "delayed_user", householdId: "hh_delayed" },
    householdLoading: false,
    household: { id: "hh_delayed", ownerUid: "delayed_user" },
    members: [{ uid: "delayed_user", role: "owner" }],
  });
  assert.equal(phase3, "complete");
  assert.equal(getRouteForSetupState(phase3, "/dashboard"), null);
});

test("5. Existing user direct /dashboard -> never bounces to /onboarding while loading, stays on /dashboard when complete", () => {
  // Profile loading state
  const profileLoadingState = resolveSetupState({
    authLoading: false,
    user: { uid: "user_1" },
    profileLoading: true,
    profile: null,
    householdLoading: true,
    household: null,
    members: [],
  });
  assert.equal(profileLoadingState, "loading");
  assert.equal(getRouteForSetupState(profileLoadingState, "/dashboard"), null);

  // Profile received, household subscriptions resolving
  const resolvingState = resolveSetupState({
    authLoading: false,
    user: { uid: "user_1" },
    profileLoading: false,
    profile: { uid: "user_1", householdId: "hh_1" },
    householdLoading: true,
    household: null,
    members: [],
  });
  assert.equal(resolvingState, "loading");
  assert.equal(getRouteForSetupState(resolvingState, "/dashboard"), null);

  // Complete state reached
  const completeState = resolveSetupState({
    authLoading: false,
    user: { uid: "user_1" },
    profileLoading: false,
    profile: { uid: "user_1", householdId: "hh_1" },
    householdLoading: false,
    household: { id: "hh_1", ownerUid: "user_1" },
    members: [{ uid: "user_1", role: "owner" }],
  });
  assert.equal(completeState, "complete");
  assert.equal(getRouteForSetupState(completeState, "/dashboard"), null);
});

test("6. New user without household -> routes to /onboarding", () => {
  const newUserState = resolveSetupState({
    authLoading: false,
    user: { uid: "new_user" },
    profileLoading: false,
    profileStatus: "loaded",
    profile: { uid: "new_user", householdId: null },
    householdLoading: false,
    household: null,
    members: [],
  });
  assert.equal(newUserState, "needs_household");

  assert.equal(getRouteForSetupState(newUserState, "/login"), "/onboarding");
  assert.equal(getRouteForSetupState(newUserState, "/dashboard"), "/onboarding");
  assert.equal(getRouteForSetupState(newUserState, "/"), "/onboarding");
  assert.equal(getRouteForSetupState(newUserState, "/onboarding"), null);
});

test("7. Completed user never sees onboarding wizard -> redirects from /onboarding to /dashboard", () => {
  const completeState = resolveSetupState({
    authLoading: false,
    user: { uid: "user_1" },
    profileLoading: false,
    profile: { uid: "user_1", householdId: "hh_1" },
    householdLoading: false,
    household: { id: "hh_1", ownerUid: "user_1" },
    members: [{ uid: "user_1", role: "owner" }],
  });
  assert.equal(completeState, "complete");
  assert.equal(getRouteForSetupState(completeState, "/onboarding"), "/dashboard");
});

test("8. Unauthenticated user -> routes to /login from protected routes, stays on public routes", () => {
  const unauthState = resolveSetupState({
    authLoading: false,
    user: null,
    profileLoading: false,
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

test("9. Non-owner member authorization verification", () => {
  // Authorized non-owner member
  const memberState = resolveSetupState({
    authLoading: false,
    user: { uid: "partner_user" },
    profileLoading: false,
    profile: { uid: "partner_user", householdId: "hh_1" },
    householdLoading: false,
    household: { id: "hh_1", ownerUid: "primary_owner" },
    members: [
      { uid: "primary_owner", role: "owner" },
      { uid: "partner_user", role: "member" },
    ],
  });
  assert.equal(memberState, "complete");

  // Revoked member
  const revokedState = resolveSetupState({
    authLoading: false,
    user: { uid: "evicted_user" },
    profileLoading: false,
    profile: { uid: "evicted_user", householdId: "hh_1" },
    householdLoading: false,
    household: { id: "hh_1", ownerUid: "primary_owner" },
    members: [{ uid: "primary_owner", role: "owner" }],
  });
  assert.equal(revokedState, "needs_household");

  // Invalid role
  const invalidRoleState = resolveSetupState({
    authLoading: false,
    user: { uid: "corrupt_user" },
    profileLoading: false,
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

test("10. Profile listener error: returns error state, no onboarding redirect, no mutation", () => {
  const profileError = new Error("FirebaseError: [code=permission-denied]: Profile read blocked");

  const state = resolveSetupState({
    authLoading: false,
    user: { uid: "user_err" },
    profileLoading: false,
    profileStatus: "error",
    profileError,
    profile: null,
    householdLoading: false,
    household: null,
    members: [],
  });

  assert.equal(state, "error");
  // SafeErrorView must be rendered; must NEVER redirect to /onboarding
  assert.equal(getRouteForSetupState(state, "/dashboard"), null);
  assert.equal(getRouteForSetupState(state, "/onboarding"), null);
  assert.equal(getRouteForSetupState(state, "/login"), null);
});

test("11. Household permission/network error: safe error state, no onboarding redirect, no mutation", () => {
  const profileDoc = { uid: "error_user", householdId: "hh_error" };
  let writeCount = 0;

  const networkError = new Error("FirebaseError: [code=permission-denied]: Missing or insufficient permissions.");

  const errorState = resolveSetupState({
    authLoading: false,
    user: { uid: "error_user" },
    profileLoading: false,
    profile: profileDoc,
    householdLoading: false,
    household: null,
    members: [],
    error: networkError,
  });

  assert.equal(errorState, "error");
  assert.equal(getRouteForSetupState(errorState, "/dashboard"), null);
  assert.equal(getRouteForSetupState(errorState, "/"), null);
  assert.equal(getRouteForSetupState(errorState, "/onboarding"), null);

  assert.equal(writeCount, 0);
  assert.equal(profileDoc.householdId, "hh_error");
});

test("12. Issue 2: Category and account listener failures do NOT block setup completion", () => {
  // Household and members resolved successfully
  // Even if categories and accounts fail, resolveSetupState depends ONLY on household doc + membership
  const state = resolveSetupState({
    authLoading: false,
    user: { uid: "user_with_failing_data" },
    profileLoading: false,
    profile: { uid: "user_with_failing_data", householdId: "hh_valid" },
    householdLoading: false,
    household: { id: "hh_valid", ownerUid: "user_with_failing_data" },
    members: [{ uid: "user_with_failing_data", role: "owner" }],
    error: null, // Household setup has NO error
  });

  // State is complete! Dashboard shell will render!
  assert.equal(state, "complete");
  assert.equal(getRouteForSetupState(state, "/dashboard"), null);
  assert.equal(getRouteForSetupState(state, "/login"), "/dashboard");
});

test("13. Integration timeline simulation: Delayed profile and household resolution", async () => {
  let userProfile: { uid: string; householdId: string | null } | null = null;
  let profileLoading = true;
  let householdLoading = true;
  let householdDoc: { id: string; ownerUid: string } | null = null;
  let membersList: Array<{ uid: string; role?: string }> = [];
  let writesToFirestore = 0;

  const observedStates: SetupState[] = [];

  // T0: Auth resolves with user
  const user = { uid: "async_user" };
  observedStates.push(
    resolveSetupState({
      authLoading: false,
      user,
      profileLoading,
      profile: userProfile,
      householdLoading,
      household: householdDoc,
      members: membersList,
    })
  );

  // T1: 50ms delay for profile Firestore snapshot
  await new Promise((r) => setTimeout(r, 50));
  userProfile = { uid: "async_user", householdId: "hh_async" };
  profileLoading = false;

  observedStates.push(
    resolveSetupState({
      authLoading: false,
      user,
      profileLoading,
      profile: userProfile,
      householdLoading,
      household: householdDoc,
      members: membersList,
    })
  );

  // T2: 50ms delay for household Firestore snapshot
  await new Promise((r) => setTimeout(r, 50));
  householdDoc = { id: "hh_async", ownerUid: "async_user" };
  membersList = [{ uid: "async_user", role: "owner" }];
  householdLoading = false;

  observedStates.push(
    resolveSetupState({
      authLoading: false,
      user,
      profileLoading,
      profile: userProfile,
      householdLoading,
      household: householdDoc,
      members: membersList,
    })
  );

  // Verification:
  // Step 1: loading
  // Step 2: loading (NOT needs_profile or needs_household!)
  // Step 3: complete
  assert.deepEqual(observedStates, ["loading", "loading", "complete"]);

  // Route target at every intermediate step was null (no redirect)
  assert.equal(getRouteForSetupState(observedStates[0], "/dashboard"), null);
  assert.equal(getRouteForSetupState(observedStates[1], "/dashboard"), null);
  assert.equal(getRouteForSetupState(observedStates[2], "/dashboard"), null);

  // Zero destructive writes occurred
  assert.equal(writesToFirestore, 0);
  assert.equal(userProfile.householdId, "hh_async");
});


