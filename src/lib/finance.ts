import type { Account, Budget, Transaction } from "@/types";
import { monthOf } from "./dates";

/**
 * Centralized financial calculations (PRD §63).
 * All totals exclude soft-deleted rows; transfers never count as income/expense.
 */

export function activeTransactions(txs: Transaction[]): Transaction[] {
  return txs.filter((t) => !t.deletedAt);
}

export interface MonthTotals {
  income: number;
  expense: number;
  net: number;
  savingsRate: number; // 0..1, NaN-safe → 0
}

export function monthTotals(txs: Transaction[], month: string): MonthTotals {
  let income = 0;
  let expense = 0;
  for (const t of activeTransactions(txs)) {
    if (monthOf(t.date) !== month) continue;
    if (t.type === "income") income += t.amount;
    else if (t.type === "expense") expense += t.amount;
  }
  const net = income - expense;
  const savingsRate = income > 0 ? Math.max(0, net / income) : 0;
  return { income, expense, net, savingsRate };
}

/** Combined available balance = sum(account initial balances) + all-time income − all-time expense. */
export function availableBalance(txs: Transaction[], accounts: Account[]): number {
  let base = 0;
  for (const a of accounts) base += a.type === "credit" ? -a.initialBalance : a.initialBalance;
  for (const t of activeTransactions(txs)) {
    if (t.type === "income") base += t.amount;
    else if (t.type === "expense") base -= t.amount;
  }
  return base;
}

/** Derived per-account balance (transfers in/out included; income/expense linked to the account). */
export function accountBalance(account: Account, txs: Transaction[]): number {
  let bal = account.type === "credit" ? -account.initialBalance : account.initialBalance;
  for (const t of activeTransactions(txs)) {
    if (t.type === "income" && t.accountId === account.id) bal += t.amount;
    else if (t.type === "expense" && t.accountId === account.id) bal -= t.amount;
    else if (t.type === "transfer") {
      if (t.fromAccountId === account.id) bal -= t.amount;
      if (t.toAccountId === account.id) bal += t.amount;
    }
  }
  return bal;
}

export interface CategorySlice {
  categoryId: string;
  amount: number;
  count: number;
  share: number; // 0..1
}

/** Expense breakdown by category for a month, sorted desc. */
export function categoryBreakdown(txs: Transaction[], month: string): CategorySlice[] {
  const map = new Map<string, { amount: number; count: number }>();
  for (const t of activeTransactions(txs)) {
    if (t.type !== "expense" || monthOf(t.date) !== month) continue;
    const cur = map.get(t.categoryId) ?? { amount: 0, count: 0 };
    cur.amount += t.amount;
    cur.count += 1;
    map.set(t.categoryId, cur);
  }
  const total = [...map.values()].reduce((s, v) => s + v.amount, 0);
  return [...map.entries()]
    .map(([categoryId, v]) => ({ categoryId, ...v, share: total > 0 ? v.amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

export type BudgetStatus = "healthy" | "approaching" | "warning" | "over";

export interface BudgetProgress {
  budget: Budget;
  spent: number;
  remaining: number;
  ratio: number; // 0..n
  status: BudgetStatus;
}

/** Thresholds per PRD §41: <75 healthy, 75–89 approaching, 90–99 warning, 100+ over. */
export function budgetStatus(ratio: number): BudgetStatus {
  if (ratio >= 1) return "over";
  if (ratio >= 0.9) return "warning";
  if (ratio >= 0.75) return "approaching";
  return "healthy";
}

export function budgetProgress(budget: Budget, txs: Transaction[], month: string): BudgetProgress {
  let spent = 0;
  for (const t of activeTransactions(txs)) {
    if (t.type === "expense" && t.categoryId === budget.categoryId && monthOf(t.date) === month) spent += t.amount;
  }
  const ratio = budget.amount > 0 ? spent / budget.amount : 0;
  return { budget, spent, remaining: budget.amount - spent, ratio, status: budgetStatus(ratio) };
}

/** % change of a value vs a previous value; null when previous is 0. */
export function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous)) / Math.abs(previous) * 100;
}

/** Couple contribution split by paidBy uid for a month. */
export function contributionSplit(txs: Transaction[], month: string): Record<string, number> {
  const split: Record<string, number> = {};
  for (const t of activeTransactions(txs)) {
    if (t.type !== "expense" || monthOf(t.date) !== month) continue;
    if (t.paidBy === "both") {
      const members = Object.keys(split);
      // split evenly between the two partners when "both"
      for (const uid of members.length ? members : ["me", "partner"]) split[uid] = (split[uid] ?? 0) + t.amount / 2;
    } else {
      split[t.paidBy] = (split[t.paidBy] ?? 0) + t.amount;
    }
  }
  return split;
}
