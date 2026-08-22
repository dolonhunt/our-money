/** Date helpers. Financial dates are stored as plain YYYY-MM-DD strings (PRD §73). */

export function todayISO(): string {
  return toISO(new Date());
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Month key from an ISO date: "2026-08" */
export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

export function currentMonth(): string {
  return todayISO().slice(0, 7);
}

/** "2026-08" → "August 2026" */
export function monthLabel(month: string): string {
  const d = fromISO(`${month}-01`);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** "2026-08" → "Aug 2026" */
export function monthLabelShort(month: string): string {
  const d = fromISO(`${month}-01`);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function addMonths(month: string, delta: number): string {
  const d = fromISO(`${month}-01`);
  d.setMonth(d.getMonth() + delta);
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}`;
}

/** Last N month keys ending at `end` (inclusive), oldest first. */
export function lastMonths(end: string, n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addMonths(end, -i));
  return out;
}

export function monthRange(month: string): { start: string; end: string } {
  const start = `${month}-01`;
  const d = fromISO(start);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { start, end: toISO(end) };
}

export function addDays(iso: string, days: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export function advanceRecurrence(iso: string, frequency: "daily" | "weekly" | "monthly" | "yearly"): string {
  const d = fromISO(iso);
  switch (frequency) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return toISO(d);
}

/** Day-group label: Today / Yesterday / Mon, Aug 18 */
export function dayLabel(iso: string): string {
  const today = todayISO();
  if (iso === today) return "Today";
  if (iso === addDays(today, -1)) return "Yesterday";
  return fromISO(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function dateLabel(iso: string): string {
  return fromISO(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Relative label for timestamps: "just now", "5m ago", "2h ago", "3d ago", else date. */
export function relativeTime(ts: { toDate(): Date } | null | undefined): string {
  if (!ts?.toDate) return "";
  const diff = Date.now() - ts.toDate().getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return dateLabel(toISO(ts.toDate()));
}
