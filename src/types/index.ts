import type { Timestamp } from "firebase/firestore";

/* ---------------------------------- Users --------------------------------- */

export type Role = "owner" | "member";

export interface NotificationPrefs {
  partnerActivity: boolean;
  budgetAlerts: boolean;
  billReminders: boolean;
  goalUpdates: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  householdId: string | null;
  role: Role | null;
  currency: string; // "BDT"
  country: string;
  phone: string;
  timezone: string;
  notificationPrefs: NotificationPrefs;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/* ------------------------------- Households -------------------------------- */

export interface HouseholdMember {
  uid: string;
  role: Role;
  displayName: string;
  email: string;
  photoURL: string | null;
  joinedAt: Timestamp;
}

export interface Household {
  id: string;
  name: string;
  currency: string;
  inviteCode: string;
  ownerUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/* ------------------------------- Categories -------------------------------- */

export type CategoryKind = "expense" | "income";

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  icon: string; // lucide icon name
  color: string; // hex
  order: number;
  archived: boolean;
  createdBy: string;
  createdAt: Timestamp;
}

/* ------------------------------- Transactions ------------------------------- */

export type TransactionType = "expense" | "income" | "transfer";
export type Ownership = "shared" | "personal";
export type PaidBy = string | "both"; // member uid or "both"
export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface Transaction {
  id: string;
  householdId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  categoryId: string;
  description: string;
  notes: string;
  date: string; // YYYY-MM-DD (user-local financial date)
  accountId: string | null; // for income/expense
  fromAccountId: string | null; // for transfer
  toAccountId: string | null; // for transfer
  createdBy: string;
  updatedBy: string;
  paidBy: PaidBy;
  ownership: Ownership;
  isRecurring: boolean;
  recurringId: string | null; // parent transaction id for generated instances
  recurrence: { frequency: RecurrenceFrequency; nextDueDate: string } | null;
  nextDueDate: string | null; // denormalized for querying the recurrence parent
  attachmentUrl: string | null;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt: Timestamp | null; // soft delete
}

/* --------------------------------- Budgets --------------------------------- */

export interface Budget {
  id: string;
  householdId: string;
  categoryId: string;
  month: string; // YYYY-MM
  amount: number;
  ownership: Ownership;
  notes: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/* --------------------------------- Accounts -------------------------------- */

export type AccountType = "cash" | "bank" | "mobile" | "credit" | "savings" | "other";

export interface Account {
  id: string;
  householdId: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  currency: string;
  ownership: Ownership;
  archived: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/* ---------------------------------- Goals ---------------------------------- */

export interface Goal {
  id: string;
  householdId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null; // YYYY-MM-DD
  icon: string;
  description: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface GoalContribution {
  id: string;
  householdId: string;
  goalId: string;
  uid: string;
  amount: number;
  date: string; // YYYY-MM-DD
  note: string;
  createdAt: Timestamp;
}

/* ---------------------------------- Bills ---------------------------------- */

export type Recurring = "none" | "daily" | "weekly" | "monthly" | "yearly";

export interface Bill {
  id: string;
  householdId: string;
  name: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  categoryId: string | null;
  accountId: string | null;
  recurring: Recurring;
  reminderDays: number;
  paid: boolean;
  paidAt: Timestamp | null;
  paidTransactionId: string | null;
  ownership: Ownership;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/* ------------------------------ Notifications ------------------------------ */

export type NotificationType = "partner" | "budget" | "bill" | "goal" | "household" | "system";

export interface AppNotification {
  id: string;
  householdId: string;
  uid: string; // recipient
  type: NotificationType;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  actorId: string | null;
  read: boolean;
  createdAt: Timestamp;
}

/* --------------------------------- Activity -------------------------------- */

export interface Activity {
  id: string;
  householdId: string;
  actorId: string;
  action: string; // e.g. transaction.created
  entityType: string;
  entityId: string;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: Timestamp;
}
