/**
 * Centralized currency & FX exchange engine (PRD §6, §17, §72).
 * Launch currency is BDT (৳) with multi-currency conversion, dual display,
 * and customizable FX rates.
 */

export const DEFAULT_CURRENCY = "BDT";
export const CURRENCY_SYMBOL = "৳";

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  flag: string;
  rateToBDT: number; // 1 unit of foreign currency = X BDT
  decimals: number;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  BDT: { code: "BDT", symbol: "৳", name: "Bangladeshi Taka", flag: "🇧🇩", rateToBDT: 1, decimals: 0 },
  USD: { code: "USD", symbol: "$", name: "US Dollar", flag: "🇺🇸", rateToBDT: 122.50, decimals: 2 },
  EUR: { code: "EUR", symbol: "€", name: "Euro", flag: "🇪🇺", rateToBDT: 133.20, decimals: 2 },
  GBP: { code: "GBP", symbol: "£", name: "British Pound", flag: "🇬🇧", rateToBDT: 155.80, decimals: 2 },
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee", flag: "🇮🇳", rateToBDT: 1.44, decimals: 2 },
  AED: { code: "AED", symbol: "AED ", name: "UAE Dirham", flag: "🇦🇪", rateToBDT: 33.35, decimals: 2 },
  CAD: { code: "CAD", symbol: "CA$", name: "Canadian Dollar", flag: "🇨🇦", rateToBDT: 89.20, decimals: 2 },
  AUD: { code: "AUD", symbol: "AU$", name: "Australian Dollar", flag: "🇦🇺", rateToBDT: 80.50, decimals: 2 },
  SAR: { code: "SAR", symbol: "SAR ", name: "Saudi Riyal", flag: "🇸🇦", rateToBDT: 32.65, decimals: 2 },
  SGD: { code: "SGD", symbol: "SG$", name: "Singapore Dollar", flag: "🇸🇬", rateToBDT: 93.40, decimals: 2 },
  MYR: { code: "MYR", symbol: "RM ", name: "Malaysian Ringgit", flag: "🇲🇾", rateToBDT: 27.80, decimals: 2 },
  JPY: { code: "JPY", symbol: "¥", name: "Japanese Yen", flag: "🇯🇵", rateToBDT: 0.81, decimals: 0 },
};

export const DEFAULT_FX_RATES: Record<string, number> = Object.fromEntries(
  Object.entries(SUPPORTED_CURRENCIES).map(([k, v]) => [k, v.rateToBDT])
);

const grouper = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const precise = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Converts an amount from one currency to another using exchange rates to BDT.
 * Rate formula: amount * (fromRate / toRate)
 */
export function convertCurrency(
  amount: number,
  fromCode: string = DEFAULT_CURRENCY,
  toCode: string = DEFAULT_CURRENCY,
  customRates?: Record<string, number>
): number {
  if (!Number.isFinite(amount) || amount === 0) return 0;
  const from = (fromCode || DEFAULT_CURRENCY).toUpperCase();
  const to = (toCode || DEFAULT_CURRENCY).toUpperCase();
  if (from === to) return amount;

  const fromRate = customRates?.[from] ?? SUPPORTED_CURRENCIES[from]?.rateToBDT ?? 1;
  const toRate = customRates?.[to] ?? SUPPORTED_CURRENCIES[to]?.rateToBDT ?? 1;

  if (!toRate || toRate <= 0) return amount;
  const amountInBDT = amount * fromRate;
  return amountInBDT / toRate;
}

/** Get currency symbol for code (fallback to code). */
export function getCurrencySymbol(code: string = DEFAULT_CURRENCY): string {
  const upper = (code || DEFAULT_CURRENCY).toUpperCase();
  return SUPPORTED_CURRENCIES[upper]?.symbol ?? `${upper} `;
}

/**
 * Formats an amount with currency symbol.
 * Defaults to BDT (৳) for full backward compatibility (PRD §72).
 */
export function formatMoney(
  amount: number,
  opts?: {
    currency?: string;
    decimals?: boolean;
    compact?: boolean;
    rates?: Record<string, number>;
  }
): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const code = (opts?.currency || DEFAULT_CURRENCY).toUpperCase();
  const symbol = getCurrencySymbol(code);
  const info = SUPPORTED_CURRENCIES[code];
  const forceDecimals = opts?.decimals ?? (info ? info.decimals > 0 && Math.abs(n % 1) > 0.001 : false);

  if (opts?.compact) {
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${symbol}${(n / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  }

  const body = forceDecimals
    ? precise.format(n)
    : grouper.format(Math.round(n * 100) / 100);
  return `${symbol}${body}`;
}

/** Backward compatible: ৳184,250 — no decimals for normal dashboard display (PRD §72). */
export function money(
  amount: number,
  opts?: { decimals?: boolean; currency?: string }
): string {
  return formatMoney(amount, {
    currency: opts?.currency || DEFAULT_CURRENCY,
    decimals: opts?.decimals,
  });
}

/** Signed for deltas / cash flow: +৳12,400 or -৳3,200 */
export function signedMoney(
  amount: number,
  opts?: { decimals?: boolean; currency?: string }
): string {
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${sign}${money(Math.abs(amount), opts)}`;
}

/** Compact for tight chart labels: ৳18.5k */
export function moneyCompact(amount: number, currency = DEFAULT_CURRENCY): string {
  return formatMoney(amount, { currency, compact: true });
}

/**
 * Formats a dual-currency value (PRD §17).
 * Example: { primary: "৳12,000", secondary: "$97.96", combined: "৳12,000 (~$98.00)" }
 */
export function formatDualMoney(
  amount: number,
  fromCurrency: string = DEFAULT_CURRENCY,
  toCurrency: string = "USD",
  opts?: { decimals?: boolean; rates?: Record<string, number> }
): { primary: string; secondary: string; combined: string } {
  const from = (fromCurrency || DEFAULT_CURRENCY).toUpperCase();
  const to = (toCurrency || "USD").toUpperCase();
  const primary = formatMoney(amount, { currency: from, decimals: opts?.decimals });

  if (from === to) {
    return { primary, secondary: primary, combined: primary };
  }

  const converted = convertCurrency(amount, from, to, opts?.rates);
  const secondary = formatMoney(converted, {
    currency: to,
    decimals: opts?.decimals ?? true,
  });
  const combined = `${primary} (~${secondary})`;

  return { primary, secondary, combined };
}

/** Percentage with one decimal, e.g. 12.4 */
export function pct(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return "0";
  return `${value.toFixed(decimals)}%`;
}
