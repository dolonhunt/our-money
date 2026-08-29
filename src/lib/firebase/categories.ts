import { collection, onSnapshot, orderBy, query, serverTimestamp, addDoc, updateDoc, doc } from "firebase/firestore";
import type { Category, CategoryKind } from "@/types";
import { getDb } from "./firestore";

/** Default category seeds (PRD §37 income, §38 expenses). */
export const DEFAULT_CATEGORIES: (Omit<Category, "createdAt"> & { id: string })[] = [
  // Expense categories
  { id: "housing", name: "Housing", kind: "expense", icon: "Home", color: "#57BFC4", order: 1, archived: false, createdBy: "system" },
  { id: "food", name: "Food", kind: "expense", icon: "UtensilsCrossed", color: "#EFA15F", order: 2, archived: false, createdBy: "system" },
  { id: "transport", name: "Transport", kind: "expense", icon: "Car", color: "#8ACED1", order: 3, archived: false, createdBy: "system" },
  { id: "utilities", name: "Utilities", kind: "expense", icon: "Plug", color: "#F4B27A", order: 4, archived: false, createdBy: "system" },
  { id: "shopping", name: "Shopping", kind: "expense", icon: "ShoppingBag", color: "#57BFC4", order: 5, archived: false, createdBy: "system" },
  { id: "health", name: "Health", kind: "expense", icon: "HeartPulse", color: "#8ACED1", order: 6, archived: false, createdBy: "system" },
  { id: "education", name: "Education", kind: "expense", icon: "GraduationCap", color: "#EFA15F", order: 7, archived: false, createdBy: "system" },
  { id: "entertainment", name: "Entertainment", kind: "expense", icon: "Clapperboard", color: "#F4B27A", order: 8, archived: false, createdBy: "system" },
  { id: "travel", name: "Travel", kind: "expense", icon: "Plane", color: "#57BFC4", order: 9, archived: false, createdBy: "system" },
  { id: "family", name: "Family", kind: "expense", icon: "Users", color: "#8ACED1", order: 10, archived: false, createdBy: "system" },
  { id: "insurance", name: "Insurance", kind: "expense", icon: "ShieldCheck", color: "#F4B27A", order: 11, archived: false, createdBy: "system" },
  { id: "other-expense", name: "Other", kind: "expense", icon: "CircleEllipsis", color: "#9AA6AB", order: 12, archived: false, createdBy: "system" },
  // Income categories
  { id: "salary", name: "Salary", kind: "income", icon: "Banknote", color: "#57BFC4", order: 1, archived: false, createdBy: "system" },
  { id: "freelance", name: "Freelance", kind: "income", icon: "Laptop", color: "#8ACED1", order: 2, archived: false, createdBy: "system" },
  { id: "business", name: "Business", kind: "income", icon: "Briefcase", color: "#EFA15F", order: 3, archived: false, createdBy: "system" },
  { id: "bonus", name: "Bonus", kind: "income", icon: "Gift", color: "#F4B27A", order: 4, archived: false, createdBy: "system" },
  { id: "investment", name: "Investment", kind: "income", icon: "TrendingUp", color: "#57BFC4", order: 5, archived: false, createdBy: "system" },
  { id: "other-income", name: "Other", kind: "income", icon: "CircleEllipsis", color: "#9AA6AB", order: 6, archived: false, createdBy: "system" },
];

export function subscribeCategories(
  householdId: string,
  cb: (items: Category[]) => void,
  onError?: (e: Error) => void
): () => void {
  const q = query(collection(getDb(), "households", householdId, "categories"), orderBy("order", "asc"));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Category, "id">) }))),
    (e) => onError?.(e as Error)
  );
}

export async function createCategory(
  householdId: string,
  actorUid: string,
  data: { name: string; kind: CategoryKind; icon?: string; color?: string; order: number }
): Promise<string> {
  const ref = await addDoc(collection(getDb(), "households", householdId, "categories"), {
    name: data.name.trim(),
    kind: data.kind,
    icon: data.icon ?? "CircleEllipsis",
    color: data.color ?? "#8ACED1",
    order: data.order,
    archived: false,
    createdBy: actorUid,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Rename / archive / reorder. Archived categories keep historical transactions (PRD §38). */
export async function updateCategory(
  householdId: string,
  categoryId: string,
  patch: Partial<Pick<Category, "name" | "icon" | "color" | "order" | "archived">>
): Promise<void> {
  await updateDoc(doc(getDb(), "households", householdId, "categories", categoryId), patch);
}
