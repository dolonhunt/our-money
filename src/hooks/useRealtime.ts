"use client";

import { useEffect, useState } from "react";
import { markSynced } from "@/lib/sync";

export type SubscribeFn<T> = (
  cb: (items: T[]) => void,
  onError?: (e: Error) => void
) => () => void;

/**
 * Generic realtime collection subscription with correct unsubscribe behavior
 * (PRD §64). `factory` should be stable for a given householdId.
 */
export function useRealtime<T>(householdId: string | null, factory: (hid: string) => SubscribeFn<T>): {
  items: T[];
  loading: boolean;
} {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = factory(householdId)(
      (data) => {
        setItems(data);
        setLoading(false);
        markSynced();
      },
      () => setLoading(false)
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId]);

  return { items, loading };
}
