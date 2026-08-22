import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import type { Account, AccountType, Ownership } from "@/types";
import { getDb } from "./firestore";

export function subscribeAccounts(
  householdId: string,
  cb: (items: Account[]) => void,
  onError?: (e: Error) => void
): () => void {
  const q = query(collection(getDb(), "households", householdId, "accounts"), orderBy("createdAt", "asc"));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Account, "id">) }))),
    (e) => onError?.(e as Error)
  );
}

export interface AccountInput {
  name: string;
  type: AccountType;
  initialBalance: number;
  ownership: Ownership;
}

export async function createAccount(householdId: string, actorUid: string, input: AccountInput): Promise<string> {
  const ref = await addDoc(collection(getDb(), "households", householdId, "accounts"), {
    householdId,
    name: input.name.trim(),
    type: input.type,
    initialBalance: Math.round(input.initialBalance * 100) / 100,
    currency: "BDT",
    ownership: input.ownership,
    archived: false,
    createdBy: actorUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAccount(
  householdId: string,
  accountId: string,
  patch: Partial<Pick<Account, "name" | "type" | "initialBalance" | "ownership" | "archived">>
): Promise<void> {
  await updateDoc(doc(getDb(), "households", householdId, "accounts", accountId), { ...patch, updatedAt: serverTimestamp() });
}
