/**
 * Non-destructive duplicate-household audit utility.
 * Identifies:
 * 1. Users with multiple household memberships.
 * 2. Users with multiple owned households.
 * 3. Profiles whose householdId does not match an active membership.
 * 4. Empty duplicate households created after re-onboarding.
 *
 * CRITICAL RULE: This utility is strictly read-only and non-destructive.
 * It does NOT modify or delete any Firestore data.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import type { Household, HouseholdMember, UserProfile } from "@/types";
import { getDb } from "./firestore";

export interface DuplicateHouseholdAuditReport {
  timestamp: string;
  totalUsersScanned: number;
  totalHouseholdsScanned: number;
  usersWithMultipleMemberships: Array<{
    uid: string;
    email: string;
    membershipHouseholdIds: string[];
  }>;
  usersWithMultipleOwnedHouseholds: Array<{
    uid: string;
    email: string;
    ownedHouseholdIds: string[];
    suggestedPrimaryHouseholdId: string | null;
    emptyDuplicateHouseholdIds: string[];
  }>;
  mismatchedProfileHouseholds: Array<{
    uid: string;
    email: string;
    profileHouseholdId: string | null;
    actualActiveHouseholdId: string | null;
    reason: "profile_has_no_membership" | "household_doc_missing" | "profile_household_null_but_membership_exists";
  }>;
  emptyDuplicateHouseholds: Array<{
    householdId: string;
    name: string;
    ownerUid: string;
    createdAt: string | null;
    associatedPopulatedHouseholdId: string | null;
  }>;
  safeRemediationRecommendations: string[];
}

/**
 * Runs a non-destructive audit across Firestore.
 * Does NOT perform any writes, updates, or deletes.
 */
export async function runDuplicateHouseholdAudit(): Promise<DuplicateHouseholdAuditReport> {
  const db = getDb();

  // 1. Fetch all users
  const usersSnap = await getDocs(collection(db, "users"));
  const users = usersSnap.docs.map((d) => ({
    uid: d.id,
    ...(d.data() as Omit<UserProfile, "uid">),
  }));

  // 2. Fetch all households
  const householdsSnap = await getDocs(collection(db, "households"));
  const households = householdsSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Household, "id">),
  }));

  const report: DuplicateHouseholdAuditReport = {
    timestamp: new Date().toISOString(),
    totalUsersScanned: users.length,
    totalHouseholdsScanned: households.length,
    usersWithMultipleMemberships: [],
    usersWithMultipleOwnedHouseholds: [],
    mismatchedProfileHouseholds: [],
    emptyDuplicateHouseholds: [],
    safeRemediationRecommendations: [],
  };

  // Build map of household -> members & financial data counts
  const householdDataStats = new Map<
    string,
    {
      members: HouseholdMember[];
      transactionCount: number;
      accountCount: number;
      budgetCount: number;
    }
  >();

  for (const hh of households) {
    const memSnap = await getDocs(collection(db, "households", hh.id, "members"));
    const members = memSnap.docs.map((m) => m.data() as HouseholdMember);

    const txSnap = await getDocs(collection(db, "households", hh.id, "transactions"));
    const accSnap = await getDocs(collection(db, "households", hh.id, "accounts"));
    const budSnap = await getDocs(collection(db, "households", hh.id, "budgets"));

    householdDataStats.set(hh.id, {
      members,
      transactionCount: txSnap.size,
      accountCount: accSnap.size,
      budgetCount: budSnap.size,
    });
  }

  // Check 1 & 2: Users with multiple memberships or owned households
  for (const user of users) {
    // Find all households where user is a member
    const memberHouseholdIds: string[] = [];
    for (const [hhId, stats] of householdDataStats.entries()) {
      if (stats.members.some((m) => m.uid === user.uid)) {
        memberHouseholdIds.push(hhId);
      }
    }

    if (memberHouseholdIds.length > 1) {
      report.usersWithMultipleMemberships.push({
        uid: user.uid,
        email: user.email,
        membershipHouseholdIds: memberHouseholdIds,
      });
    }

    // Find households owned by user
    const owned = households.filter((h) => h.ownerUid === user.uid);
    if (owned.length > 1) {
      // Differentiate populated primary household from empty duplicates
      let primaryHhId: string | null = null;
      let maxDataPoints = -1;
      const emptyDuplicates: string[] = [];

      for (const h of owned) {
        const stats = householdDataStats.get(h.id);
        const dataPoints = (stats?.transactionCount || 0) + (stats?.accountCount || 0) + (stats?.budgetCount || 0);

        if (dataPoints > maxDataPoints && dataPoints > 0) {
          maxDataPoints = dataPoints;
          primaryHhId = h.id;
        } else if (dataPoints === 0) {
          emptyDuplicates.push(h.id);
          report.emptyDuplicateHouseholds.push({
            householdId: h.id,
            name: h.name,
            ownerUid: user.uid,
            createdAt: h.createdAt?.toDate ? h.createdAt.toDate().toISOString() : null,
            associatedPopulatedHouseholdId: primaryHhId,
          });
        }
      }

      report.usersWithMultipleOwnedHouseholds.push({
        uid: user.uid,
        email: user.email,
        ownedHouseholdIds: owned.map((h) => h.id),
        suggestedPrimaryHouseholdId: primaryHhId,
        emptyDuplicateHouseholdIds: emptyDuplicates,
      });
    }

    // Check 3: Profile householdId matching
    if (user.householdId) {
      const hhStats = householdDataStats.get(user.householdId);
      if (!hhStats) {
        report.mismatchedProfileHouseholds.push({
          uid: user.uid,
          email: user.email,
          profileHouseholdId: user.householdId,
          actualActiveHouseholdId: memberHouseholdIds[0] ?? null,
          reason: "household_doc_missing",
        });
      } else if (!hhStats.members.some((m) => m.uid === user.uid)) {
        report.mismatchedProfileHouseholds.push({
          uid: user.uid,
          email: user.email,
          profileHouseholdId: user.householdId,
          actualActiveHouseholdId: memberHouseholdIds[0] ?? null,
          reason: "profile_has_no_membership",
        });
      }
    } else if (memberHouseholdIds.length > 0) {
      report.mismatchedProfileHouseholds.push({
        uid: user.uid,
        email: user.email,
        profileHouseholdId: null,
        actualActiveHouseholdId: memberHouseholdIds[0],
        reason: "profile_household_null_but_membership_exists",
      });
    }
  }

  // Generate safe remediation recommendations
  if (report.usersWithMultipleOwnedHouseholds.length > 0) {
    report.safeRemediationRecommendations.push(
      "Remediation 1: For users with multiple owned households, automatically re-point user profile.householdId to the populated primary household (with non-zero transactions/accounts)."
    );
    report.safeRemediationRecommendations.push(
      "Remediation 2: Mark identified empty duplicate households as archived ({ isArchivedDuplicate: true }) instead of hard-deleting, pending explicit user sign-off."
    );
  }

  if (report.mismatchedProfileHouseholds.length > 0) {
    report.safeRemediationRecommendations.push(
      "Remediation 3: Re-link user profile.householdId to their confirmed active membership document where membership exists."
    );
  }

  if (report.safeRemediationRecommendations.length === 0) {
    report.safeRemediationRecommendations.push("Database is clean: No duplicate households or mismatched memberships found.");
  }

  return report;
}
