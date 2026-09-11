"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Globe2, Check, ArrowRightLeft } from "lucide-react";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { useCurrency } from "@/contexts/CurrencyContext";

interface CurrencySwitcherProps {
  compact?: boolean;
  className?: string;
}

export function CurrencySwitcher({ compact = false, className = "" }: CurrencySwitcherProps) {
  const { currency, setCurrency, showDual, setShowDual, rates } = useCurrency();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeInfo = SUPPORTED_CURRENCIES[currency] ?? SUPPORTED_CURRENCIES["BDT"];

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Current currency ${currency}, click to switch`}
        className={`neu-pill flex items-center gap-1.5 transition-colors hover:text-ink ${
          compact ? "!px-2.5 !py-1 text-xs" : "!px-3.5 !py-1.5 text-xs font-semibold text-sub"
        }`}
      >
        <span className="text-sm leading-none" aria-hidden>{activeInfo.flag}</span>
        <span className="font-bold text-ink">{activeInfo.code}</span>
        <span className="text-sub">({activeInfo.symbol.trim()})</span>
        <ChevronDown size={13} className={`text-faint transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="neu-card absolute right-0 top-full mt-2 z-50 w-64 p-2 shadow-2xl rounded-2xl border border-[var(--c-border)] animate-fadeIn"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--c-border)]/60">
            <span className="flex items-center gap-1.5 text-xs font-bold text-ink">
              <Globe2 size={14} className="text-teal" />
              Currency & FX
            </span>
            <span className="text-[10.5px] text-faint">Base: BDT ৳</span>
          </div>

          {/* Dual currency toggle */}
          <div className="flex items-center justify-between px-3 py-2.5 my-1 rounded-xl bg-[rgba(138,206,209,0.06)]">
            <span className="text-xs text-sub flex items-center gap-1.5">
              <ArrowRightLeft size={13} className="text-teal" />
              Dual-currency display
            </span>
            <button
              type="button"
              onClick={() => setShowDual(!showDual)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                showDual ? "bg-teal" : "bg-faint/40"
              }`}
              aria-label="Toggle dual currency display"
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  showDual ? "translate-x-4" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Currencies list */}
          <div className="max-h-60 overflow-y-auto divide-y divide-[var(--c-border)]/30 pr-0.5">
            {Object.values(SUPPORTED_CURRENCIES).map((c) => {
              const isSelected = c.code === currency;
              const rate = rates[c.code] ?? c.rateToBDT;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    setCurrency(c.code);
                    setOpen(false);
                  }}
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-left transition-colors text-xs ${
                    isSelected
                      ? "bg-mint/30 text-ink font-semibold"
                      : "hover:bg-[rgba(138,206,209,0.08)] text-sub hover:text-ink"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none" aria-hidden>{c.flag}</span>
                    <div>
                      <span className="font-bold text-ink">{c.code}</span>{" "}
                      <span className="text-faint">({c.symbol.trim()})</span>
                      <div className="text-[10px] text-faint truncate max-w-[110px]">{c.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    {c.code !== "BDT" ? (
                      <span className="text-[10.5px] font-mono text-faint">
                        ≈৳{rate >= 10 ? rate.toFixed(1) : rate.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-teal font-semibold">Primary</span>
                    )}
                    {isSelected && <Check size={14} className="text-teal ml-1.5 inline" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
