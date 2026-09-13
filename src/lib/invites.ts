export interface JoinCodePayload {
  householdId: string;
  code: string;
}

/** Parse a pasted invite string ("householdId.code") or link (?h=..&c=..). */
export function parseInvite(input: string): JoinCodePayload | null {
  const trimmed = input.trim();
  try {
    const asUrl = new URL(trimmed);
    const h = asUrl.searchParams.get("h");
    const c = asUrl.searchParams.get("c");
    if (h && c) return { householdId: h, code: c };
  } catch {
    /* not a URL — fall through */
  }
  const m = trimmed.match(/^([A-Za-z0-9_\-]{8,})[.\s]+([A-Za-z0-9]{4,10})$/);
  if (m) return { householdId: m[1], code: m[2] };
  return null;
}
