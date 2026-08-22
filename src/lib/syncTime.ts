/** Short relative labels for the sync badge (PRD §31). */

export function relativeShort(timestampMs: number): string {
  const diff = Date.now() - timestampMs;
  if (diff < 30_000) return "● Live synced";
  if (diff < 60_000) return "Updated just now";
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `Updated ${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Updated ${h}h ago`;
  return "Synced";
}
