/**
 * Centralized currency formatting. Launch currency is BDT (৳).
 * Swap the locale/currency here to support other currencies later.
 */

export const DEFAULT_CURRENCY = "BDT";
export const CURRENCY_SYMBOL = "৳";

const grouper = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const precise = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ৳184,250 — no decimals for normal dashboard display (PRD §72). */
export function money(amount: number, opts?: { decimals?: boolean }): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const body = opts?.decimals && Math.abs(n % 1) > 0.001 ? precise.format(n) : grouper.format(Math.round(n * 100) / 100);
  return `${CURRENCY_SYMBOL}${body}`;
}

/** Signed for deltas / cash flow: +৳12,400 or -৳3,200 */
export function signedMoney(amount: number, opts?: { decimals?: boolean }): string {
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${sign}${money(Math.abs(amount), opts)}`;
}

/** Compact for tight chart labels: ৳18.5k */
export function moneyCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${CURRENCY_SYMBOL}${(amount / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${CURRENCY_SYMBOL}${(amount / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  return money(amount);
}

/** Percentage with one decimal, e.g. 12.4 */
export function pct(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return "0";
  return `${value.toFixed(decimals)}%`;
}
