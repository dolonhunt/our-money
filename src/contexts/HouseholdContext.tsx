"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Account, Category, Household, HouseholdMember, UserProfile } from "@/types";
import { subscribeHousehold, subscribeMembers } from "@/lib/firebase/households";
import { subscribeCategories } from "@/lib/firebase/categories";
import { subscribeAccounts } from "@/lib/firebase/accounts";
import { setUserHousehold } from "@/lib/firebase/auth";
import { markSynced } from "@/lib/sync";
import { useAuth } from "./AuthContext";

interface HouseholdState {
  householdId: string | null;
  household: Household | null;
  members: HouseholdMember[];
  categories: Category[];
  accounts: Account[];
  me: HouseholdMember | null;
  partner: HouseholdMember | null;
  memberUids: string[];
  loading: boolean;
}

const HouseholdContext = createContext<HouseholdState | null>(null);

export function useHousehold(): HouseholdState {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error("useHousehold must be used within HouseholdProvider");
  return ctx;
}

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const router = useRouter();
  const householdId = profile?.householdId ?? null;
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const removalHandled = useRef(false);

  useEffect(() => {
    setHousehold(null);
    setMembers([]);
    setCategories([]);
    setAccounts([]);
    if (!householdId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let settled = 0;
    const done = () => {
      settled++;
      if (settled >= 4) setLoading(false);
    };
    const unsubs: (() => void)[] = [
      subscribeHousehold(
        householdId,
        (h) => {
          setHousehold(h);
          markSynced();
          done();
        },
        done
      ),
      subscribeMembers(
        householdId,
        (m) => {
          setMembers(m);
          markSynced();
          done();
        },
        done
      ),
      subscribeCategories(
        householdId,
        (c) => {
          setCategories(c.filter((x) => !x.archived));
          markSynced();
          done();
        },
        done
      ),
      subscribeAccounts(
        householdId,
        (a) => {
          setAccounts(a.filter((x) => !x.archived));
          markSynced();
          done();
        },
        done
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, [householdId]);

  // Membership revoked (removed by owner, or dissolved household): clear the
  // stale profile link ourselves — security rules forbid cross-user writes.
  useEffect(() => {
    if (!householdId || !profile || removalHandled.current || loading) return;
    const stillMember = members.some((m) => m.uid === profile.uid);
    if (!stillMember) {
      removalHandled.current = true;
      setUserHousehold(profile.uid, null, null)
        .then(() => router.replace("/onboarding"))
        .catch(() => undefined);
    }
  }, [householdId, members, loading, profile, router]);

  const value = useMemo<HouseholdState>(() => {
    const me = members.find((m) => m.uid === profile?.uid) ?? null;
    const partner = members.find((m) => m.uid !== profile?.uid) ?? null;
    return {
      householdId,
      household,
      members,
      categories,
      accounts,
      me,
      partner,
      memberUids: members.map((m) => m.uid),
      loading: loading && Boolean(householdId),
    };
  }, [householdId, household, members, categories, accounts, loading, profile?.uid]);

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export type { Household, HouseholdMember, UserProfile };
