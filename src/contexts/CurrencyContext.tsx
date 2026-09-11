"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  DEFAULT_CURRENCY,
  DEFAULT_FX_RATES,
  SUPPORTED_CURRENCIES,
  convertCurrency,
  formatDualMoney,
  formatMoney,
} from "@/lib/currency";

interface CurrencyContextType {
  currency: string;
  baseCurrency: string;
  setCurrency: (code: string) => void;
  showDual: boolean;
  setShowDual: (show: boolean) => void;
  rates: Record<string, number>;
  updateRate: (code: string, rateToBDT: number) => void;
  resetRates: () => void;
  convert: (amount: number, from?: string, to?: string) => number;
  format: (
    amount: number,
    opts?: { fromCurrency?: string; targetCurrency?: string; decimals?: boolean; compact?: boolean }
  ) => string;
  formatDual: (
    amount: number,
    fromCurrency?: string,
    targetCurrency?: string,
    opts?: { decimals?: boolean }
  ) => { primary: string; secondary: string; combined: string };
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

const STORAGE_KEY_CURRENCY = "om_display_currency";
const STORAGE_KEY_DUAL = "om_show_dual_currency";
const STORAGE_KEY_RATES = "om_custom_fx_rates";

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<string>(DEFAULT_CURRENCY);
  const [showDual, setShowDualState] = useState<boolean>(true);
  const [rates, setRates] = useState<Record<string, number>>(DEFAULT_FX_RATES);

  useEffect(() => {
    try {
      const savedCur = localStorage.getItem(STORAGE_KEY_CURRENCY);
      if (savedCur && SUPPORTED_CURRENCIES[savedCur.toUpperCase()]) {
        setCurrencyState(savedCur.toUpperCase());
      }
      const savedDual = localStorage.getItem(STORAGE_KEY_DUAL);
      if (savedDual !== null) {
        setShowDualState(savedDual === "true");
      }
      const savedRates = localStorage.getItem(STORAGE_KEY_RATES);
      if (savedRates) {
        setRates({ ...DEFAULT_FX_RATES, ...JSON.parse(savedRates) });
      }
    } catch {
      // ignore localStorage errors in non-browser or privacy mode
    }
  }, []);

  const setCurrency = (code: string) => {
    const upper = code.toUpperCase();
    if (!SUPPORTED_CURRENCIES[upper]) return;
    setCurrencyState(upper);
    try {
      localStorage.setItem(STORAGE_KEY_CURRENCY, upper);
    } catch {}
  };

  const setShowDual = (val: boolean) => {
    setShowDualState(val);
    try {
      localStorage.setItem(STORAGE_KEY_DUAL, String(val));
    } catch {}
  };

  const updateRate = (code: string, rate: number) => {
    const upper = code.toUpperCase();
    if (rate <= 0 || !Number.isFinite(rate)) return;
    const next = { ...rates, [upper]: rate };
    setRates(next);
    try {
      localStorage.setItem(STORAGE_KEY_RATES, JSON.stringify(next));
    } catch {}
  };

  const resetRates = () => {
    setRates(DEFAULT_FX_RATES);
    try {
      localStorage.removeItem(STORAGE_KEY_RATES);
    } catch {}
  };

  const convert = (amount: number, from = DEFAULT_CURRENCY, to = currency) => {
    return convertCurrency(amount, from, to, rates);
  };

  const format = (
    amount: number,
    opts?: { fromCurrency?: string; targetCurrency?: string; decimals?: boolean; compact?: boolean }
  ) => {
    const from = opts?.fromCurrency || DEFAULT_CURRENCY;
    const target = opts?.targetCurrency || currency;
    const converted = convert(amount, from, target);
    return formatMoney(converted, {
      currency: target,
      decimals: opts?.decimals,
      compact: opts?.compact,
      rates,
    });
  };

  const formatDual = (
    amount: number,
    fromCurrency = DEFAULT_CURRENCY,
    targetCurrency?: string,
    opts?: { decimals?: boolean }
  ) => {
    const to = targetCurrency || (currency === DEFAULT_CURRENCY ? "USD" : currency);
    return formatDualMoney(amount, fromCurrency, to, {
      decimals: opts?.decimals,
      rates,
    });
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        baseCurrency: DEFAULT_CURRENCY,
        setCurrency,
        showDual,
        setShowDual,
        rates,
        updateRate,
        resetRates,
        convert,
        format,
        formatDual,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextType {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    // Fallback if rendered outside CurrencyProvider
    return {
      currency: DEFAULT_CURRENCY,
      baseCurrency: DEFAULT_CURRENCY,
      setCurrency: () => {},
      showDual: false,
      setShowDual: () => {},
      rates: DEFAULT_FX_RATES,
      updateRate: () => {},
      resetRates: () => {},
      convert: (amt) => amt,
      format: (amt) => formatMoney(amt),
      formatDual: (amt) => formatDualMoney(amt),
    };
  }
  return ctx;
}
