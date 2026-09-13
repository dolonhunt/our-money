# Duplicate Household Audit & Non-Destructive Remediation Plan

## Objective
Detect and remediate existing duplicate households, empty re-onboarded spaces, and mismatched profile relationships without deleting any production financial records.

---

## 1. Audit Methodology

The non-destructive audit utility (`src/lib/firebase/audit.ts`) executes read-only inspection queries against Firestore:

### A. Multiple Memberships Scan
- Evaluates each user's presence across all `households/{householdId}/members/{uid}` collections.
- Flags any user UID associated with more than one household membership.

### B. Multiple Owned Households Scan
- Queries `households` where `ownerUid == user.uid`.
- For each owned household, aggregates counts of:
  - `transactions`
  - `accounts`
  - `budgets`
  - `bills`
  - `goals`
- Distinguishes the **populated primary household** (containing non-zero transactions/accounts) from **empty duplicate households** (0 transactions, 0 accounts, 0 budgets).

### C. Mismatched Profile Link Scan
- Compares `users/{uid}.householdId` with active memberships:
  1. `household_doc_missing`: `profile.householdId` points to a non-existent household document.
  2. `profile_has_no_membership`: `profile.householdId` exists, but the user is not in `members/{uid}`.
  3. `profile_household_null_but_membership_exists`: `profile.householdId` is null, but the user is already a member/owner of a household.

---

## 2. Detection Criteria

| Defect Signature | Condition | Safe Recovery Path |
|---|---|---|
| Empty Duplicate Space | `dataPoints === 0 && ownerUid === user.uid && exists(primaryHouseholdWithData)` | Mark `isArchivedDuplicate: true`, re-link profile to primary household |
| Missing Profile Household | `profile.householdId === null && exists(ownedHousehold)` | Auto-recover: re-link `profile.householdId` to the owned household |
| Out-of-Sync Household Link | `profile.householdId === emptyDuplicateHh && exists(olderPopulatedHh)` | Restore `profile.householdId` to populated household; all accounts & transactions reappear |

---

## 3. Safe Remediation Recommendation

1. **Non-Destructive Restoration**:
   - Update `users/{uid}` profile document to set `householdId = primaryHouseholdId`.
   - The user immediately regains full access to all historical transactions, categories, budgets, and accounts.
2. **Zero Hard Deletions**:
   - No documents are deleted automatically.
   - Any empty duplicate households are marked with `{ archivedAt: serverTimestamp(), isDuplicate: true }` so they do not appear in active queries.
3. **Explicit Approval Gate**:
   - Production cleanup scripts must only be executed after explicit user review and confirmation.
