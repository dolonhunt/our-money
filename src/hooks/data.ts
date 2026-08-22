"use client";

import { useCallback } from "react";
import type { Account, Activity, AppNotification, Bill, Budget, Category, Goal, Transaction } from "@/types";
import { subscribeAccounts } from "@/lib/firebase/accounts";
import { subscribeActivity } from "@/lib/firebase/activity";
import { subscribeBills } from "@/lib/firebase/bills";
import { subscribeBudgets } from "@/lib/firebase/budgets";
import { subscribeCategories } from "@/lib/firebase/categories";
import { subscribeGoals } from "@/lib/firebase/goals";
import { subscribeNotifications } from "@/lib/firebase/notifications";
import { subscribeTransactions } from "@/lib/firebase/transactions";
import { useRealtime } from "./useRealtime";

export function useTransactions(householdId: string | null) {
  const factory = useCallback((hid: string) => (cb: (i: Transaction[]) => void, err?: (e: Error) => void) => subscribeTransactions(hid, cb, err), []);
  return useRealtime<Transaction>(householdId, factory);
}

export function useBudgets(householdId: string | null, month: string) {
  const factory = useCallback(
    (hid: string) => (cb: (i: Budget[]) => void, err?: (e: Error) => void) => subscribeBudgets(hid, month, cb, err),
    [month]
  );
  return useRealtime<Budget>(householdId, factory);
}

export function useAccounts(householdId: string | null) {
  const factory = useCallback((hid: string) => (cb: (i: Account[]) => void, err?: (e: Error) => void) => subscribeAccounts(hid, cb, err), []);
  return useRealtime<Account>(householdId, factory);
}

export function useGoals(householdId: string | null) {
  const factory = useCallback((hid: string) => (cb: (i: Goal[]) => void, err?: (e: Error) => void) => subscribeGoals(hid, cb, err), []);
  return useRealtime<Goal>(householdId, factory);
}

export function useBills(householdId: string | null) {
  const factory = useCallback((hid: string) => (cb: (i: Bill[]) => void, err?: (e: Error) => void) => subscribeBills(hid, cb, err), []);
  return useRealtime<Bill>(householdId, factory);
}

export function useActivity(householdId: string | null) {
  const factory = useCallback((hid: string) => (cb: (i: Activity[]) => void, err?: (e: Error) => void) => subscribeActivity(hid, cb, err), []);
  return useRealtime<Activity>(householdId, factory);
}

/** Notifications are per-user; uid must be present. */
export function useNotifications(householdId: string | null, uid: string | null) {
  const factory = useCallback(
    (hid: string) => (cb: (i: AppNotification[]) => void, err?: (e: Error) => void) => subscribeNotifications(hid, uid!, cb, err),
    [uid]
  );
  return useRealtime<AppNotification>(householdId && uid ? householdId : null, factory);
}

export function useCategoryList(householdId: string | null) {
  const factory = useCallback((hid: string) => (cb: (i: Category[]) => void, err?: (e: Error) => void) => subscribeCategories(hid, cb, err), []);
  return useRealtime<Category>(householdId, factory);
}
