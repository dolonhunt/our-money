import { getFirestore, type Firestore } from "firebase/firestore";
import { getFirebaseApp } from "./config";

/** Lazy Firestore singleton — safe to import from client components. */
export function getDb(): Firestore {
  return getFirestore(getFirebaseApp());
}
